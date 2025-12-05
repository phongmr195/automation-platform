import * as Sentry from '@sentry/react';
import { monitoringApi } from '../services/monitoringApi';

/**
 * Initialize Sentry for frontend error tracking
 * Errors will be sent to:
 * 1. Sentry (if DSN configured)
 * 2. Backend API (which forwards to Telegram)
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Initialize Sentry if DSN is provided
  if (dsn) {
    Sentry.init({
      dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE || 'development',
      
      // Before send hook - also send to backend API
      beforeSend(event, hint) {
        const error = hint.originalException as Error;
        
        if (error) {
          // Also send to backend (which will forward to Telegram)
          sendErrorToBackend(error, event).catch(err => {
            console.error('Failed to send error to backend:', err);
          });
        }
        
        return event;
      },
    });

    console.log('✅ Sentry frontend initialized');
  } else {
    console.log('⚠️  VITE_SENTRY_DSN not configured. Using backend error tracking only.');
    
    // Setup global error handlers to send to backend directly
    setupGlobalErrorHandlers();
  }
}

/**
 * Send error to backend API (which forwards to Telegram)
 */
async function sendErrorToBackend(error: Error, sentryEvent?: any) {
  try {
    await monitoringApi.logError({
      errorType: error.name || 'FrontendError',
      severity: 'ERROR',
      message: `[Frontend] ${error.message}`,
      stack: error.stack,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        sentryEventId: sentryEvent?.event_id,
        componentStack: sentryEvent?.extra?.componentStack,
      },
    });
  } catch (err) {
    console.error('Failed to send error to backend:', err);
  }
}

/**
 * Setup global error handlers (when Sentry is not configured)
 */
function setupGlobalErrorHandlers() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    
    monitoringApi.logError({
      errorType: error.name || 'UncaughtError',
      severity: 'ERROR',
      message: `[Frontend] ${error.message || event.message}`,
      stack: error.stack,
      endpoint: event.filename,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        line: event.lineno,
        column: event.colno,
      },
    }).catch(err => {
      console.error('Failed to log error:', err);
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    monitoringApi.logError({
      errorType: 'UnhandledPromiseRejection',
      severity: 'ERROR',
      message: `[Frontend] ${error?.message || String(event.reason)}`,
      stack: error?.stack,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        reason: String(event.reason),
      },
    }).catch(err => {
      console.error('Failed to log error:', err);
    });
  });

  console.log('✅ Global error handlers initialized');
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  // Send to Sentry if configured
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
  
  // Always send to backend
  sendErrorToBackend(error).catch(err => {
    console.error('Failed to capture exception:', err);
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email: string; name?: string }) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  }
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser(null);
  }
}


