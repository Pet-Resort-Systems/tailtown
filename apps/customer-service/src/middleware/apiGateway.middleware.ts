import { env } from '../env.js';
/**
 * API Gateway Middleware
 *
 * Provides centralized API management features:
 * - API versioning support
 * - Request/response logging with tenant context
 * - API analytics tracking (stored in Redis)
 * - Request transformation
 */

import { type Request, type Response, type NextFunction } from 'express';
import { redisClient } from '../utils/redis.js';

// API version configuration
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2', // Reserved for future use
  CURRENT: 'v1',
};

interface ApiMetrics {
  tenantId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Track API request metrics in Redis
 */
async function trackApiMetrics(metrics: ApiMetrics): Promise<void> {
  try {
    const redis = redisClient;
    if (!redis) return;

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = new Date().getHours();

    // Increment request count for tenant
    const tenantKey = `api:metrics:${metrics.tenantId}:${date}`;
    await redis.hIncrBy(tenantKey, 'total_requests', 1);
    await redis.hIncrBy(
      tenantKey,
      `${metrics.method}:${metrics.statusCode}`,
      1
    );
    await redis.expire(tenantKey, 60 * 60 * 24 * 30); // 30 days retention

    // Track endpoint usage
    const endpointKey = `api:endpoints:${metrics.tenantId}:${date}`;
    await redis.hIncrBy(endpointKey, metrics.endpoint, 1);
    await redis.expire(endpointKey, 60 * 60 * 24 * 30);

    // Track hourly distribution
    const hourlyKey = `api:hourly:${metrics.tenantId}:${date}`;
    await redis.hIncrBy(hourlyKey, `hour:${hour}`, 1);
    await redis.expire(hourlyKey, 60 * 60 * 24 * 7); // 7 days retention

    // Track response times (for P50, P95, P99 calculations)
    const latencyKey = `api:latency:${metrics.tenantId}:${date}`;
    await redis.lPush(latencyKey, metrics.responseTime.toString());
    await redis.lTrim(latencyKey, 0, 9999); // Keep last 10k samples
    await redis.expire(latencyKey, 60 * 60 * 24 * 7);

    // Track errors separately
    if (metrics.statusCode >= 400) {
      const errorKey = `api:errors:${metrics.tenantId}:${date}`;
      await redis.hIncrBy(
        errorKey,
        `${metrics.endpoint}:${metrics.statusCode}`,
        1
      );
      await redis.expire(errorKey, 60 * 60 * 24 * 30);
    }

    // Global metrics (across all tenants)
    const globalKey = `api:global:${date}`;
    await redis.hIncrBy(globalKey, 'total_requests', 1);
    await redis.expire(globalKey, 60 * 60 * 24 * 30);
  } catch (error) {
    // Don't fail the request if metrics tracking fails
    console.error('[API Gateway] Failed to track metrics:', error);
  }
}

/**
 * API Analytics Middleware
 * Tracks request metrics and stores them in Redis for analytics
 */
export function apiAnalytics() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const tenantId = (req as any).tenantId || 'unknown';
    const userId = (req as any).user?.id;

    // Capture original end function
    const originalEnd = res.end;

    // Override end to capture response
    res.end = function (this: Response, ...args: any[]) {
      const responseTime = Date.now() - startTime;

      // Track metrics asynchronously (don't block response)
      setImmediate(() => {
        trackApiMetrics({
          tenantId,
          endpoint: normalizeEndpoint(req.path),
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date().toISOString(),
          userId,
          userAgent: req.get('user-agent'),
          ip: req.ip,
        });
      });

      // Call original end
      return originalEnd.apply(this, args as any);
    };

    next();
  };
}

/**
 * Normalize endpoint for grouping (remove IDs)
 */
function normalizeEndpoint(path: string): string {
  // Remove UUIDs
  let normalized = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
  // Remove numeric IDs
  normalized = normalized.replace(/\/\d+/g, '/:id');
  // Remove query strings
  normalized = normalized.split('?')[0];
  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');
  return normalized || '/';
}

/**
 * API Version Header Middleware
 * Adds API version info to response headers
 */
export function apiVersionHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add API version headers
    res.setHeader('X-API-Version', API_VERSIONS.CURRENT);
    res.setHeader('X-API-Deprecated', 'false');

    // Check if client requested specific version
    const requestedVersion = req.get('X-API-Version') || req.query.api_version;
    if (requestedVersion && requestedVersion !== API_VERSIONS.CURRENT) {
      res.setHeader(
        'X-API-Version-Warning',
        `Requested version ${requestedVersion} not available, using ${API_VERSIONS.CURRENT}`
      );
    }

    next();
  };
}

/**
 * Request ID Middleware Enhancement
 * Ensures all requests have a correlation ID for tracing
 */
export function correlationId() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Use existing request ID or generate new one
    const requestId =
      req.get('X-Request-ID') ||
      req.get('X-Correlation-ID') ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Attach to request for downstream use
    (req as any).correlationId = requestId;

    // Add to response headers
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Correlation-ID', requestId);

    next();
  };
}

/**
 * Enhanced Request Logging
 * Logs requests with tenant and user context
 */
export function enhancedRequestLogging() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const tenantId = (req as any).tenantId || 'unknown';
    const correlationId = (req as any).correlationId || 'unknown';

    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const userId = (req as any).user?.id || 'anonymous';

      // Structured log format for easy parsing
      const logEntry = {
        timestamp: new Date().toISOString(),
        correlationId,
        tenantId,
        userId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      };

      // Log level based on status code
      if (res.statusCode >= 500) {
        console.error('[API] ERROR:', JSON.stringify(logEntry));
      } else if (res.statusCode >= 400) {
        console.warn('[API] WARN:', JSON.stringify(logEntry));
      } else if (env.NODE_ENV !== 'production' || duration > 1000) {
        // In production, only log slow requests (>1s)
        console.log('[API] INFO:', JSON.stringify(logEntry));
      }
    });

    next();
  };
}

/**
 * Get API metrics for a tenant
 */
export async function getApiMetrics(
  tenantId: string,
  date?: string
): Promise<any> {
  const redis = redisClient;
  if (!redis) {
    return { error: 'Redis not available' };
  }

  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const [metrics, endpoints, hourly, latencies, errors] = await Promise.all([
      redis.hGetAll(`api:metrics:${tenantId}:${targetDate}`),
      redis.hGetAll(`api:endpoints:${tenantId}:${targetDate}`),
      redis.hGetAll(`api:hourly:${tenantId}:${targetDate}`),
      redis.lRange(`api:latency:${tenantId}:${targetDate}`, 0, -1),
      redis.hGetAll(`api:errors:${tenantId}:${targetDate}`),
    ]);

    // Calculate latency percentiles
    const latencyNumbers = latencies.map(Number).sort((a, b) => a - b);
    const p50 = latencyNumbers[Math.floor(latencyNumbers.length * 0.5)] || 0;
    const p95 = latencyNumbers[Math.floor(latencyNumbers.length * 0.95)] || 0;
    const p99 = latencyNumbers[Math.floor(latencyNumbers.length * 0.99)] || 0;
    const avg =
      latencyNumbers.length > 0
        ? latencyNumbers.reduce((a, b) => a + b, 0) / latencyNumbers.length
        : 0;

    return {
      date: targetDate,
      tenantId,
      summary: {
        totalRequests: parseInt(metrics?.total_requests || '0'),
        avgResponseTime: Math.round(avg),
        p50ResponseTime: p50,
        p95ResponseTime: p95,
        p99ResponseTime: p99,
      },
      byMethod: {
        GET: Object.entries(metrics || {})
          .filter(([k]) => k.startsWith('GET:'))
          .reduce((acc, [, v]) => acc + parseInt(v as string), 0),
        POST: Object.entries(metrics || {})
          .filter(([k]) => k.startsWith('POST:'))
          .reduce((acc, [, v]) => acc + parseInt(v as string), 0),
        PUT: Object.entries(metrics || {})
          .filter(([k]) => k.startsWith('PUT:'))
          .reduce((acc, [, v]) => acc + parseInt(v as string), 0),
        DELETE: Object.entries(metrics || {})
          .filter(([k]) => k.startsWith('DELETE:'))
          .reduce((acc, [, v]) => acc + parseInt(v as string), 0),
      },
      topEndpoints: Object.entries(endpoints || {})
        .map(([endpoint, count]) => ({
          endpoint,
          count: parseInt(count as string),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      hourlyDistribution: hourly,
      errors: Object.entries(errors || {})
        .map(([key, count]) => {
          const [endpoint, statusCode] = key.split(':');
          return {
            endpoint,
            statusCode: parseInt(statusCode),
            count: parseInt(count as string),
          };
        })
        .sort((a, b) => b.count - a.count),
    };
  } catch (error) {
    console.error('[API Gateway] Failed to get metrics:', error);
    return { error: 'Failed to retrieve metrics' };
  }
}

/**
 * Get global API metrics (across all tenants)
 */
export async function getGlobalApiMetrics(date?: string): Promise<any> {
  const redis = redisClient;
  if (!redis) {
    return { error: 'Redis not available' };
  }

  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const global = await redis.hGetAll(`api:global:${targetDate}`);

    return {
      date: targetDate,
      totalRequests: parseInt(global?.total_requests || '0'),
    };
  } catch (error) {
    console.error('[API Gateway] Failed to get global metrics:', error);
    return { error: 'Failed to retrieve global metrics' };
  }
}
