import { PrismaClient, HealthStatus, AlertSeverity, MetricType, TraceStatus, IncidentStatus } from '@prisma/client';
import { db } from '../lib/prisma';
import * as os from 'os';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { sentryTelegramService } from './sentryTelegramService';

// -------------------------------------------------------
// HEALTH CHECK SERVICE
// -------------------------------------------------------

export interface ComponentHealth {
  component: string;
  status: HealthStatus;
  responseTime?: number;
  uptime?: number;
  errorMessage?: string;
  metadata?: any;
}

export class HealthCheckService {
  /**
   * Check database health
   */
  static async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      await db.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        component: 'database',
        status: responseTime < 100 ? 'HEALTHY' : responseTime < 500 ? 'DEGRADED' : 'UNHEALTHY',
        responseTime,
        uptime: 100,
        metadata: {
          type: 'postgresql',
          responseTime: `${responseTime}ms`,
        },
      };
    } catch (error: any) {
      return {
        component: 'database',
        status: 'UNHEALTHY',
        responseTime: Date.now() - startTime,
        uptime: 0,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Check Redis health (if available)
   */
  static async checkRedis(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      // Try to import Redis connection
      const IORedis = require('ioredis');
      const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });

      // Ping Redis
      await redis.ping();
      const responseTime = Date.now() - startTime;

      // Get Redis info
      const info = await redis.info('server');
      const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1];
      const uptimeSeconds = info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1];

      await redis.quit();

      return {
        component: 'redis',
        status: responseTime < 50 ? 'HEALTHY' : responseTime < 200 ? 'DEGRADED' : 'UNHEALTHY',
        responseTime,
        uptime: uptimeSeconds ? parseInt(uptimeSeconds) / 3600 : undefined,
        metadata: {
          type: 'redis',
          version: redisVersion,
          responseTime: `${responseTime}ms`,
          uptime: uptimeSeconds ? `${(parseInt(uptimeSeconds) / 3600).toFixed(2)} hours` : undefined,
        },
      };
    } catch (error: any) {
      return {
        component: 'redis',
        status: 'UNHEALTHY',
        responseTime: Date.now() - startTime,
        uptime: 0,
        errorMessage: error.message,
        metadata: {
          note: 'Redis connection failed',
        },
      };
    }
  }

  /**
   * Check worker health (BullMQ)
   */
  static async checkWorker(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      // Check for recent executions as a proxy for worker health
      const recentExecutions = await db.execution.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
        },
      });

      const status: HealthStatus = recentExecutions > 0 ? 'HEALTHY' : 'DEGRADED';

      return {
        component: 'worker',
        status,
        responseTime: Date.now() - startTime,
        metadata: {
          recentExecutions,
          checkWindow: '5 minutes',
        },
      };
    } catch (error: any) {
      return {
        component: 'worker',
        status: 'UNHEALTHY',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Check API health
   */
  static async checkAPI(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      // Check system resources
      const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = ((totalMem - freeMem) / totalMem) * 100;

      const status: HealthStatus =
        cpuUsage > 90 || memUsage > 90 ? 'UNHEALTHY' :
        cpuUsage > 70 || memUsage > 70 ? 'DEGRADED' : 'HEALTHY';

      return {
        component: 'api',
        status,
        responseTime: Date.now() - startTime,
        uptime: process.uptime() / 3600, // hours
        metadata: {
          cpuUsage: `${cpuUsage.toFixed(2)}%`,
          memoryUsage: `${memUsage.toFixed(2)}%`,
          uptime: `${(process.uptime() / 3600).toFixed(2)} hours`,
          nodeVersion: process.version,
        },
      };
    } catch (error: any) {
      return {
        component: 'api',
        status: 'UNHEALTHY',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Get overall system health
   */
  static async getSystemHealth(): Promise<{
    status: HealthStatus;
    components: ComponentHealth[];
    timestamp: Date;
  }> {
    const [database, redis, worker, api] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkWorker(),
      this.checkAPI(),
    ]);

    const components = [database, redis, worker, api];

    // Determine overall status
    const hasUnhealthy = components.some(c => c.status === 'UNHEALTHY');
    const hasDegraded = components.some(c => c.status === 'DEGRADED');
    const overallStatus: HealthStatus =
      hasUnhealthy ? 'UNHEALTHY' :
      hasDegraded ? 'DEGRADED' : 'HEALTHY';

    // Save health checks to database
    try {
      await Promise.all(
        components.map(component =>
          db.systemHealth.create({
            data: {
              component: component.component,
              status: component.status,
              responseTime: component.responseTime,
              uptime: component.uptime,
              errorMessage: component.errorMessage,
              errorCount: component.errorMessage ? 1 : 0,
              metadata: component.metadata || {},
              lastCheck: new Date(),
            },
          })
        )
      );
    } catch (error) {
      console.error('Failed to save health checks to database:', error);
      // Continue without saving to DB
    }

    return {
      status: overallStatus,
      components,
      timestamp: new Date(),
    };
  }

  /**
   * Get health history for a component
   */
  static async getHealthHistory(
    component: string,
    startDate: Date,
    endDate: Date
  ) {
    return db.systemHealth.findMany({
      where: {
        component,
        lastCheck: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        lastCheck: 'desc',
      },
    });
  }
}

// -------------------------------------------------------
// UPTIME MONITORING SERVICE
// -------------------------------------------------------

export interface CreateMonitorInput {
  serviceName: string;
  serviceUrl?: string;
  serviceType: string;
  checkInterval?: number;
  timeout?: number;
  organizationId?: string;
}

export class UptimeMonitoringService {
  /**
   * Create a new uptime monitor
   */
  static async createMonitor(input: CreateMonitorInput) {
    return db.uptimeMonitor.create({
      data: {
        serviceName: input.serviceName,
        serviceUrl: input.serviceUrl,
        serviceType: input.serviceType,
        checkInterval: input.checkInterval || 60,
        timeout: input.timeout || 30,
        organizationId: input.organizationId,
      },
    });
  }

  /**
   * Perform a health check for a monitor
   */
  static async performCheck(monitorId: string): Promise<{
    status: HealthStatus;
    responseTime?: number;
    statusCode?: number;
    errorMessage?: string;
  }> {
    const monitor = await db.uptimeMonitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      throw new Error('Monitor not found');
    }

    const startTime = Date.now();
    let status: HealthStatus = 'HEALTHY';
    let responseTime: number | undefined;
    let statusCode: number | undefined;
    let errorMessage: string | undefined;

    try {
      if (monitor.serviceUrl) {
        // HTTP/HTTPS check
        const result = await this.httpCheck(monitor.serviceUrl, monitor.timeout * 1000);
        status = result.status;
        responseTime = result.responseTime;
        statusCode = result.statusCode;
        errorMessage = result.errorMessage;
      } else {
        // Internal service check based on type
        switch (monitor.serviceType) {
          case 'database':
            const dbHealth = await HealthCheckService.checkDatabase();
            status = dbHealth.status;
            responseTime = dbHealth.responseTime;
            errorMessage = dbHealth.errorMessage;
            break;
          case 'worker':
            const workerHealth = await HealthCheckService.checkWorker();
            status = workerHealth.status;
            responseTime = workerHealth.responseTime;
            errorMessage = workerHealth.errorMessage;
            break;
          case 'api':
            const apiHealth = await HealthCheckService.checkAPI();
            status = apiHealth.status;
            responseTime = apiHealth.responseTime;
            errorMessage = apiHealth.errorMessage;
            break;
          default:
            status = 'UNKNOWN';
            errorMessage = 'Unknown service type';
        }
      }
    } catch (error: any) {
      status = 'UNHEALTHY';
      errorMessage = error.message;
      responseTime = Date.now() - startTime;
    }

    // Save check result
    await db.uptimeCheck.create({
      data: {
        monitorId,
        status,
        responseTime,
        statusCode,
        errorMessage,
        checkedAt: new Date(),
      },
    });

    // Update monitor statistics
    const wasHealthy = monitor.currentStatus === 'HEALTHY';
    const isHealthy = status === 'HEALTHY';

    await db.uptimeMonitor.update({
      where: { id: monitorId },
      data: {
        currentStatus: status,
        lastCheckAt: new Date(),
        totalChecks: { increment: 1 },
        successfulChecks: isHealthy ? { increment: 1 } : undefined,
        failedChecks: !isHealthy ? { increment: 1 } : undefined,
        lastResponseTime: responseTime,
        lastSuccessAt: isHealthy ? new Date() : undefined,
        lastFailureAt: !isHealthy ? new Date() : undefined,
        lastStatusChange: wasHealthy !== isHealthy ? new Date() : undefined,
        uptimePercentage: monitor.totalChecks > 0
          ? ((monitor.successfulChecks + (isHealthy ? 1 : 0)) / (monitor.totalChecks + 1)) * 100
          : isHealthy ? 100 : 0,
        avgResponseTime: responseTime
          ? (monitor.avgResponseTime * monitor.totalChecks + responseTime) / (monitor.totalChecks + 1)
          : monitor.avgResponseTime,
      },
    });

    // Create incident if status changed from healthy to unhealthy
    if (wasHealthy && !isHealthy) {
      await this.createIncident(monitorId, errorMessage || 'Service became unhealthy');
    }

    // Resolve incident if status changed from unhealthy to healthy
    if (!wasHealthy && isHealthy) {
      await this.resolveActiveIncidents(monitorId);
    }

    return { status, responseTime, statusCode, errorMessage };
  }

  /**
   * HTTP/HTTPS health check
   */
  private static httpCheck(
    url: string,
    timeout: number
  ): Promise<{
    status: HealthStatus;
    responseTime: number;
    statusCode?: number;
    errorMessage?: string;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(url, { timeout }, (res) => {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode || 0;

        const status: HealthStatus =
          statusCode >= 200 && statusCode < 300 ? 'HEALTHY' :
          statusCode >= 300 && statusCode < 500 ? 'DEGRADED' : 'UNHEALTHY';

        resolve({ status, responseTime, statusCode });
      });

      req.on('error', (error) => {
        resolve({
          status: 'UNHEALTHY',
          responseTime: Date.now() - startTime,
          errorMessage: error.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'UNHEALTHY',
          responseTime: Date.now() - startTime,
          errorMessage: 'Request timeout',
        });
      });
    });
  }

  /**
   * Create an incident
   */
  static async createIncident(monitorId: string, description: string) {
    const monitor = await db.uptimeMonitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) return;

    return db.uptimeIncident.create({
      data: {
        monitorId,
        severity: 'ERROR',
        title: `${monitor.serviceName} is down`,
        description,
        status: 'OPEN',
        startedAt: new Date(),
        detectedAt: new Date(),
      },
    });
  }

  /**
   * Resolve active incidents
   */
  static async resolveActiveIncidents(monitorId: string) {
    const activeIncidents = await db.uptimeIncident.findMany({
      where: {
        monitorId,
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] },
      },
    });

    for (const incident of activeIncidents) {
      const duration = Math.floor((Date.now() - incident.startedAt.getTime()) / 1000);

      await db.uptimeIncident.update({
        where: { id: incident.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          duration,
        },
      });
    }
  }

  /**
   * Get monitor statistics
   */
  static async getMonitorStats(monitorId: string, days: number = 30) {
    const monitor = await db.uptimeMonitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      throw new Error('Monitor not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const checks = await db.uptimeCheck.findMany({
      where: {
        monitorId,
        checkedAt: { gte: startDate },
      },
      orderBy: { checkedAt: 'asc' },
    });

    const incidents = await db.uptimeIncident.findMany({
      where: {
        monitorId,
        startedAt: { gte: startDate },
      },
      orderBy: { startedAt: 'desc' },
    });

    return {
      monitor,
      checks,
      incidents,
      statistics: {
        totalChecks: checks.length,
        successfulChecks: checks.filter(c => c.status === 'HEALTHY').length,
        failedChecks: checks.filter(c => c.status !== 'HEALTHY').length,
        uptimePercentage: checks.length > 0
          ? (checks.filter(c => c.status === 'HEALTHY').length / checks.length) * 100
          : 100,
        avgResponseTime: checks.length > 0
          ? checks.reduce((sum, c) => sum + (c.responseTime || 0), 0) / checks.length
          : 0,
        totalIncidents: incidents.length,
        resolvedIncidents: incidents.filter(i => i.status === 'RESOLVED').length,
      },
    };
  }

  /**
   * Get all monitors
   */
  static async getAllMonitors(organizationId?: string) {
    return db.uptimeMonitor.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        incidents: {
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] } },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { serviceName: 'asc' },
    });
  }
}

// -------------------------------------------------------
// PERFORMANCE METRICS SERVICE
// -------------------------------------------------------

export interface RecordMetricInput {
  metricName: string;
  metricType: MetricType;
  value: number;
  unit: string;
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  endpoint?: string;
  tags?: any;
}

export class PerformanceMetricsService {
  /**
   * Record a performance metric
   */
  static async recordMetric(input: RecordMetricInput) {
    return db.performanceMetric.create({
      data: {
        metricName: input.metricName,
        metricType: input.metricType,
        value: input.value,
        unit: input.unit,
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        executionId: input.executionId,
        nodeId: input.nodeId,
        endpoint: input.endpoint,
        tags: input.tags || {},
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get metrics for a time range
   */
  static async getMetrics(
    metricName: string,
    startDate: Date,
    endDate: Date,
    filters?: {
      organizationId?: string;
      workflowId?: string;
      executionId?: string;
      nodeId?: string;
      endpoint?: string;
    }
  ) {
    return db.performanceMetric.findMany({
      where: {
        metricName,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        ...filters,
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get aggregated metrics
   */
  static async getAggregatedMetrics(
    metricName: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week',
    filters?: {
      organizationId?: string;
      workflowId?: string;
    }
  ) {
    const metrics = await this.getMetrics(metricName, startDate, endDate, filters);

    // Group metrics by time window
    const grouped = new Map<string, number[]>();

    for (const metric of metrics) {
      let key: string;
      const date = new Date(metric.timestamp);

      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
          break;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric.value);
    }

    // Calculate aggregations
    const result = Array.from(grouped.entries()).map(([key, values]) => {
      values.sort((a, b) => a - b);
      return {
        timestamp: key,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        p50: values[Math.floor(values.length * 0.5)],
        p95: values[Math.floor(values.length * 0.95)],
        p99: values[Math.floor(values.length * 0.99)],
      };
    });

    return result;
  }

  /**
   * Track API endpoint performance
   */
  static async trackEndpointPerformance(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    organizationId?: string
  ) {
    return this.recordMetric({
      metricName: 'api_response_time',
      metricType: 'HISTOGRAM',
      value: duration,
      unit: 'ms',
      endpoint,
      organizationId,
      tags: {
        method,
        statusCode,
        success: statusCode >= 200 && statusCode < 300,
      },
    });
  }
}

// -------------------------------------------------------
// ERROR TRACKING SERVICE
// -------------------------------------------------------

export interface LogErrorInput {
  errorType: string;
  errorCode?: string;
  severity: AlertSeverity;
  message: string;
  stack?: string;
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ipAddress?: string;
  metadata?: any;
}

export class ErrorTrackingService {
  /**
   * Log an error
   */
  static async logError(input: LogErrorInput) {
    // Generate fingerprint for error grouping
    const fingerprint = this.generateFingerprint(
      input.errorType,
      input.message,
      input.stack
    );

    // Check if error already exists
    const existingError = await db.errorLog.findFirst({
      where: {
        fingerprint,
        resolved: false,
      },
    });

    if (existingError) {
      // Update existing error
      return db.errorLog.update({
        where: { id: existingError.id },
        data: {
          occurrences: { increment: 1 },
          lastSeenAt: new Date(),
          metadata: input.metadata,
        },
      });
    }

    // Create new error log
    const errorLog = await db.errorLog.create({
      data: {
        errorType: input.errorType,
        errorCode: input.errorCode,
        severity: input.severity,
        message: input.message,
        stack: input.stack,
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        executionId: input.executionId,
        nodeId: input.nodeId,
        userId: input.userId,
        endpoint: input.endpoint,
        method: input.method,
        statusCode: input.statusCode,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        fingerprint,
        occurrences: 1,
        metadata: input.metadata || {},
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION,
      },
    });

    // Send to Telegram if enabled and severity is ERROR or CRITICAL
    if (input.severity === 'ERROR' || input.severity === 'CRITICAL') {
      sentryTelegramService.sendErrorNotification({
        errorType: input.errorType,
        message: input.message,
        severity: input.severity,
        stack: input.stack,
        workflowId: input.workflowId,
        executionId: input.executionId,
        userId: input.userId,
        environment: process.env.NODE_ENV || 'development',
        dashboardUrl: `${process.env.APP_URL || 'http://localhost:5173'}/monitoring`,
        occurrences: 1,
        firstSeenAt: errorLog.firstSeenAt,
      }).catch(err => {
        console.error('Failed to send Telegram notification:', err);
      });
    }

    return errorLog;
  }

  /**
   * Generate fingerprint for error grouping
   */
  private static generateFingerprint(
    errorType: string,
    message: string,
    stack?: string
  ): string {
    const crypto = require('crypto');
    const content = `${errorType}:${message}:${stack?.split('\n')[0] || ''}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Get errors with filters
   */
  static async getErrors(filters: {
    organizationId?: string;
    workflowId?: string;
    executionId?: string;
    errorType?: string;
    severity?: AlertSeverity;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { limit = 50, offset = 0, ...where } = filters;

    const [errors, total] = await Promise.all([
      db.errorLog.findMany({
        where: {
          ...where,
          createdAt: filters.startDate || filters.endDate ? {
            gte: filters.startDate,
            lte: filters.endDate,
          } : undefined,
        },
        orderBy: { lastSeenAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.errorLog.count({
        where: {
          ...where,
          createdAt: filters.startDate || filters.endDate ? {
            gte: filters.startDate,
            lte: filters.endDate,
          } : undefined,
        },
      }),
    ]);

    return { errors, total };
  }

  /**
   * Get error statistics
   */
  static async getErrorStats(
    organizationId?: string,
    days: number = 7
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const errors = await db.errorLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    const totalOccurrences = errors.reduce((sum, e) => sum + e.occurrences, 0);
    const errorsBySeverity = errors.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + e.occurrences;
      return acc;
    }, {} as Record<string, number>);

    const errorsByType = errors.reduce((acc, e) => {
      acc[e.errorType] = (acc[e.errorType] || 0) + e.occurrences;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: errors.length,
      totalOccurrences,
      unresolvedErrors: errors.filter(e => !e.resolved).length,
      errorsBySeverity,
      errorsByType,
      topErrors: errors
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 10)
        .map(e => ({
          id: e.id,
          errorType: e.errorType,
          message: e.message,
          severity: e.severity,
          occurrences: e.occurrences,
          firstSeenAt: e.firstSeenAt,
          lastSeenAt: e.lastSeenAt,
        })),
    };
  }

  /**
   * Resolve an error
   */
  static async resolveError(errorId: string, userId: string) {
    return db.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });
  }
}

// -------------------------------------------------------
// APM TRACE SERVICE
// -------------------------------------------------------

export interface StartTraceInput {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  tags?: any;
}

export class APMService {
  /**
   * Start a new trace span
   */
  static async startTrace(input: StartTraceInput) {
    return db.aPMTrace.create({
      data: {
        traceId: input.traceId,
        spanId: input.spanId,
        parentSpanId: input.parentSpanId,
        operationName: input.operationName,
        operationType: input.operationType,
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        executionId: input.executionId,
        nodeId: input.nodeId,
        startTime: new Date(),
        status: 'OK',
        tags: input.tags || {},
        serviceName: 'automation-platform',
        serviceVersion: process.env.APP_VERSION,
      },
    });
  }

  /**
   * End a trace span
   */
  static async endTrace(
    traceId: string,
    spanId: string,
    status: TraceStatus = 'OK',
    error?: { message: string; type: string }
  ) {
    const trace = await db.aPMTrace.findUnique({
      where: { traceId_spanId: { traceId, spanId } },
    });

    if (!trace) {
      throw new Error('Trace not found');
    }

    const endTime = new Date();
    const duration = endTime.getTime() - trace.startTime.getTime();

    return db.aPMTrace.update({
      where: { traceId_spanId: { traceId, spanId } },
      data: {
        endTime,
        duration,
        status,
        error: error ? true : false,
        errorMessage: error?.message,
        errorType: error?.type,
      },
    });
  }

  /**
   * Get trace by ID
   */
  static async getTrace(traceId: string) {
    const spans = await db.aPMTrace.findMany({
      where: { traceId },
      orderBy: { startTime: 'asc' },
    });

    if (spans.length === 0) {
      return null;
    }

    // Build trace tree
    const spanMap = new Map(spans.map(s => [s.spanId, s]));
    const rootSpans = spans.filter(s => !s.parentSpanId);

    const buildTree = (span: any) => {
      const children = spans.filter(s => s.parentSpanId === span.spanId);
      return {
        ...span,
        children: children.map(buildTree),
      };
    };

    return {
      traceId,
      rootSpans: rootSpans.map(buildTree),
      totalDuration: spans.reduce((sum, s) => sum + (s.duration || 0), 0),
      spanCount: spans.length,
      errorCount: spans.filter(s => s.error).length,
    };
  }

  /**
   * Get traces for a workflow execution
   */
  static async getExecutionTraces(executionId: string) {
    return db.aPMTrace.findMany({
      where: { executionId },
      orderBy: { startTime: 'asc' },
    });
  }
}

export default {
  HealthCheckService,
  UptimeMonitoringService,
  PerformanceMetricsService,
  ErrorTrackingService,
  APMService,
};

