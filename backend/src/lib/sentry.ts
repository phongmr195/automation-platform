import * as Sentry from '@sentry/node';
import { ErrorTrackingService } from '../services/monitoringService';
import { AlertSeverity } from '@prisma/client';

// Try to import profiling, but make it optional
let nodeProfilingIntegration: any = null;
try {
  const profilingModule = require('@sentry/profiling-node');
  nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
} catch (error) {
  console.warn('⚠️  Sentry profiling not available. Continuing without profiling.');
}

/**
 * Initialize Sentry for error tracking
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured. Error tracking with Sentry is disabled.');
    return;
  }

  const integrations: any[] = [
    // Add HTTP integration for tracking API calls
    new Sentry.Integrations.Http({ tracing: true }),
  ];

  // Add profiling integration if available
  if (nodeProfilingIntegration) {
    integrations.push(nodeProfilingIntegration());
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',
    
    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    
    // Profiling (only if available)
    profilesSampleRate: nodeProfilingIntegration ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1') : 0,
    
    integrations,

    // Before send hook to also log to our database
    beforeSend(event, hint) {
      const error = hint.originalException as Error;
      
      // Also log to our database
      if (error) {
        ErrorTrackingService.logError({
          errorType: error.name || 'Error',
          errorCode: (error as any).code,
          severity: determineSeverity(event.level),
          message: error.message,
          stack: error.stack,
          metadata: {
            eventId: event.event_id,
            tags: event.tags,
            extra: event.extra,
          },
        }).catch(err => {
          console.error('Failed to log error to database:', err);
        });
      }

      return event;
    },
  });

  console.log('✅ Sentry initialized for error tracking');
}

/**
 * Map Sentry severity level to our AlertSeverity enum
 */
function determineSeverity(level?: Sentry.SeverityLevel): AlertSeverity {
  switch (level) {
    case 'fatal':
    case 'error':
      return 'ERROR';
    case 'warning':
      return 'WARNING';
    case 'info':
    case 'debug':
    case 'log':
    default:
      return 'INFO';
  }
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: {
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  userId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}) {
  if (context) {
    Sentry.setContext('custom', context);
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        Sentry.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        Sentry.setExtra(key, value);
      });
    }
    
    if (context.userId) {
      Sentry.setUser({ id: context.userId });
    }
  }

  Sentry.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  if (context) {
    Sentry.setContext('custom', context);
  }

  Sentry.captureMessage(message, level);
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  data?: Record<string, any>
) {
  return Sentry.startTransaction({
    name,
    op,
    data,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Flush pending events (useful before shutdown)
 */
export async function flush(timeout = 2000) {
  return Sentry.flush(timeout);
}

/**
 * Close Sentry connection
 */
export async function close(timeout = 2000) {
  return Sentry.close(timeout);
}

// Export Sentry for direct access if needed
export { Sentry };

