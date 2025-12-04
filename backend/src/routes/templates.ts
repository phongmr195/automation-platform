/**
 * Template API Routes
 * REST endpoints for workflow template management
 */

import { Hono } from 'hono';
import { templateService } from '../services/templateService';
import { workflowService } from '../services/workflowService';

const app = new Hono();

/**
 * GET /templates
 * Get all templates with optional filtering
 */
app.get('/', async (c) => {
  try {
    const category = c.req.query('category');
    const difficulty = c.req.query('difficulty');
    const featured = c.req.query('featured');
    const search = c.req.query('search');
    const tags = c.req.query('tags');

    const filter: any = {};

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (featured) filter.featured = featured === 'true';
    if (search) filter.search = search;
    if (tags) filter.tags = tags.split(',').map(t => t.trim());

    const templates = await templateService.getTemplates(filter);

    return c.json({
      templates,
      total: templates.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch templates: ${errorMessage}` }, 500);
  }
});

/**
 * GET /templates/featured
 * Get featured templates
 */
app.get('/featured', async (c) => {
  try {
    const templates = await templateService.getFeaturedTemplates();
    return c.json({ templates });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch featured templates: ${errorMessage}` }, 500);
  }
});

/**
 * GET /templates/categories
 * Get all categories with counts
 */
app.get('/categories', async (c) => {
  try {
    const categories = await templateService.getCategories();
    return c.json({ categories });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch categories: ${errorMessage}` }, 500);
  }
});

/**
 * GET /templates/tags
 * Get popular tags
 */
app.get('/tags', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');
    const tags = await templateService.getPopularTags(limit);
    return c.json({ tags });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch tags: ${errorMessage}` }, 500);
  }
});

/**
 * GET /templates/search
 * Search templates
 */
app.get('/search', async (c) => {
  try {
    const query = c.req.query('q');

    if (!query) {
      return c.json({ error: 'Search query is required' }, 400);
    }

    const templates = await templateService.searchTemplates(query);
    return c.json({
      templates,
      total: templates.length,
      query,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Search failed: ${errorMessage}` }, 500);
  }
});

/**
 * GET /templates/:id
 * Get template by ID
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const template = await templateService.getTemplateById(id);

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    return c.json(template);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch template: ${errorMessage}` }, 500);
  }
});

/**
 * POST /templates
 * Create a new template
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.name || !body.category || !body.nodes || !body.connections) {
      return c.json(
        {
          error: 'Missing required fields: name, category, nodes, connections',
        },
        400
      );
    }

    const template = await templateService.createTemplate(body);

    return c.json(template, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to create template: ${errorMessage}` }, 500);
  }
});

/**
 * PUT /templates/:id
 * Update a template
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const template = await templateService.updateTemplate(id, body);

    return c.json(template);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to update template: ${errorMessage}` }, 500);
  }
});

/**
 * DELETE /templates/:id
 * Delete a template
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await templateService.deleteTemplate(id);

    return c.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to delete template: ${errorMessage}` }, 500);
  }
});

/**
 * POST /templates/:id/install
 * Install a template (create workflow from template)
 */
app.post('/:id/install', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    // Get template
    const template = await templateService.getTemplateById(id);
    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Create workflow from template
    const workflowData = {
      name: body.name || template.name,
      description: body.description || template.description,
      nodes: template.nodes,
      connections: template.connections,
      triggers: template.triggers || [],
      settings: template.settings,
      organizationId: body.organizationId,
      ownerId: body.userId,
      active: false,
    };

    const workflow = await workflowService.createWorkflow(workflowData);

    // Increment install count
    await templateService.incrementInstallCount(id);

    return c.json({
      workflow,
      template: {
        id: template.id,
        name: template.name,
      },
      message: 'Template installed successfully',
    }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to install template: ${errorMessage}` }, 500);
  }
});

/**
 * POST /templates/:id/rate
 * Rate a template
 */
app.post('/:id/rate', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }

    const template = await templateService.updateRating(id, body.rating);

    return c.json({
      template,
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to rate template: ${errorMessage}` }, 500);
  }
});

export default app;
