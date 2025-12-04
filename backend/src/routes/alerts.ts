/**
 * Alert Routes
 * API endpoints for managing alert rules and channels
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { alertService } from '../services/alertService';
import { authMiddleware } from '../middleware/auth';

const alerts = new Hono();

// Apply auth middleware to all routes
alerts.use('/*', authMiddleware);

// -------------------------------------------------------
// ALERT RULES
// -------------------------------------------------------

/**
 * Get all alert rules for an organization
 * GET /api/alerts/rules?organizationId=xxx&workflowId=xxx
 */
alerts.get('/rules', async (c) => {
  try {
    const { organizationId, workflowId } = c.req.query();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    const rules = await alertService.getRules(organizationId, workflowId);
    return c.json(rules);
  } catch (error) {
    console.error('Get alert rules error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get alert rules' },
      500
    );
  }
});

/**
 * Create a new alert rule
 * POST /api/alerts/rules
 */
const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  organizationId: z.string(),
  workflowId: z.string().optional(),
  triggerType: z.enum([
    'EXECUTION_FAILED',
    'EXECUTION_SLOW',
    'ERROR_RATE_HIGH',
    'SUCCESS_RATE_LOW',
    'SCHEDULE_MISSED',
    'RESOURCE_LIMIT',
    'COST_THRESHOLD',
    'CUSTOM',
  ]),
  conditions: z.any(),
  evaluationInterval: z.number().optional(),
  cooldownPeriod: z.number().optional(),
  channelIds: z.array(z.string()),
});

alerts.post('/rules', async (c) => {
  try {
    const body = await c.req.json();
    const validated = createRuleSchema.parse(body);

    const rule = await alertService.createRule(validated);
    return c.json(rule, 201);
  } catch (error) {
    console.error('Create alert rule error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create alert rule' },
      500
    );
  }
});

/**
 * Update an alert rule
 * PUT /api/alerts/rules/:id
 */
const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  workflowId: z.string().optional(),
  triggerType: z.enum([
    'EXECUTION_FAILED',
    'EXECUTION_SLOW',
    'ERROR_RATE_HIGH',
    'SUCCESS_RATE_LOW',
    'SCHEDULE_MISSED',
    'RESOURCE_LIMIT',
    'COST_THRESHOLD',
    'CUSTOM',
  ]).optional(),
  conditions: z.any().optional(),
  evaluationInterval: z.number().optional(),
  cooldownPeriod: z.number().optional(),
  channelIds: z.array(z.string()).optional(),
});

alerts.put('/rules/:id', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const { organizationId } = c.req.query();
    const body = await c.req.json();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    const validated = updateRuleSchema.parse(body);
    const rule = await alertService.updateRule(ruleId, organizationId, validated);
    
    return c.json(rule);
  } catch (error) {
    console.error('Update alert rule error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update alert rule' },
      500
    );
  }
});

/**
 * Delete an alert rule
 * DELETE /api/alerts/rules/:id
 */
alerts.delete('/rules/:id', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const { organizationId } = c.req.query();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    await alertService.deleteRule(ruleId, organizationId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete alert rule error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete alert rule' },
      500
    );
  }
});

// -------------------------------------------------------
// ALERT CHANNELS
// -------------------------------------------------------

/**
 * Get all alert channels for an organization
 * GET /api/alerts/channels?organizationId=xxx&type=EMAIL
 */
alerts.get('/channels', async (c) => {
  try {
    const { organizationId, type } = c.req.query();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    const channels = await alertService.getChannels(
      organizationId,
      type as any
    );
    return c.json(channels);
  } catch (error) {
    console.error('Get alert channels error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get alert channels' },
      500
    );
  }
});

/**
 * Create a new alert channel
 * POST /api/alerts/channels
 */
const createChannelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  organizationId: z.string(),
  type: z.enum(['EMAIL', 'SLACK', 'WEBHOOK', 'DISCORD', 'TEAMS', 'TELEGRAM']),
  config: z.any(),
});

alerts.post('/channels', async (c) => {
  try {
    const body = await c.req.json();
    const validated = createChannelSchema.parse(body);

    const channel = await alertService.createChannel(validated);
    return c.json(channel, 201);
  } catch (error) {
    console.error('Create alert channel error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create alert channel' },
      500
    );
  }
});

/**
 * Update an alert channel
 * PUT /api/alerts/channels/:id
 */
const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  type: z.enum(['EMAIL', 'SLACK', 'WEBHOOK', 'DISCORD', 'TEAMS', 'TELEGRAM']).optional(),
  config: z.any().optional(),
});

alerts.put('/channels/:id', async (c) => {
  try {
    const channelId = c.req.param('id');
    const { organizationId } = c.req.query();
    const body = await c.req.json();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    const validated = updateChannelSchema.parse(body);
    const channel = await alertService.updateChannel(channelId, organizationId, validated);
    
    return c.json(channel);
  } catch (error) {
    console.error('Update alert channel error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update alert channel' },
      500
    );
  }
});

/**
 * Delete an alert channel
 * DELETE /api/alerts/channels/:id
 */
alerts.delete('/channels/:id', async (c) => {
  try {
    const channelId = c.req.param('id');
    const { organizationId } = c.req.query();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    await alertService.deleteChannel(channelId, organizationId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete alert channel error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete alert channel' },
      500
    );
  }
});

/**
 * Test an alert channel
 * POST /api/alerts/channels/:id/test
 */
alerts.post('/channels/:id/test', async (c) => {
  try {
    const channelId = c.req.param('id');
    const { organizationId } = c.req.query();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    const success = await alertService.testChannel(channelId, organizationId);
    return c.json({ success });
  } catch (error) {
    console.error('Test alert channel error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to test alert channel' },
      500
    );
  }
});

// -------------------------------------------------------
// ALERT HISTORY
// -------------------------------------------------------

/**
 * Get alert history
 * GET /api/alerts/history?organizationId=xxx&ruleId=xxx&workflowId=xxx
 */
alerts.get('/history', async (c) => {
  try {
    const { organizationId, ruleId, workflowId, severity, startDate, endDate } = c.req.query();

    if (!organizationId) {
      return c.json({ error: 'organizationId is required' }, 400);
    }

    const history = await alertService.getAlertHistory(organizationId, {
      ruleId,
      workflowId,
      severity: severity as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return c.json(history);
  } catch (error) {
    console.error('Get alert history error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get alert history' },
      500
    );
  }
});

/**
 * Acknowledge an alert
 * POST /api/alerts/history/:id/acknowledge
 */
alerts.post('/history/:id/acknowledge', async (c) => {
  try {
    const alertId = c.req.param('id');
    const user = c.get('user');

    const alert = await alertService.acknowledgeAlert(alertId, user.id);
    return c.json(alert);
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to acknowledge alert' },
      500
    );
  }
});

/**
 * Trigger alert manually (for testing)
 * POST /api/alerts/trigger
 */
const triggerAlertSchema = z.object({
  ruleId: z.string(),
  workflowId: z.string().optional(),
  executionId: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']),
  message: z.string(),
  details: z.any().optional(),
});

alerts.post('/trigger', async (c) => {
  try {
    const body = await c.req.json();
    const validated = triggerAlertSchema.parse(body);

    const alert = await alertService.triggerAlert(validated);
    return c.json(alert);
  } catch (error) {
    console.error('Trigger alert error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger alert' },
      500
    );
  }
});

/**
 * Evaluate alert rules for a workflow execution (internal endpoint)
 * POST /api/alerts/evaluate
 */
const evaluateSchema = z.object({
  workflowId: z.string(),
  executionId: z.string(),
  executionData: z.object({
    status: z.string(),
    duration: z.number(),
    error: z.string().optional(),
  }),
});

alerts.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json();
    const validated = evaluateSchema.parse(body);

    await alertService.evaluateExecutionAlerts(
      validated.workflowId,
      validated.executionId,
      validated.executionData
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Evaluate alerts error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate alerts' },
      500
    );
  }
});

export default alerts;
