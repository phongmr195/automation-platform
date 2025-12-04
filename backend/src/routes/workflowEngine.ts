/**
 * Workflow Engine API Routes
 * REST endpoints for database-persisted workflow execution
 */

import { Hono } from 'hono';
import { workflowExecutor } from '../workflow/WorkflowExecutor';
import { nodeRegistry } from '../workflow/NodeRegistry';
import { getWorkflowScheduler } from '../workflow/WorkflowScheduler';
import { workflowService } from '../services/workflowService';
import type { Workflow } from '../workflow/types';

const app = new Hono();
const scheduler = getWorkflowScheduler();

/**
 * GET /engine/workflows
 * List all workflows from database
 */
app.get('/workflows', async (c) => {
  try {
    const workflowList = await workflowService.getAllWorkflows();

    return c.json({
      workflows: workflowList,
      total: workflowList.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch workflows: ${errorMessage}` }, 500);
  }
});

/**
 * GET /engine/workflows/:id
 * Get workflow by ID from database
 */
app.get('/workflows/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const workflow = await workflowService.getWorkflowById(id);

    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    return c.json(workflow);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch workflow: ${errorMessage}` }, 500);
  }
});

/**
 * POST /engine/workflows
 * Create new workflow in database
 */
app.post('/workflows', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate workflow
    if (!body.name) {
      return c.json({ error: 'Workflow name is required' }, 400);
    }

    const workflow = await workflowService.createWorkflow({
      id: body.id,
      name: body.name,
      description: body.description,
      nodes: body.nodes || [],
      connections: body.connections || [],
      triggers: body.triggers || [],
      settings: body.settings || {},
      active: body.active !== undefined ? body.active : false,
    });

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
 * Update existing workflow in database
 */
app.put('/workflows/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const workflow = await workflowService.updateWorkflow(id, {
      name: body.name,
      description: body.description,
      nodes: body.nodes,
      connections: body.connections,
      triggers: body.triggers,
      settings: body.settings,
      active: body.active,
    });

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
    const workflow = await workflowService.getWorkflowById(id);

    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    // Get trigger data from body (optional)
    const body = await c.req.json().catch(() => ({}));
    const triggerData = body.triggerData;

    // Create execution record
    const execution = await workflowService.createExecution({
      workflowId: id,
      status: 'running',
      input: triggerData,
      definitionSnapshot: { nodes: workflow.nodes, connections: workflow.connections },
    });

    // Execute workflow
    const result = await workflowExecutor.execute(workflow, triggerData);

    // Convert Map to object for JSON
    const nodeResults: Record<string, any> = {};
    result.nodeResults.forEach((value: any, key: string) => {
      nodeResults[key] = value;
    });

    // Update execution with result
    await workflowService.updateExecution(execution.id, {
      status: result.status,
      error: result.error,
      nodeResults,
    });

    return c.json({
      message: 'Workflow executed',
      execution: {
        executionId: execution.id,
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
 * GET /engine/workflows/:id/executions
 * Get execution history for a workflow
 */
app.get('/workflows/:id/executions', async (c) => {
  try {
    const workflowId = c.req.param('id');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const status = c.req.query('status');

    const executions = await workflowService.getExecutionsByWorkflowId(
      workflowId,
      { page, limit, status }
    );

    return c.json(executions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch executions: ${errorMessage}` }, 500);
  }
});

/**
 * GET /engine/executions/:executionId
 * Get execution details from database
 */
app.get('/executions/:executionId', async (c) => {
  try {
    const executionId = c.req.param('executionId');
    const execution = await workflowService.getExecutionById(executionId);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    return c.json(execution);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch execution: ${errorMessage}` }, 500);
  }
});

/**
 * POST /engine/executions/:executionId/retry
 * Retry a failed execution
 */
app.post('/executions/:executionId/retry', async (c) => {
  try {
    const executionId = c.req.param('executionId');
    const execution = await workflowService.getExecutionById(executionId);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    const workflow = await workflowService.getWorkflowById(execution.workflowId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    // Create new execution record
    const newExecution = await workflowService.createExecution({
      workflowId: workflow.id,
      status: 'running',
      input: execution.input,
      definitionSnapshot: { nodes: workflow.nodes, connections: workflow.connections },
    });

    // Execute workflow with same input
    const result = await workflowExecutor.execute(workflow, execution.input);

    // Convert Map to object for JSON
    const nodeResults: Record<string, any> = {};
    result.nodeResults.forEach((value: any, key: string) => {
      nodeResults[key] = value;
    });

    // Update execution
    await workflowService.updateExecution(newExecution.id, {
      status: result.status,
      error: result.error,
      nodeResults,
    });

    return c.json({
      message: 'Execution retried',
      execution: {
        executionId: newExecution.id,
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
    return c.json({ error: `Retry failed: ${errorMessage}` }, 500);
  }
});

/**
 * POST /engine/executions/:executionId/replay
 * Replay an execution with the same inputs
 */
app.post('/executions/:executionId/replay', async (c) => {
  try {
    const executionId = c.req.param('executionId');
    const execution = await workflowService.getExecutionById(executionId);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    const workflow = await workflowService.getWorkflowById(execution.workflowId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    // Use the snapshot from the original execution to replay with exact same definition
    const workflowSnapshot: Workflow = {
      ...workflow,
      nodes: execution.definitionSnapshot.nodes || workflow.nodes,
      connections: execution.definitionSnapshot.connections || workflow.connections,
    };

    // Create new execution record
    const newExecution = await workflowService.createExecution({
      workflowId: workflow.id,
      status: 'running',
      input: execution.input,
      definitionSnapshot: execution.definitionSnapshot,
    });

    // Execute workflow with snapshot
    const result = await workflowExecutor.execute(workflowSnapshot, execution.input);

    // Convert Map to object for JSON
    const nodeResults: Record<string, any> = {};
    result.nodeResults.forEach((value: any, key: string) => {
      nodeResults[key] = value;
    });

    // Update execution
    await workflowService.updateExecution(newExecution.id, {
      status: result.status,
      error: result.error,
      nodeResults,
    });

    return c.json({
      message: 'Execution replayed',
      execution: {
        executionId: newExecution.id,
        originalExecutionId: executionId,
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
    return c.json({ error: `Replay failed: ${errorMessage}` }, 500);
  }
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
 * Delete workflow from database
 */
app.delete('/workflows/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Check if workflow exists
    const workflow = await workflowService.getWorkflowById(id);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    // Unschedule if scheduled
    try {
      await scheduler.unschedule(id);
    } catch (error) {
      console.error('Failed to unschedule workflow:', error);
    }

    await workflowService.deleteWorkflow(id);

    return c.json({
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to delete workflow: ${errorMessage}` }, 500);
  }
});

/**
 * POST /engine/workflows/:id/activate
 * Activate workflow and schedule if has cron trigger
 */
app.post('/workflows/:id/activate', async (c) => {
  try {
    const id = c.req.param('id');
    const workflow = await workflowService.updateWorkflow(id, { active: true });

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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to activate workflow: ${errorMessage}` }, 500);
  }
});

/**
 * POST /engine/workflows/:id/deactivate
 * Deactivate workflow and unschedule
 */
app.post('/workflows/:id/deactivate', async (c) => {
  try {
    const id = c.req.param('id');
    const workflow = await workflowService.updateWorkflow(id, { active: false });

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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to deactivate workflow: ${errorMessage}` }, 500);
  }
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
  try {
    const workflowId = c.req.param('workflowId');
    const workflow = await workflowService.getWorkflowById(workflowId);

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

    // Create execution record
    const execution = await workflowService.createExecution({
      workflowId,
      status: 'running',
      input: webhookData,
      definitionSnapshot: { nodes: workflow.nodes, connections: workflow.connections },
    });

    // Execute workflow
    const result = await workflowExecutor.execute(workflow, webhookData);

    // Convert Map to object for JSON
    const nodeResults: Record<string, any> = {};
    result.nodeResults.forEach((value: any, key: string) => {
      nodeResults[key] = value;
    });

    // Update execution
    await workflowService.updateExecution(execution.id, {
      status: result.status,
      error: result.error,
      nodeResults,
    });

    return c.json({
      message: 'Workflow triggered via webhook',
      executionId: execution.id,
      status: result.status,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Workflow execution failed: ${errorMessage}` }, 500);
  }
});

export default app;
