/**
 * Workflow Engine API Routes
 * REST endpoints for in-memory workflow execution
 */

import { Hono } from 'hono';
import { workflowExecutor } from '../workflow/WorkflowExecutor';
import { nodeRegistry } from '../workflow/NodeRegistry';
import { getWorkflowScheduler } from '../workflow/WorkflowScheduler';
import type { Workflow } from '../workflow/types';

const app = new Hono();
const scheduler = getWorkflowScheduler();

// In-memory storage for workflows (TODO: move to database)
const workflows = new Map<string, Workflow>();
const executions = new Map<string, any>();

/**
 * GET /engine/workflows
 * List all in-memory workflows
 */
app.get('/workflows', (c) => {
  const workflowList = Array.from(workflows.values()).map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    active: w.active,
    nodeCount: w.nodes.length,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));

  return c.json({
    workflows: workflowList,
    total: workflowList.length,
  });
});

/**
 * GET /engine/workflows/:id
 * Get workflow by ID
 */
app.get('/workflows/:id', (c) => {
  const id = c.req.param('id');
  const workflow = workflows.get(id);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  return c.json(workflow);
});

/**
 * POST /engine/workflows
 * Create new in-memory workflow
 */
app.post('/workflows', async (c) => {
  try {
    const body = await c.req.json();
    
    const workflow: Workflow = {
      id: body.id || `wf_${Date.now()}`,
      name: body.name,
      description: body.description,
      nodes: body.nodes || [],
      connections: body.connections || [],
      triggers: body.triggers || [],
      settings: body.settings || {},
      active: body.active !== undefined ? body.active : false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate workflow
    if (!workflow.name) {
      return c.json({ error: 'Workflow name is required' }, 400);
    }

    workflows.set(workflow.id, workflow);

    // Schedule if workflow has cron triggers and is active
    if (workflow.active) {
      const hasCronTrigger = workflow.triggers.some(t => t.type === 'schedule' && t.config.cron);
      if (hasCronTrigger) {
        try {
          await scheduler.schedule(workflow);
        } catch (error) {
          console.error('Failed to schedule workflow:', error);
        }
      }
    }

    return c.json({
      message: 'Workflow created successfully',
      workflow,
    }, 201);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to create workflow: ${errorMessage}` }, 400);
  }
});

/**
 * PUT /engine/workflows/:id
 * Update existing workflow
 */
app.put('/workflows/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existingWorkflow = workflows.get(id);

    if (!existingWorkflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    const body = await c.req.json();
    
    const workflow: Workflow = {
      ...existingWorkflow,
      name: body.name || existingWorkflow.name,
      description: body.description !== undefined ? body.description : existingWorkflow.description,
      nodes: body.nodes || existingWorkflow.nodes,
      connections: body.connections || existingWorkflow.connections,
      triggers: body.triggers || existingWorkflow.triggers,
      settings: body.settings || existingWorkflow.settings,
      active: body.active !== undefined ? body.active : existingWorkflow.active,
      updatedAt: new Date(),
    };

    workflows.set(workflow.id, workflow);

    // Re-schedule if workflow has cron triggers and is active
    if (workflow.active) {
      const hasCronTrigger = workflow.triggers.some(t => t.type === 'schedule' && t.config.cron);
      if (hasCronTrigger) {
        try {
          await scheduler.unschedule(id);
          await scheduler.schedule(workflow);
        } catch (error) {
          console.error('Failed to reschedule workflow:', error);
        }
      }
    } else {
      // Unschedule if deactivated
      try {
        await scheduler.unschedule(id);
      } catch (error) {
        console.error('Failed to unschedule workflow:', error);
      }
    }

    return c.json({
      message: 'Workflow updated successfully',
      workflow,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to update workflow: ${errorMessage}` }, 400);
  }
});

/**
 * POST /engine/workflows/:id/execute
 * Execute workflow manually
 */
app.post('/workflows/:id/execute', async (c) => {
  try {
    const id = c.req.param('id');
    const workflow = workflows.get(id);

    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    // Get trigger data from body (optional)
    const body = await c.req.json().catch(() => ({}));
    const triggerData = body.triggerData;

    // Execute workflow
    const result = await workflowExecutor.execute(workflow, triggerData);

    // Store execution result
    executions.set(result.executionId, result);

    // Convert Map to object for JSON
    const nodeResults: Record<string, any> = {};
    result.nodeResults.forEach((value: any, key: string) => {
      nodeResults[key] = value;
    });

    return c.json({
      message: 'Workflow executed',
      execution: {
        executionId: result.executionId,
        workflowId: result.workflowId,
        status: result.status,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        duration: result.duration,
        nodeResults,
        error: result.error,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Execution failed: ${errorMessage}` }, 500);
  }
});

/**
 * GET /engine/executions/:executionId
 * Get execution details
 */
app.get('/executions/:executionId', (c) => {
  const executionId = c.req.param('executionId');
  const execution = executions.get(executionId);

  if (!execution) {
    return c.json({ error: 'Execution not found' }, 404);
  }

  // Convert Map to object for JSON
  const nodeResults: Record<string, any> = {};
  execution.nodeResults.forEach((value: any, key: string) => {
    nodeResults[key] = value;
  });

  return c.json({
    ...execution,
    nodeResults,
  });
});

/**
 * GET /engine/nodes
 * List all available node types
 */
app.get('/nodes', (c) => {
  const nodes = nodeRegistry.getAllNodes().map(node => ({
    type: node.type,
    category: node.category,
    name: node.name,
    description: node.description,
    inputs: node.inputs,
    outputs: node.outputs,
  }));

  return c.json({
    nodes,
    total: nodes.length,
  });
});

/**
 * DELETE /engine/workflows/:id
 * Delete workflow
 */
app.delete('/workflows/:id', async (c) => {
  const id = c.req.param('id');
  
  if (!workflows.has(id)) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  // Unschedule if scheduled
  try {
    await scheduler.unschedule(id);
  } catch (error) {
    console.error('Failed to unschedule workflow:', error);
  }

  workflows.delete(id);

  return c.json({
    message: 'Workflow deleted successfully',
  });
});

/**
 * POST /engine/workflows/:id/activate
 * Activate workflow and schedule if has cron trigger
 */
app.post('/workflows/:id/activate', async (c) => {
  const id = c.req.param('id');
  const workflow = workflows.get(id);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  workflow.active = true;
  workflow.updatedAt = new Date();

  // Schedule if has cron trigger
  const hasCronTrigger = workflow.triggers.some(t => t.type === 'schedule' && t.config.cron);
  if (hasCronTrigger) {
    try {
      await scheduler.schedule(workflow);
    } catch (error) {
      return c.json({ error: `Failed to schedule workflow: ${error}` }, 500);
    }
  }

  return c.json({
    message: 'Workflow activated',
    workflow,
  });
});

/**
 * POST /engine/workflows/:id/deactivate
 * Deactivate workflow and unschedule
 */
app.post('/workflows/:id/deactivate', async (c) => {
  const id = c.req.param('id');
  const workflow = workflows.get(id);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  workflow.active = false;
  workflow.updatedAt = new Date();

  // Unschedule
  try {
    await scheduler.unschedule(id);
  } catch (error) {
    console.error('Failed to unschedule workflow:', error);
  }

  return c.json({
    message: 'Workflow deactivated',
    workflow,
  });
});

/**
 * GET /engine/schedules
 * Get all scheduled workflows
 */
app.get('/schedules', async (c) => {
  const schedules = await scheduler.getScheduledWorkflows();
  const stats = await scheduler.getStats();

  return c.json({
    schedules,
    stats,
  });
});

/**
 * POST /engine/webhook/:workflowId
 * Webhook trigger endpoint
 */
app.post('/webhook/:workflowId', async (c) => {
  const workflowId = c.req.param('workflowId');
  const workflow = workflows.get(workflowId);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  if (!workflow.active) {
    return c.json({ error: 'Workflow is not active' }, 400);
  }

  // Check if workflow has webhook trigger
  const hasWebhookTrigger = workflow.triggers.some(t => t.type === 'webhook');
  if (!hasWebhookTrigger) {
    return c.json({ error: 'Workflow does not have webhook trigger' }, 400);
  }

  // Get webhook data
  const webhookData = await c.req.json().catch(() => ({}));

  // Execute workflow
  try {
    const result = await workflowExecutor.execute(workflow, webhookData);
    executions.set(result.executionId, result);

    return c.json({
      message: 'Workflow triggered via webhook',
      executionId: result.executionId,
      status: result.status,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Workflow execution failed: ${errorMessage}` }, 500);
  }
});

export default app;
