import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export class VersionControlService {
  /**
   * Create a Git-like SHA hash for a commit
   */
  private static generateCommitSHA(data: {
    workflowId: string;
    versionId: string;
    message: string;
    author: string;
    parentSha?: string;
    timestamp: Date;
  }): string {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 40);
  }

  /**
   * Calculate diff between two workflow definitions
   */
  static calculateDiff(
    fromDefinition: any,
    toDefinition: any
  ): {
    diffType: string;
    diffData: any;
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    connectionsAdded: number;
    connectionsRemoved: number;
    settingsChanged: boolean;
  } {
    const fromNodes = Array.isArray(fromDefinition.nodes) ? fromDefinition.nodes : 
                      (typeof fromDefinition.nodes === 'string' ? JSON.parse(fromDefinition.nodes) : []);
    const toNodes = Array.isArray(toDefinition.nodes) ? toDefinition.nodes : 
                    (typeof toDefinition.nodes === 'string' ? JSON.parse(toDefinition.nodes) : []);
    
    const fromConnections = Array.isArray(fromDefinition.connections) ? fromDefinition.connections : 
                           (typeof fromDefinition.connections === 'string' ? JSON.parse(fromDefinition.connections) : []);
    const toConnections = Array.isArray(toDefinition.connections) ? toDefinition.connections : 
                         (typeof toDefinition.connections === 'string' ? JSON.parse(toDefinition.connections) : []);

    const fromNodeIds = new Set(fromNodes.map((n: any) => n.id));
    const toNodeIds = new Set(toNodes.map((n: any) => n.id));

    const nodesAdded = toNodes.filter((n: any) => !fromNodeIds.has(n.id)).length;
    const nodesRemoved = fromNodes.filter((n: any) => !toNodeIds.has(n.id)).length;
    
    // Check modified nodes
    let nodesModified = 0;
    const nodeChanges: any[] = [];
    for (const toNode of toNodes) {
      const fromNode = fromNodes.find((n: any) => n.id === toNode.id);
      if (fromNode && JSON.stringify(fromNode) !== JSON.stringify(toNode)) {
        nodesModified++;
        nodeChanges.push({
          id: toNode.id,
          before: fromNode,
          after: toNode
        });
      }
    }

    const fromConnectionIds = new Set(fromConnections.map((c: any) => `${c.source}-${c.target}`));
    const toConnectionIds = new Set(toConnections.map((c: any) => `${c.source}-${c.target}`));

    const connectionsAdded = toConnections.filter((c: any) => 
      !fromConnectionIds.has(`${c.source}-${c.target}`)
    ).length;
    const connectionsRemoved = fromConnections.filter((c: any) => 
      !toConnectionIds.has(`${c.source}-${c.target}`)
    ).length;

    const settingsChanged = JSON.stringify(fromDefinition.settings) !== JSON.stringify(toDefinition.settings);

    // Determine diff type
    let diffType = 'MINOR_CHANGE';
    const totalChanges = nodesAdded + nodesRemoved + nodesModified + connectionsAdded + connectionsRemoved;
    
    if (totalChanges > 10 || (nodesAdded + nodesRemoved) > 5) {
      diffType = 'COMPLETE_REWRITE';
    } else if (nodesAdded > 0 || nodesRemoved > 0) {
      diffType = 'NODES_CHANGED';
    } else if (connectionsAdded > 0 || connectionsRemoved > 0) {
      diffType = 'CONNECTIONS_CHANGED';
    } else if (settingsChanged) {
      diffType = 'SETTINGS_CHANGED';
    }

    return {
      diffType,
      diffData: {
        nodes: {
          added: toNodes.filter((n: any) => !fromNodeIds.has(n.id)),
          removed: fromNodes.filter((n: any) => !toNodeIds.has(n.id)),
          modified: nodeChanges
        },
        connections: {
          added: toConnections.filter((c: any) => !fromConnectionIds.has(`${c.source}-${c.target}`)),
          removed: fromConnections.filter((c: any) => !toConnectionIds.has(`${c.source}-${c.target}`))
        },
        settings: settingsChanged ? {
          before: fromDefinition.settings,
          after: toDefinition.settings
        } : null
      },
      nodesAdded,
      nodesRemoved,
      nodesModified,
      connectionsAdded,
      connectionsRemoved,
      settingsChanged
    };
  }

  /**
   * Create a commit for a workflow version
   */
  static async createCommit(data: {
    workflowId: string;
    versionId: string;
    branchId?: string;
    message: string;
    author: string;
    authorId?: string;
    tags?: string[];
  }) {
    // Get the version
    const version = await prisma.workflowVersion.findUnique({
      where: { id: data.versionId },
      include: { workflow: true }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Get parent commit (if branch specified, use branch head)
    let parentSha: string | undefined;
    if (data.branchId) {
      const branch = await prisma.workflowBranch.findUnique({
        where: { id: data.branchId }
      });
      parentSha = branch?.headSha || undefined;
    } else {
      // Get latest commit on main branch
      const mainBranch = await prisma.workflowBranch.findFirst({
        where: {
          workflowId: data.workflowId,
          isDefault: true
        }
      });
      parentSha = mainBranch?.headSha || undefined;
    }

    // Generate SHA
    const sha = this.generateCommitSHA({
      workflowId: data.workflowId,
      versionId: data.versionId,
      message: data.message,
      author: data.author,
      parentSha,
      timestamp: new Date()
    });

    // Calculate changes if there's a parent
    let changes = null;
    if (parentSha) {
      const parentCommit = await prisma.workflowCommit.findUnique({
        where: { sha: parentSha },
        include: { version: true }
      });

      if (parentCommit) {
        const diff = this.calculateDiff(parentCommit.version.definition, version.definition);
        changes = diff.diffData;
      }
    }

    // Create commit
    const commit = await prisma.workflowCommit.create({
      data: {
        workflowId: data.workflowId,
        versionId: data.versionId,
        branchId: data.branchId,
        sha,
        message: data.message,
        author: data.author,
        authorId: data.authorId,
        parentSha,
        changes,
        tags: data.tags || []
      },
      include: {
        version: true,
        branch: true,
        parent: true
      }
    });

    // Update branch head if branch specified
    if (data.branchId) {
      await prisma.workflowBranch.update({
        where: { id: data.branchId },
        data: { headSha: sha }
      });
    }

    return commit;
  }

  /**
   * Create a new branch
   */
  static async createBranch(data: {
    workflowId: string;
    name: string;
    description?: string;
    sourceBranchId?: string;
    isDefault?: boolean;
    isProtected?: boolean;
    createdBy?: string;
  }) {
    // Check if branch name already exists
    const existing = await prisma.workflowBranch.findFirst({
      where: {
        workflowId: data.workflowId,
        name: data.name
      }
    });

    if (existing) {
      throw new Error(`Branch "${data.name}" already exists`);
    }

    // Get source branch head if specified
    let headSha: string | undefined;
    if (data.sourceBranchId) {
      const sourceBranch = await prisma.workflowBranch.findUnique({
        where: { id: data.sourceBranchId }
      });
      headSha = sourceBranch?.headSha || undefined;
    }

    // If this is the first branch, make it default
    const branchCount = await prisma.workflowBranch.count({
      where: { workflowId: data.workflowId }
    });
    const isDefault = branchCount === 0 || data.isDefault;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.workflowBranch.updateMany({
        where: {
          workflowId: data.workflowId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const branch = await prisma.workflowBranch.create({
      data: {
        workflowId: data.workflowId,
        name: data.name,
        description: data.description,
        headSha,
        isDefault,
        isProtected: data.isProtected || false,
        createdBy: data.createdBy
      }
    });

    return branch;
  }

  /**
   * Get commit history for a branch
   */
  static async getCommitHistory(branchId: string, limit = 50) {
    const branch = await prisma.workflowBranch.findUnique({
      where: { id: branchId }
    });

    if (!branch || !branch.headSha) {
      return [];
    }

    const commits: any[] = [];
    let currentSha: string | null = branch.headSha;

    while (currentSha && commits.length < limit) {
      const commit = await prisma.workflowCommit.findUnique({
        where: { sha: currentSha },
        include: {
          version: true,
          branch: true
        }
      });

      if (!commit) break;

      commits.push(commit);
      currentSha = commit.parentSha;
    }

    return commits;
  }

  /**
   * Get diff between two commits
   */
  static async getDiff(fromSha: string, toSha: string) {
    const [fromCommit, toCommit] = await Promise.all([
      prisma.workflowCommit.findUnique({
        where: { sha: fromSha },
        include: { version: true }
      }),
      prisma.workflowCommit.findUnique({
        where: { sha: toSha },
        include: { version: true }
      })
    ]);

    if (!fromCommit || !toCommit) {
      throw new Error('Commit not found');
    }

    const diff = this.calculateDiff(
      fromCommit.version.definition,
      toCommit.version.definition
    );

    // Save diff to database
    const workflowId = fromCommit.workflowId;
    const savedDiff = await prisma.workflowDiff.upsert({
      where: {
        workflowId_fromSha_toSha: {
          workflowId,
          fromSha,
          toSha
        }
      },
      create: {
        workflowId,
        fromSha,
        toSha,
        diffType: diff.diffType as any,
        diffData: diff.diffData,
        nodesAdded: diff.nodesAdded,
        nodesRemoved: diff.nodesRemoved,
        nodesModified: diff.nodesModified,
        connectionsAdded: diff.connectionsAdded,
        connectionsRemoved: diff.connectionsRemoved,
        settingsChanged: diff.settingsChanged
      },
      update: {
        diffData: diff.diffData,
        nodesAdded: diff.nodesAdded,
        nodesRemoved: diff.nodesRemoved,
        nodesModified: diff.nodesModified,
        connectionsAdded: diff.connectionsAdded,
        connectionsRemoved: diff.connectionsRemoved,
        settingsChanged: diff.settingsChanged
      }
    });

    return savedDiff;
  }

  /**
   * Rollback workflow to a specific commit
   */
  static async rollback(workflowId: string, targetSha: string, authorId?: string) {
    const commit = await prisma.workflowCommit.findUnique({
      where: { sha: targetSha },
      include: { version: true }
    });

    if (!commit || commit.workflowId !== workflowId) {
      throw new Error('Commit not found');
    }

    // Create new version from commit
    const latestVersion = await prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' }
    });

    const newVersion = await prisma.workflowVersion.create({
      data: {
        workflowId,
        versionNumber: (latestVersion?.versionNumber || 0) + 1,
        definition: commit.version.definition,
        isDraft: false
      }
    });

    // Update workflow
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        nodes: (commit.version.definition as any).nodes,
        connections: (commit.version.definition as any).connections,
        triggers: (commit.version.definition as any).triggers || [],
        settings: (commit.version.definition as any).settings || {},
        publishedVersionId: newVersion.id
      }
    });

    // Create rollback commit
    const defaultBranch = await prisma.workflowBranch.findFirst({
      where: { workflowId, isDefault: true }
    });

    if (defaultBranch) {
      await this.createCommit({
        workflowId,
        versionId: newVersion.id,
        branchId: defaultBranch.id,
        message: `Rollback to ${targetSha.substring(0, 7)}`,
        author: authorId || 'system',
        authorId,
        tags: ['rollback']
      });
    }

    return newVersion;
  }

  /**
   * Create a snapshot
   */
  static async createSnapshot(data: {
    workflowId: string;
    name: string;
    description?: string;
    commitSha: string;
    createdBy?: string;
  }) {
    const commit = await prisma.workflowCommit.findUnique({
      where: { sha: data.commitSha },
      include: { version: true }
    });

    if (!commit) {
      throw new Error('Commit not found');
    }

    const snapshot = await prisma.workflowSnapshot.create({
      data: {
        workflowId: data.workflowId,
        name: data.name,
        description: data.description,
        commitSha: data.commitSha,
        definition: commit.version.definition,
        createdBy: data.createdBy
      }
    });

    return snapshot;
  }

  /**
   * List all branches for a workflow
   */
  static async listBranches(workflowId: string) {
    return prisma.workflowBranch.findMany({
      where: { workflowId },
      include: {
        headCommit: {
          include: {
            version: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * List all snapshots for a workflow
   */
  static async listSnapshots(workflowId: string) {
    return prisma.workflowSnapshot.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Delete a branch
   */
  static async deleteBranch(branchId: string) {
    const branch = await prisma.workflowBranch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    if (branch.isDefault) {
      throw new Error('Cannot delete default branch');
    }

    if (branch.isProtected) {
      throw new Error('Cannot delete protected branch');
    }

    return prisma.workflowBranch.delete({
      where: { id: branchId }
    });
  }
}
