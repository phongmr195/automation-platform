import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  HealthCheckService,
  UptimeMonitoringService,
  PerformanceMetricsService,
  ErrorTrackingService,
  APMService,
} from '../services/monitoringService';
import { MetricType, AlertSeverity } from '@prisma/client';
import { db } from '../lib/prisma';
import { sentryTelegramService } from '../services/sentryTelegramService';

const app = new Hono();

// -------------------------------------------------------
// HEALTH CHECK ENDPOINTS
// -------------------------------------------------------

/**
 * GET /health
 * Get overall system health (public endpoint)
 */
app.get('/health', async (c) => {
  try {
    const health = await HealthCheckService.getSystemHealth();
    
    return c.json({
      success: true,
      data: health,
    }, health.status === 'HEALTHY' ? 200 : health.status === 'DEGRADED' ? 207 : 503);
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /health/:component
 * Get health for a specific component
 */
app.get('/health/:component', authMiddleware, async (c) => {
  try {
    const component = c.req.param('component');
    const { startDate, endDate } = c.req.query();

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const history = await HealthCheckService.getHealthHistory(component, start, end);

    return c.json({
      success: true,
      data: {
        component,
        history,
        stats: {
          total: history.length,
          healthy: history.filter(h => h.status === 'HEALTHY').length,
          degraded: history.filter(h => h.status === 'DEGRADED').length,
          unhealthy: history.filter(h => h.status === 'UNHEALTHY').length,
        },
      },
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// -------------------------------------------------------
// UPTIME MONITORING ENDPOINTS
// -------------------------------------------------------

/**
 * POST /monitors
 * Create a new uptime monitor
 */
app.post('/monitors', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const monitor = await UptimeMonitoringService.createMonitor({
      serviceName: body.serviceName,
      serviceUrl: body.serviceUrl,
      serviceType: body.serviceType,
      checkInterval: body.checkInterval,
      timeout: body.timeout,
      organizationId,
    });

    return c.json({
      success: true,
      data: monitor,
    }, 201);
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /monitors
 * Get all uptime monitors
 */
app.get('/monitors', authMiddleware, async (c) => {
  try {
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const monitors = await UptimeMonitoringService.getAllMonitors(organizationId);

    return c.json({
      success: true,
      data: monitors,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /monitors/:id
 * Get monitor details with statistics
 */
app.get('/monitors/:id', authMiddleware, async (c) => {
  try {
    const monitorId = c.req.param('id');
    const { days = '30' } = c.req.query();

    const stats = await UptimeMonitoringService.getMonitorStats(
      monitorId,
      parseInt(days)
    );

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      404
    );
  }
});

/**
 * POST /monitors/:id/check
 * Manually trigger a health check
 */
app.post('/monitors/:id/check', authMiddleware, async (c) => {
  try {
    const monitorId = c.req.param('id');

    const result = await UptimeMonitoringService.performCheck(monitorId);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * POST /monitors/:id/incidents/:incidentId/acknowledge
 * Acknowledge an incident
 */
app.post('/monitors/:id/incidents/:incidentId/acknowledge', authMiddleware, async (c) => {
  try {
    const incidentId = c.req.param('incidentId');
    const { userId } = c.get('user');

    const incident = await db.uptimeIncident.update({
      where: { id: incidentId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    return c.json({
      success: true,
      data: incident,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * POST /monitors/:id/incidents/:incidentId/resolve
 * Resolve an incident
 */
app.post('/monitors/:id/incidents/:incidentId/resolve', authMiddleware, async (c) => {
  try {
    const incidentId = c.req.param('incidentId');
    const { userId } = c.get('user');
    const body = await c.req.json();

    const incident = await db.uptimeIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      return c.json({ success: false, error: 'Incident not found' }, 404);
    }

    const duration = Math.floor((Date.now() - incident.startedAt.getTime()) / 1000);

    const updated = await db.uptimeIncident.update({
      where: { id: incidentId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolution: body.resolution,
        duration,
      },
    });

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// -------------------------------------------------------
// PERFORMANCE METRICS ENDPOINTS
// -------------------------------------------------------

/**
 * POST /metrics
 * Record a performance metric
 */
app.post('/metrics', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const metric = await PerformanceMetricsService.recordMetric({
      metricName: body.metricName,
      metricType: body.metricType as MetricType,
      value: body.value,
      unit: body.unit,
      organizationId,
      workflowId: body.workflowId,
      executionId: body.executionId,
      nodeId: body.nodeId,
      endpoint: body.endpoint,
      tags: body.tags,
    });

    return c.json({
      success: true,
      data: metric,
    }, 201);
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /metrics/:metricName
 * Get metrics for a specific metric name
 */
app.get('/metrics/:metricName', authMiddleware, async (c) => {
  try {
    const metricName = c.req.param('metricName');
    const { startDate, endDate, workflowId, executionId, nodeId, endpoint } = c.req.query();
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const metrics = await PerformanceMetricsService.getMetrics(
      metricName,
      start,
      end,
      {
        organizationId,
        workflowId,
        executionId,
        nodeId,
        endpoint,
      }
    );

    return c.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /metrics/:metricName/aggregated
 * Get aggregated metrics
 */
app.get('/metrics/:metricName/aggregated', authMiddleware, async (c) => {
  try {
    const metricName = c.req.param('metricName');
    const { startDate, endDate, groupBy = 'hour', workflowId } = c.req.query();
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const aggregated = await PerformanceMetricsService.getAggregatedMetrics(
      metricName,
      start,
      end,
      groupBy as 'hour' | 'day' | 'week',
      {
        organizationId,
        workflowId,
      }
    );

    return c.json({
      success: true,
      data: aggregated,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// -------------------------------------------------------
// ERROR TRACKING ENDPOINTS
// -------------------------------------------------------

/**
 * POST /errors
 * Log an error (public endpoint - no auth required for frontend error tracking)
 */
app.post('/errors', async (c) => {
  try {
    const body = await c.req.json();
    
    // Try to get user/org from auth if available, but don't require it
    let userId: string | undefined;
    let organizationId: string | undefined;
    
    try {
      const user = c.get('user') as any;
      const organization = c.get('organization') as any;
      userId = user?.userId;
      organizationId = organization?.organizationId;
    } catch (e) {
      // No auth - that's ok for error logging
      console.log('Error logging without authentication');
    }

    const error = await ErrorTrackingService.logError({
      errorType: body.errorType,
      errorCode: body.errorCode,
      severity: body.severity as AlertSeverity,
      message: body.message,
      stack: body.stack,
      organizationId,
      workflowId: body.workflowId,
      executionId: body.executionId,
      nodeId: body.nodeId,
      userId,
      endpoint: body.endpoint,
      method: body.method,
      statusCode: body.statusCode,
      userAgent: c.req.header('user-agent'),
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      metadata: body.metadata,
    });

    console.log('✅ Error logged successfully, sending to Telegram...');

    return c.json({
      success: true,
      data: error,
    }, 201);
  } catch (error: any) {
    console.error('❌ Error logging error:', error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /errors
 * Get errors with filters
 */
app.get('/errors', authMiddleware, async (c) => {
  try {
    const {
      errorType,
      severity,
      resolved,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
      workflowId,
      executionId,
    } = c.req.query();
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const result = await ErrorTrackingService.getErrors({
      organizationId,
      workflowId,
      executionId,
      errorType,
      severity: severity as AlertSeverity,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return c.json({
      success: true,
      data: result.errors,
      meta: {
        total: result.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /errors/stats
 * Get error statistics
 */
app.get('/errors/stats', authMiddleware, async (c) => {
  try {
    const { days = '7' } = c.req.query();
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const stats = await ErrorTrackingService.getErrorStats(
      organizationId,
      parseInt(days)
    );

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * POST /errors/:id/resolve
 * Resolve an error
 */
app.post('/errors/:id/resolve', authMiddleware, async (c) => {
  try {
    const errorId = c.req.param('id');
    const { userId } = c.get('user');

    const error = await ErrorTrackingService.resolveError(errorId, userId);

    return c.json({
      success: true,
      data: error,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// -------------------------------------------------------
// APM TRACE ENDPOINTS
// -------------------------------------------------------

/**
 * POST /traces
 * Start a new trace
 */
app.post('/traces', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const organization = c.get('organization');
    const organizationId = organization?.organizationId;

    const trace = await APMService.startTrace({
      traceId: body.traceId,
      spanId: body.spanId,
      parentSpanId: body.parentSpanId,
      operationName: body.operationName,
      operationType: body.operationType,
      organizationId,
      workflowId: body.workflowId,
      executionId: body.executionId,
      nodeId: body.nodeId,
      tags: body.tags,
    });

    return c.json({
      success: true,
      data: trace,
    }, 201);
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * PUT /traces/:traceId/:spanId
 * End a trace span
 */
app.put('/traces/:traceId/:spanId', authMiddleware, async (c) => {
  try {
    const traceId = c.req.param('traceId');
    const spanId = c.req.param('spanId');
    const body = await c.req.json();

    const trace = await APMService.endTrace(
      traceId,
      spanId,
      body.status,
      body.error
    );

    return c.json({
      success: true,
      data: trace,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /traces/:traceId
 * Get a trace by ID
 */
app.get('/traces/:traceId', authMiddleware, async (c) => {
  try {
    const traceId = c.req.param('traceId');

    const trace = await APMService.getTrace(traceId);

    if (!trace) {
      return c.json(
        {
          success: false,
          error: 'Trace not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: trace,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /traces/execution/:executionId
 * Get traces for a workflow execution
 */
app.get('/traces/execution/:executionId', authMiddleware, async (c) => {
  try {
    const executionId = c.req.param('executionId');

    const traces = await APMService.getExecutionTraces(executionId);

    return c.json({
      success: true,
      data: traces,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// -------------------------------------------------------
// TELEGRAM INTEGRATION ENDPOINTS
// -------------------------------------------------------

/**
 * GET /telegram/test
 * Test Telegram integration
 */
app.get('/telegram/test', authMiddleware, async (c) => {
  try {
    if (!sentryTelegramService.isEnabled()) {
      return c.json({
        success: false,
        error: 'Telegram integration is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_ERROR_CHAT_ID in .env',
      }, 400);
    }

    const sent = await sentryTelegramService.sendTestNotification();

    return c.json({
      success: sent,
      message: sent 
        ? 'Test notification sent to Telegram successfully!'
        : 'Failed to send test notification',
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * GET /telegram/status
 * Check Telegram integration status and rate limits
 */
app.get('/telegram/status', authMiddleware, async (c) => {
  const enabled = sentryTelegramService.isEnabled();
  const rateLimitStatus = sentryTelegramService.getRateLimitStatus();
  
  return c.json({
    success: true,
    data: {
      enabled,
      botToken: enabled ? '***' + process.env.TELEGRAM_BOT_TOKEN?.slice(-6) : 'not set',
      chatId: enabled ? '***' + process.env.TELEGRAM_ERROR_CHAT_ID?.slice(-4) : 'not set',
      rateLimits: rateLimitStatus,
    },
  });
});

export default app;

