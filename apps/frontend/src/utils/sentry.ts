/**
 * Sentry Error Tracking for Frontend
 *
 * Provides error tracking and performance monitoring for the React app.
 */

import * as Sentry from '@sentry/react';

// Sentry configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENABLED =
  import.meta.env.VITE_SENTRY_ENABLED !== 'false' &&
  import.meta.env.PROD;
const SENTRY_ENVIRONMENT = import.meta.env.MODE || 'development';
const SENTRY_RELEASE =
  import.meta.env.VITE_SENTRY_RELEASE || 'tailtown-frontend@1.0.0';

/**
 * Initialize Sentry error tracking
 */
export function initSentry(): void {
  if (!SENTRY_ENABLED) {
    console.info('📊 Sentry error tracking is disabled');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      release: SENTRY_RELEASE,

      // Performance Monitoring
      tracesSampleRate: 0.1, // Capture 10% of transactions

      // Session Replay (optional, can be expensive)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],

      // Error filtering
      beforeSend(event, hint) {
        // Don't send errors in development
        if (SENTRY_ENVIRONMENT === 'development') {
          return null;
        }

        // Filter out common non-critical errors
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);

          // Ignore network errors that are expected
          if (
            message.includes('Network Error') ||
            message.includes('Failed to fetch') ||
            message.includes('Load failed')
          ) {
            return null;
          }

          // Ignore ResizeObserver errors (common in React)
          if (message.includes('ResizeObserver')) {
            return null;
          }
        }

        return event;
      },

      // Add custom tags
      initialScope: {
        tags: {
          app: 'tailtown-frontend',
          version: SENTRY_RELEASE,
        },
      },
    });

    console.info('✅ Sentry error tracking initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message manually
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(
  user: { id: string; email?: string; tenantId?: string } | null
): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      tenant_id: user.tenantId,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  data?: Record<string, any>
): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

// Export Sentry for advanced usage (e.g., ErrorBoundary)
export { Sentry };
