/**
 * Sentry Error Tracking Configuration
 *
 * Provides error tracking and performance monitoring for production.
 *
 * Features:
 * - Automatic error capture
 * - Performance monitoring
 * - User context tracking
 * - Custom tags for filtering
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from '../env.js';

// Sentry configuration
const SENTRY_DSN = env.CUSTOMER_SENTRY_DSN;
const SENTRY_ENABLED =
  env.SENTRY_ENABLED !== 'false' &&
  env.NODE_ENV === 'production';
const SENTRY_ENVIRONMENT = env.NODE_ENV || 'development';
const SENTRY_RELEASE = env.SENTRY_RELEASE || 'customer-service@1.0.0';

/**
 * Initialize Sentry error tracking
 */
export function initSentry(): void {
  if (!SENTRY_ENABLED) {
    console.log('📊 Sentry error tracking is disabled');
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
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring

      // Profiling
      profilesSampleRate: 0.1, // Capture 10% of transactions for profiling
      integrations: [nodeProfilingIntegration() as any],

      // Error filtering
      beforeSend(event, hint) {
        // Don't send errors in development
        if (SENTRY_ENVIRONMENT === 'development') {
          return null;
        }

        // Filter out specific errors
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);

          // Ignore common non-critical errors
          if (
            message.includes('ECONNREFUSED') ||
            message.includes('ETIMEDOUT') ||
            message.includes('socket hang up')
          ) {
            return null;
          }
        }

        return event;
      },

      // Add custom tags
      initialScope: {
        tags: {
          service: 'customer-service',
          version: SENTRY_RELEASE,
        },
      },
    });

    console.log('✅ Sentry error tracking initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an exception manually
 * @param error - Error to capture
 * @param context - Additional context
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
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
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
 * @param user - User information
 */
export function setUser(user: {
  id: string;
  email?: string;
  tenantId?: string;
}): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    tenant_id: user.tenantId,
  });
}

/**
 * Add breadcrumb for debugging
 * @param message - Breadcrumb message
 * @param category - Category
 * @param data - Additional data
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

/**
 * Start a new span for performance monitoring
 * @param name - Span name
 * @param op - Operation type
 */
export function startSpan(name: string, op: string = 'http.server'): any {
  if (!SENTRY_ENABLED) {
    return null;
  }

  return Sentry.startSpan(
    {
      name,
      op,
    },
    () => {
      // Span callback
    }
  );
}

// Export Sentry for advanced usage
export { Sentry };
