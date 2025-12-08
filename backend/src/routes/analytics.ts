import { Hono } from 'hono';
import { analyticsService } from '../services/analyticsService';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const analytics = new Hono();

// Internal endpoint for worker to record metrics (no auth required)
analytics.post('/record', async (c) => {
  try {
    const body = await c.req.json();
    const { workflowId, organizationId, status, duration, resources } = body;

    await analyticsService.recordExecution(
      workflowId,
      organizationId,
      status,
      duration,
      resources
    );

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error recording execution metrics:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Apply auth middleware to all other routes
analytics.use('/*', authMiddleware);

// Date range schema
const dateRangeSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

/**
 * GET /analytics/dashboard
 * Get overall dashboard statistics
 */
analytics.get('/dashboard', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const { startDate, endDate } = dateRangeSchema.parse(c.req.query());

    const stats = await analyticsService.getDashboardStats(
      organizationId,
      startDate,
      endDate
    );

    return c.json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return c.json({ error: error.message || 'Failed to fetch dashboard stats' }, 500);
  }
});

/**
 * GET /analytics/execution-trends
 * Get execution trends over time
 */
analytics.get('/execution-trends', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const query = c.req.query();
    const { startDate, endDate } = dateRangeSchema.parse(query);
    const granularity = query.granularity === 'hour' ? 'hour' : 'day';

    const trends = await analyticsService.getExecutionTrends(
      organizationId,
      startDate,
      endDate,
      granularity
    );

    return c.json(trends);
  } catch (error: any) {
    console.error('Error fetching execution trends:', error);
    return c.json({ error: error.message || 'Failed to fetch execution trends' }, 500);
  }
});

/**
 * GET /analytics/workflow-performance
 * Get top performing workflows
 */
analytics.get('/workflow-performance', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const limit = parseInt(c.req.query('limit') || '10');

    const workflows = await analyticsService.getWorkflowPerformance(
      organizationId,
      limit
    );

    return c.json(workflows);
  } catch (error: any) {
    console.error('Error fetching workflow performance:', error);
    return c.json({ error: error.message || 'Failed to fetch workflow performance' }, 500);
  }
});

/**
 * GET /analytics/slowest-workflows
 * Get slowest workflows
 */
analytics.get('/slowest-workflows', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const limit = parseInt(c.req.query('limit') || '10');

    const workflows = await analyticsService.getSlowestWorkflows(
      organizationId,
      limit
    );

    return c.json(workflows);
  } catch (error: any) {
    console.error('Error fetching slowest workflows:', error);
    return c.json({ error: error.message || 'Failed to fetch slowest workflows' }, 500);
  }
});

/**
 * GET /analytics/failed-workflows
 * Get workflows with highest failure rates
 */
analytics.get('/failed-workflows', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const limit = parseInt(c.req.query('limit') || '10');

    const workflows = await analyticsService.getFailedWorkflows(
      organizationId,
      limit
    );

    return c.json(workflows);
  } catch (error: any) {
    console.error('Error fetching failed workflows:', error);
    return c.json({ error: error.message || 'Failed to fetch failed workflows' }, 500);
  }
});

/**
 * GET /analytics/resource-metrics
 * Get resource usage metrics
 */
analytics.get('/resource-metrics', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const { startDate, endDate } = dateRangeSchema.parse(c.req.query());

    const metrics = await analyticsService.getResourceMetrics(
      organizationId,
      startDate,
      endDate
    );

    return c.json(metrics);
  } catch (error: any) {
    console.error('Error fetching resource metrics:', error);
    return c.json({ error: error.message || 'Failed to fetch resource metrics' }, 500);
  }
});

/**
 * GET /analytics/cost-breakdown
 * Get cost breakdown by service
 */
analytics.get('/cost-breakdown', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const { startDate, endDate } = dateRangeSchema.parse(c.req.query());

    const costs = await analyticsService.getCostBreakdown(
      organizationId,
      startDate,
      endDate
    );

    return c.json(costs);
  } catch (error: any) {
    console.error('Error fetching cost breakdown:', error);
    return c.json({ error: error.message || 'Failed to fetch cost breakdown' }, 500);
  }
});

/**
 * POST /analytics/budget
 * Set budget limit for organization
 */
analytics.post('/budget', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const body = await c.req.json();
    const organizationId = body.organizationId || c.req.query('organizationId') || undefined;
    if (!organizationId) {
      return c.json({ error: 'Organization ID required' }, 400);
    }
    const budgetLimit = parseFloat(body.budgetLimit);

    if (isNaN(budgetLimit) || budgetLimit < 0) {
      return c.json({ error: 'Invalid budget limit' }, 400);
    }

    await analyticsService.setBudgetLimit(organizationId, budgetLimit);

    return c.json({ success: true, budgetLimit });
  } catch (error: any) {
    console.error('Error setting budget limit:', error);
    return c.json({ error: error.message || 'Failed to set budget limit' }, 500);
  }
});

/**
 * GET /analytics/workflow/:workflowId/metrics
 * Get detailed metrics for a specific workflow
 */
analytics.get('/workflow/:workflowId/metrics', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const { startDate, endDate } = dateRangeSchema.parse(c.req.query());

    // Get workflow-specific trends
    const trends = await analyticsService.getExecutionTrends(
      organizationId,
      startDate,
      endDate,
      'day'
    );

    // Get workflow metrics
    const metrics = await analyticsService.getWorkflowPerformance(organizationId, 1000);
    const workflowMetrics = metrics.find(m => m.workflowId === workflowId);

    // Get cost breakdown
    const costs = await analyticsService.getCostBreakdown(
      organizationId,
      startDate,
      endDate
    );

    return c.json({
      metrics: workflowMetrics,
      trends,
      costs,
    });
  } catch (error: any) {
    console.error('Error fetching workflow metrics:', error);
    return c.json({ error: error.message || 'Failed to fetch workflow metrics' }, 500);
  }
});

/**
 * GET /analytics/export
 * Export analytics data as CSV
 */
analytics.get('/export', async (c) => {
  try {
    const userId = (c as any).get('userId') as string;
    const organizationId = c.req.query('organizationId') || undefined;
    const { startDate, endDate } = dateRangeSchema.parse(c.req.query());
    const type = c.req.query('type') || 'executions';

    let csvData = '';

    if (type === 'executions') {
      const trends = await analyticsService.getExecutionTrends(
        organizationId,
        startDate,
        endDate,
        'day'
      );

      csvData = 'Date,Total,Successful,Failed,Success Rate\n';
      trends.forEach(t => {
        csvData += `${t.date},${t.total},${t.successful},${t.failed},${t.successRate}\n`;
      });
    } else if (type === 'workflows') {
      const workflows = await analyticsService.getWorkflowPerformance(
        organizationId,
        1000
      );

      csvData = 'Workflow ID,Workflow Name,Total Executions,Success Rate,Avg Duration,Last Execution\n';
      workflows.forEach(w => {
        csvData += `${w.workflowId},${w.workflowName},${w.totalExecutions},${w.successRate},${w.avgDuration},${w.lastExecutionAt}\n`;
      });
    } else if (type === 'costs') {
      const costs = await analyticsService.getCostBreakdown(
        organizationId,
        startDate,
        endDate
      );

      csvData = 'Service,Cost\n';
      Object.entries(costs.apiCosts).forEach(([service, cost]) => {
        csvData += `${service},${cost}\n`;
      });
      csvData += `Execution,${costs.executionCost}\n`;
      csvData += `Storage,${costs.storageCost}\n`;
      csvData += `Total,${costs.totalCost}\n`;
    }

    return c.text(csvData, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`,
    });
  } catch (error: any) {
    console.error('Error exporting analytics:', error);
    return c.json({ error: error.message || 'Failed to export analytics' }, 500);
  }
});

export default analytics;
