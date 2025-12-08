import { Hono } from 'hono';
import { VersionControlService } from '../services/versionControlService';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const app = new Hono();

// Apply authentication middleware to all routes
app.use('*', authMiddleware);

// ============= COMMITS =============

/**
 * Create a new commit
 * POST /api/version-control/commits
 */
app.post('/commits', async (c) => {
  try {
    const schema = z.object({
      workflowId: z.string(),
      versionId: z.string().optional(),
      branchId: z.string().optional(),
      message: z.string().min(1),
      tags: z.array(z.string()).optional(),
      // Allow passing definition directly for auto-version creation
      definition: z.object({
        nodes: z.any(),
        connections: z.any(),
        triggers: z.any().optional(),
        settings: z.any().optional()
      }).optional()
    });

    const body = await c.req.json();
    const data = schema.parse(body);

    // @ts-ignore - Get user info from auth middleware
    const userId = c.get('userId') as string;
    // @ts-ignore
    const userEmail = c.get('userEmail') as string;
    
    // If no versionId provided but definition is, create a version first
    let versionId = data.versionId;
    if (!versionId && data.definition) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const workflow = await prisma.workflow.findUnique({
        where: { id: data.workflowId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1
          }
        }
      });
      
      if (!workflow) {
        return c.json({ error: 'Workflow not found' }, 404);
      }
      
      // Get next version number
      const nextVersionNumber = (workflow.versions[0]?.versionNumber || 0) + 1;
      
      // Create a new version
      const version = await prisma.workflowVersion.create({
        data: {
          workflowId: data.workflowId,
          versionNumber: nextVersionNumber,
          definition: data.definition,
          isDraft: true
        }
      });
      
      versionId = version.id;
    }
    
    if (!versionId) {
      return c.json({ error: 'Either versionId or definition must be provided' }, 400);
    }
    
    const commit = await VersionControlService.createCommit({
      workflowId: data.workflowId,
      versionId,
      branchId: data.branchId,
      message: data.message,
      tags: data.tags,
      author: userEmail || 'unknown',
      authorId: userId
    });

    return c.json(commit, 201);
  } catch (error: any) {
    console.error('Error creating commit:', error);
    if (error.issues) {
      return c.json({ error: 'Validation error', details: JSON.stringify(error.issues) }, 400);
    }
    return c.json({ error: error.message || 'Failed to create commit' }, 400);
  }
});

/**
 * Get commit history for a branch
 * GET /api/version-control/branches/:branchId/commits
 */
app.get('/branches/:branchId/commits', async (c) => {
  try {
    const branchId = c.req.param('branchId');
    const limit = parseInt(c.req.query('limit') || '50');

    const commits = await VersionControlService.getCommitHistory(branchId, limit);

    return c.json({ commits, total: commits.length });
  } catch (error: any) {
    console.error('Error getting commit history:', error);
    return c.json({ error: error.message || 'Failed to get commit history' }, 400);
  }
});

/**
 * Get specific commit by SHA
 * GET /api/version-control/commits/:sha
 */
app.get('/commits/:sha', async (c) => {
  try {
    const sha = c.req.param('sha');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const commit = await prisma.workflowCommit.findUnique({
      where: { sha },
      include: {
        version: true,
        branch: true,
        parent: true,
        children: true
      }
    });

    if (!commit) {
      return c.json({ error: 'Commit not found' }, 404);
    }

    return c.json(commit);
  } catch (error: any) {
    console.error('Error getting commit:', error);
    return c.json({ error: error.message || 'Failed to get commit' }, 400);
  }
});

// ============= BRANCHES =============

/**
 * Create a new branch
 * POST /api/version-control/branches
 */
app.post('/branches', async (c) => {
  try {
    const schema = z.object({
      workflowId: z.string(),
      name: z.string().min(1).regex(/^[a-zA-Z0-9-_\/]+$/, 'Invalid branch name format'),
      description: z.string().optional(),
      sourceBranchId: z.string().optional(),
      isDefault: z.boolean().optional(),
      isProtected: z.boolean().optional()
    });

    const body = await c.req.json();
    const data = schema.parse(body);

    // @ts-ignore
    const userId = c.get('userId') as string;
    
    const branch = await VersionControlService.createBranch({
      ...data,
      createdBy: userId
    });

    return c.json(branch, 201);
  } catch (error: any) {
    console.error('Error creating branch:', error);
    return c.json({ error: error.message || 'Failed to create branch' }, 400);
  }
});

/**
 * List all branches for a workflow
 * GET /api/version-control/workflows/:workflowId/branches
 */
app.get('/workflows/:workflowId/branches', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');

    const branches = await VersionControlService.listBranches(workflowId);

    return c.json({ branches, total: branches.length });
  } catch (error: any) {
    console.error('Error listing branches:', error);
    return c.json({ error: error.message || 'Failed to list branches' }, 400);
  }
});

/**
 * Get specific branch
 * GET /api/version-control/branches/:branchId
 */
app.get('/branches/:branchId', async (c) => {
  try {
    const branchId = c.req.param('branchId');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const branch = await prisma.workflowBranch.findUnique({
      where: { id: branchId },
      include: {
        headCommit: {
          include: {
            version: true
          }
        },
        commits: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!branch) {
      return c.json({ error: 'Branch not found' }, 404);
    }

    return c.json(branch);
  } catch (error: any) {
    console.error('Error getting branch:', error);
    return c.json({ error: error.message || 'Failed to get branch' }, 400);
  }
});

/**
 * Update branch
 * PATCH /api/version-control/branches/:branchId
 */
app.patch('/branches/:branchId', async (c) => {
  try {
    const branchId = c.req.param('branchId');
    
    const schema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
      isProtected: z.boolean().optional()
    });

    const body = await c.req.json();
    const data = schema.parse(body);

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // If setting as default, unset other defaults
    if (data.isDefault) {
      const branch = await prisma.workflowBranch.findUnique({
        where: { id: branchId }
      });

      if (branch) {
        await prisma.workflowBranch.updateMany({
          where: {
            workflowId: branch.workflowId,
            isDefault: true
          },
          data: { isDefault: false }
        });
      }
    }

    const updated = await prisma.workflowBranch.update({
      where: { id: branchId },
      data
    });

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating branch:', error);
    return c.json({ error: error.message || 'Failed to update branch' }, 400);
  }
});

/**
 * Delete a branch
 * DELETE /api/version-control/branches/:branchId
 */
app.delete('/branches/:branchId', async (c) => {
  try {
    const branchId = c.req.param('branchId');

    await VersionControlService.deleteBranch(branchId);

    return c.json({ success: true, message: 'Branch deleted' });
  } catch (error: any) {
    console.error('Error deleting branch:', error);
    return c.json({ error: error.message || 'Failed to delete branch' }, 400);
  }
});

// ============= DIFFS =============

/**
 * Get diff between two commits
 * GET /api/version-control/diff/:fromSha/:toSha
 */
app.get('/diff/:fromSha/:toSha', async (c) => {
  try {
    const fromSha = c.req.param('fromSha');
    const toSha = c.req.param('toSha');

    const diff = await VersionControlService.getDiff(fromSha, toSha);

    return c.json(diff);
  } catch (error: any) {
    console.error('Error getting diff:', error);
    return c.json({ error: error.message || 'Failed to get diff' }, 400);
  }
});

/**
 * Get all diffs for a workflow
 * GET /api/version-control/workflows/:workflowId/diffs
 */
app.get('/workflows/:workflowId/diffs', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const diffs = await prisma.workflowDiff.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return c.json({ diffs, total: diffs.length });
  } catch (error: any) {
    console.error('Error getting diffs:', error);
    return c.json({ error: error.message || 'Failed to get diffs' }, 400);
  }
});

// ============= ROLLBACK =============

/**
 * Rollback workflow to a specific commit
 * POST /api/version-control/workflows/:workflowId/rollback
 */
app.post('/workflows/:workflowId/rollback', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    
    const schema = z.object({
      targetSha: z.string()
    });

    const body = await c.req.json();
    const { targetSha } = schema.parse(body);

    // @ts-ignore
    const userId = c.get('userId') as string;
    
    const version = await VersionControlService.rollback(
      workflowId,
      targetSha,
      userId
    );

    return c.json({ 
      success: true, 
      message: `Rolled back to ${targetSha.substring(0, 7)}`,
      version
    });
  } catch (error: any) {
    console.error('Error rolling back:', error);
    return c.json({ error: error.message || 'Failed to rollback' }, 400);
  }
});

// ============= SNAPSHOTS =============

/**
 * Create a snapshot
 * POST /api/version-control/snapshots
 */
app.post('/snapshots', async (c) => {
  try {
    const schema = z.object({
      workflowId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      commitSha: z.string()
    });

    const body = await c.req.json();
    const data = schema.parse(body);

    // @ts-ignore
    const userId = c.get('userId') as string;
    
    const snapshot = await VersionControlService.createSnapshot({
      ...data,
      createdBy: userId
    });

    return c.json(snapshot, 201);
  } catch (error: any) {
    console.error('Error creating snapshot:', error);
    return c.json({ error: error.message || 'Failed to create snapshot' }, 400);
  }
});

/**
 * List snapshots for a workflow
 * GET /api/version-control/workflows/:workflowId/snapshots
 */
app.get('/workflows/:workflowId/snapshots', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');

    const snapshots = await VersionControlService.listSnapshots(workflowId);

    return c.json({ snapshots, total: snapshots.length });
  } catch (error: any) {
    console.error('Error listing snapshots:', error);
    return c.json({ error: error.message || 'Failed to list snapshots' }, 400);
  }
});

/**
 * Get specific snapshot
 * GET /api/version-control/snapshots/:snapshotId
 */
app.get('/snapshots/:snapshotId', async (c) => {
  try {
    const snapshotId = c.req.param('snapshotId');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const snapshot = await prisma.workflowSnapshot.findUnique({
      where: { id: snapshotId }
    });

    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    return c.json(snapshot);
  } catch (error: any) {
    console.error('Error getting snapshot:', error);
    return c.json({ error: error.message || 'Failed to get snapshot' }, 400);
  }
});

/**
 * Delete a snapshot
 * DELETE /api/version-control/snapshots/:snapshotId
 */
app.delete('/snapshots/:snapshotId', async (c) => {
  try {
    const snapshotId = c.req.param('snapshotId');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.workflowSnapshot.delete({
      where: { id: snapshotId }
    });

    return c.json({ success: true, message: 'Snapshot deleted' });
  } catch (error: any) {
    console.error('Error deleting snapshot:', error);
    return c.json({ error: error.message || 'Failed to delete snapshot' }, 400);
  }
});

/**
 * Restore from snapshot
 * POST /api/version-control/snapshots/:snapshotId/restore
 */
app.post('/snapshots/:snapshotId/restore', async (c) => {
  try {
    const snapshotId = c.req.param('snapshotId');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const snapshot = await prisma.workflowSnapshot.findUnique({
      where: { id: snapshotId }
    });

    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    // @ts-ignore
    const userId = c.get('userId') as string;
    
    const version = await VersionControlService.rollback(
      snapshot.workflowId,
      snapshot.commitSha,
      userId
    );

    return c.json({ 
      success: true, 
      message: `Restored from snapshot "${snapshot.name}"`,
      version
    });
  } catch (error: any) {
    console.error('Error restoring snapshot:', error);
    return c.json({ error: error.message || 'Failed to restore snapshot' }, 400);
  }
});

// ============= MERGE REQUESTS =============

/**
 * Create a merge request
 * POST /api/version-control/merge-requests
 */
app.post('/merge-requests', async (c) => {
  try {
    const schema = z.object({
      workflowId: z.string(),
      sourceBranchId: z.string(),
      targetBranchId: z.string(),
      title: z.string().min(1),
      description: z.string().optional()
    });

    const body = await c.req.json();
    const data = schema.parse(body);

    // @ts-ignore
    const userId = c.get('userId') as string;

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const mergeRequest = await prisma.workflowMergeRequest.create({
      data: {
        workflowId: data.workflowId,
        sourceBranchId: data.sourceBranchId,
        targetBranchId: data.targetBranchId,
        title: data.title,
        description: data.description,
        createdBy: userId,
        status: 'OPEN'
      }
    });

    return c.json(mergeRequest, 201);
  } catch (error: any) {
    console.error('Error creating merge request:', error);
    return c.json({ error: error.message || 'Failed to create merge request' }, 400);
  }
});

/**
 * List merge requests for a workflow
 * GET /api/version-control/workflows/:workflowId/merge-requests
 */
app.get('/workflows/:workflowId/merge-requests', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const status = c.req.query('status'); // OPEN, MERGED, CLOSED

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const mergeRequests = await prisma.workflowMergeRequest.findMany({
      where: {
        workflowId,
        ...(status && { status: status as any })
      },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ mergeRequests, total: mergeRequests.length });
  } catch (error: any) {
    console.error('Error listing merge requests:', error);
    return c.json({ error: error.message || 'Failed to list merge requests' }, 400);
  }
});

/**
 * Get specific merge request
 * GET /api/version-control/merge-requests/:mrId
 */
app.get('/merge-requests/:mrId', async (c) => {
  try {
    const mrId = c.req.param('mrId');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const mergeRequest = await prisma.workflowMergeRequest.findUnique({
      where: { id: mrId }
    });

    if (!mergeRequest) {
      return c.json({ error: 'Merge request not found' }, 404);
    }

    return c.json(mergeRequest);
  } catch (error: any) {
    console.error('Error getting merge request:', error);
    return c.json({ error: error.message || 'Failed to get merge request' }, 400);
  }
});

/**
 * Update merge request status
 * PATCH /api/version-control/merge-requests/:mrId
 */
app.patch('/merge-requests/:mrId', async (c) => {
  try {
    const mrId = c.req.param('mrId');
    
    const schema = z.object({
      status: z.enum(['OPEN', 'MERGED', 'CLOSED']).optional(),
      reviewedBy: z.string().optional(),
      mergedBy: z.string().optional()
    });

    const body = await c.req.json();
    const data = schema.parse(body);

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const updated = await prisma.workflowMergeRequest.update({
      where: { id: mrId },
      data: {
        ...data,
        ...(data.status === 'MERGED' && { mergedAt: new Date() }),
        ...(data.status === 'CLOSED' && { closedAt: new Date() })
      }
    });

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating merge request:', error);
    return c.json({ error: error.message || 'Failed to update merge request' }, 400);
  }
});

export default app;
