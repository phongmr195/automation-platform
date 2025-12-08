/**
 * Custom Nodes API Routes
 * Endpoints for creating, publishing, installing, and managing custom nodes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { customNodeService } from '../services/customNodeService';
import { nodeLoader } from '../workflow/NodeLoader';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// Validation schemas
const createNodeSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  category: z.string(),
  icon: z.string().optional(),
  iconUrl: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional()
});

const createVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semver
  changelog: z.string().optional(),
  code: z.string().min(100),
  dependencies: z.record(z.string(), z.string()).optional()
});

const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  verified: z.boolean().optional(),
  sortBy: z.enum(['downloads', 'rating', 'recent', 'name']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

const installSchema = z.object({
  nodeId: z.string(),
  version: z.string(),
  organizationId: z.string().optional()
});

// Routes

/**
 * GET /api/custom-nodes
 * Search and list custom nodes
 */
app.get('/', async (c) => {
  try {
    const params = c.req.query();
    const validated = searchSchema.parse({
      query: params.query,
      category: params.category,
      published: params.published === 'true',
      featured: params.featured === 'true',
      verified: params.verified === 'true',
      sortBy: params.sortBy as any,
      page: params.page ? parseInt(params.page) : undefined,
      limit: params.limit ? parseInt(params.limit) : undefined
    });

    const result = await customNodeService.searchNodes(validated);

    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * GET /api/custom-nodes/featured
 * Get featured nodes
 */
app.get('/featured', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const nodes = await customNodeService.getFeaturedNodes(limit);

    return c.json({ nodes });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/custom-nodes/trending
 * Get trending nodes
 */
app.get('/trending', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const nodes = await customNodeService.getTrendingNodes(limit);

    return c.json({ nodes });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/custom-nodes/installed
 * Get installed nodes for current user/organization
 */
app.get('/installed', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId');

    const nodes = await customNodeService.getInstalledNodes(
      organizationId,
      userId
    );

    return c.json({ nodes });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/custom-nodes/:id
 * Get node details by ID
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const includeVersions = c.req.query('includeVersions') === 'true';

    const node = await customNodeService.getNode(id, includeVersions);

    if (!node) {
      return c.json({ error: 'Node not found' }, 404);
    }

    return c.json({ node });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/custom-nodes/:id/stats
 * Get node statistics
 */
app.get('/:id/stats', async (c) => {
  try {
    const id = c.req.param('id');
    const stats = await customNodeService.getNodeStats(id);

    return c.json({ stats });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/custom-nodes
 * Create a new custom node
 */
app.post('/', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const userEmail = (c as any).get('userEmail') as string;
    const body = await c.req.json();
    const validated = createNodeSchema.parse(body);

    const node = await customNodeService.createNode({
      ...validated,
      author: userId,
      authorName: userEmail
    });

    return c.json({ node }, 201);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.issues }, 400);
    }
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/custom-nodes/:id/versions
 * Create a new version of a node
 */
app.post('/:id/versions', async (c) => {
  try {
    const nodeId = c.req.param('id');
    const body = await c.req.json();
    const validated = createVersionSchema.parse(body);

    // Verify user owns the node
    const node = await customNodeService.getNode(nodeId);
    const userId = (c as any).get('userId') as string;

    if (!node || node.author !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const version = await customNodeService.createVersion({
      nodeId,
      version: validated.version,
      code: validated.code,
      changelog: validated.changelog,
      dependencies: validated.dependencies as Record<string, string> | undefined
    });

    return c.json({ version }, 201);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.issues }, 400);
    }
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/custom-nodes/:id/publish
 * Publish a node version
 */
app.post('/:id/publish', async (c) => {
  try {
    const nodeId = c.req.param('id');
    const { version } = await c.req.json();

    // Verify user owns the node
    const node = await customNodeService.getNode(nodeId);
    const userId = (c as any).get('userId') as string;

    if (!node || node.author !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const publishedNode = await customNodeService.publishNode({
      nodeId,
      version
    });

    return c.json({ node: publishedNode });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/custom-nodes/:id/install
 * Install a node
 */
app.post('/:id/install', async (c) => {
  try {
    const nodeId = c.req.param('id');
    const userId = (c as any).get('userId') as string;
    const body = await c.req.json();
    const validated = installSchema.parse({ ...body, nodeId });

    const install = await customNodeService.installNode({
      nodeId: validated.nodeId,
      version: validated.version,
      organizationId: validated.organizationId,
      userId: userId
    });

    // Preload the node - get node details first
    const node = await customNodeService.getNode(nodeId);
    if (node) {
      await nodeLoader.loadNode(node.name, install.version);
    }

    return c.json({ install }, 201);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.issues }, 400);
    }
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/custom-nodes/:id/install
 * Uninstall a node
 */
app.delete('/:id/install', async (c) => {
  try {
    const nodeId = c.req.param('id');
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId');

    await customNodeService.uninstallNode(nodeId, organizationId, userId);

    // Unload from cache
    const node = await customNodeService.getNode(nodeId);
    if (node) {
      await nodeLoader.unloadNode(node.name);
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/custom-nodes/:id
 * Update node metadata
 */
app.put('/:id', async (c) => {
  try {
    const nodeId = c.req.param('id');
    const userId = (c as any).get('userId') as string;
    const body = await c.req.json();

    // Verify user owns the node
    const node = await customNodeService.getNode(nodeId);

    if (!node || node.author !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updated = await customNodeService.updateNode(nodeId, body);

    return c.json({ node: updated });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/custom-nodes/:id
 * Delete (deprecate) a node
 */
app.delete('/:id', async (c) => {
  try {
    const nodeId = c.req.param('id');
    const userId = (c as any).get('userId') as string;

    // Verify user owns the node
    const node = await customNodeService.getNode(nodeId);

    if (!node || node.author !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const deleted = await customNodeService.deleteNode(nodeId);

    // Unload from cache
    await nodeLoader.unloadNode(node.name);

    return c.json({ node: deleted });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/custom-nodes/loader/stats
 * Get node loader statistics
 */
app.get('/loader/stats', async (c) => {
  try {
    const stats = nodeLoader.getStats();
    const definitions = nodeLoader.getLoadedNodeDefinitions();

    return c.json({ stats, definitions });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/custom-nodes/loader/clear-cache
 * Clear node loader cache
 */
app.post('/loader/clear-cache', async (c) => {
  try {
    const { name, version } = await c.req.json();
    nodeLoader.clearCache(name, version);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
