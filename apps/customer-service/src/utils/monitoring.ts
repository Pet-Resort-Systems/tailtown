import { env } from '../env.js';
/**
 * Monitoring and Metrics Utility
 *
 * Tracks key performance indicators and system health metrics
 */

import { type Request, type Response, type NextFunction } from 'express';

// Metrics storage
interface Metrics {
  requests: {
    total: number;
    byTenant: Map<string, number>;
    byEndpoint: Map<string, number>;
    byStatus: Map<number, number>;
  };
  rateLimits: {
    hits: number;
    byTenant: Map<string, number>;
  };
  responseTimes: {
    samples: number[];
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  errors: {
    total: number;
    byType: Map<string, number>;
    recent: Array<{ timestamp: Date; error: string; tenant?: string }>;
  };
  database: {
    queries: number;
    slowQueries: number;
    errors: number;
  };
}

export class MonitoringService {
  private metrics: Metrics;
  private readonly MAX_RESPONSE_TIME_SAMPLES = 1000;
  private readonly MAX_RECENT_ERRORS = 50;
  private percentileInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byTenant: new Map(),
        byEndpoint: new Map(),
        byStatus: new Map(),
      },
      rateLimits: {
        hits: 0,
        byTenant: new Map(),
      },
      responseTimes: {
        samples: [],
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
      },
      errors: {
        total: 0,
        byType: new Map(),
        recent: [],
      },
      database: {
        queries: 0,
        slowQueries: 0,
        errors: 0,
      },
    };

    if (env.NODE_ENV !== 'test') {
      this.percentileInterval = setInterval(
        () => this.calculatePercentiles(),
        60000
      );
    }
  }

  /**
   * Express middleware to track request metrics
   */
  requestTracker() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const tenantId = (req as any).tenantId || 'unknown';
      const endpoint = `${req.method} ${req.path}`;

      // Track request
      this.metrics.requests.total++;
      this.incrementMap(this.metrics.requests.byTenant, tenantId);
      this.incrementMap(this.metrics.requests.byEndpoint, endpoint);

      // Track response
      res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Track response time
        this.recordResponseTime(duration);

        // Track status code
        this.incrementMap(this.metrics.requests.byStatus, res.statusCode);

        // Track rate limit hits
        if (res.statusCode === 429) {
          this.recordRateLimitHit(tenantId);
        }

        // Track errors
        if (res.statusCode >= 400) {
          this.recordError(`HTTP ${res.statusCode}`, tenantId);
        }
      });

      next();
    };
  }

  /**
   * Record response time
   */
  private recordResponseTime(duration: number) {
    this.metrics.responseTimes.samples.push(duration);

    // Keep only last N samples
    if (
      this.metrics.responseTimes.samples.length > this.MAX_RESPONSE_TIME_SAMPLES
    ) {
      this.metrics.responseTimes.samples.shift();
    }
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(tenantId: string) {
    this.metrics.rateLimits.hits++;
    this.incrementMap(this.metrics.rateLimits.byTenant, tenantId);

    console.warn(`[MONITORING] Rate limit hit for tenant: ${tenantId}`);
  }

  /**
   * Record error
   */
  recordError(error: string, tenantId?: string) {
    this.metrics.errors.total++;
    this.incrementMap(this.metrics.errors.byType, error);

    this.metrics.errors.recent.push({
      timestamp: new Date(),
      error,
      tenant: tenantId,
    });

    // Keep only last N errors
    if (this.metrics.errors.recent.length > this.MAX_RECENT_ERRORS) {
      this.metrics.errors.recent.shift();
    }
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(duration: number) {
    this.metrics.database.queries++;

    // Track slow queries (>100ms)
    if (duration > 100) {
      this.metrics.database.slowQueries++;
      console.warn(`[MONITORING] Slow query detected: ${duration}ms`);
    }
  }

  /**
   * Record database error
   */
  recordDatabaseError(error: Error) {
    this.metrics.database.errors++;
    this.recordError(`DB: ${error.message}`);
  }

  /**
   * Calculate response time percentiles
   */
  private calculatePercentiles() {
    const samples = [...this.metrics.responseTimes.samples].sort(
      (a, b) => a - b
    );

    if (samples.length === 0) return;

    const p50Index = Math.floor(samples.length * 0.5);
    const p95Index = Math.floor(samples.length * 0.95);
    const p99Index = Math.floor(samples.length * 0.99);

    this.metrics.responseTimes.p50 = samples[p50Index] || 0;
    this.metrics.responseTimes.p95 = samples[p95Index] || 0;
    this.metrics.responseTimes.p99 = samples[p99Index] || 0;
    this.metrics.responseTimes.avg =
      samples.reduce((a, b) => a + b, 0) / samples.length;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      requests: {
        total: this.metrics.requests.total,
        byTenant: Object.fromEntries(this.metrics.requests.byTenant),
        byEndpoint: Object.fromEntries(this.metrics.requests.byEndpoint),
        byStatus: Object.fromEntries(this.metrics.requests.byStatus),
      },
      rateLimits: {
        hits: this.metrics.rateLimits.hits,
        byTenant: Object.fromEntries(this.metrics.rateLimits.byTenant),
      },
      responseTimes: {
        p50: Math.round(this.metrics.responseTimes.p50),
        p95: Math.round(this.metrics.responseTimes.p95),
        p99: Math.round(this.metrics.responseTimes.p99),
        avg: Math.round(this.metrics.responseTimes.avg),
        samples: this.metrics.responseTimes.samples.length,
      },
      errors: {
        total: this.metrics.errors.total,
        byType: Object.fromEntries(this.metrics.errors.byType),
        recent: this.metrics.errors.recent.slice(-10), // Last 10 errors
      },
      database: {
        queries: this.metrics.database.queries,
        slowQueries: this.metrics.database.slowQueries,
        errors: this.metrics.database.errors,
      },
      health: this.getHealthStatus(),
    };
  }

  /**
   * Get health status
   */
  private getHealthStatus() {
    const errorRate =
      this.metrics.errors.total / Math.max(this.metrics.requests.total, 1);
    const p95 = this.metrics.responseTimes.p95;
    const slowQueryRate =
      this.metrics.database.slowQueries /
      Math.max(this.metrics.database.queries, 1);

    const issues = [];

    if (errorRate > 0.05) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
    }

    if (p95 > 1000) {
      issues.push(`Slow response times: P95 ${p95}ms`);
    }

    if (slowQueryRate > 0.1) {
      issues.push(`High slow query rate: ${(slowQueryRate * 100).toFixed(2)}%`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
    };
  }

  /**
   * Check if alerts should be triggered
   */
  checkAlerts(): Array<{
    type: string;
    message: string;
    severity: 'warning' | 'critical';
  }> {
    const alerts = [];

    // High error rate
    const errorRate =
      this.metrics.errors.total / Math.max(this.metrics.requests.total, 1);
    if (errorRate > 0.1) {
      alerts.push({
        type: 'high_error_rate',
        message: `Error rate is ${(errorRate * 100).toFixed(
          2
        )}% (threshold: 10%)`,
        severity: 'critical' as const,
      });
    } else if (errorRate > 0.05) {
      alerts.push({
        type: 'elevated_error_rate',
        message: `Error rate is ${(errorRate * 100).toFixed(
          2
        )}% (threshold: 5%)`,
        severity: 'warning' as const,
      });
    }

    // Slow response times
    if (this.metrics.responseTimes.p95 > 1000) {
      alerts.push({
        type: 'slow_response_times',
        message: `P95 response time is ${this.metrics.responseTimes.p95}ms (threshold: 1000ms)`,
        severity: 'warning' as const,
      });
    }

    // High rate limit hits
    const rateLimitRate =
      this.metrics.rateLimits.hits / Math.max(this.metrics.requests.total, 1);
    if (rateLimitRate > 0.2) {
      alerts.push({
        type: 'high_rate_limit_hits',
        message: `${(rateLimitRate * 100).toFixed(
          2
        )}% of requests are rate limited`,
        severity: 'warning' as const,
      });
    }

    // Database issues
    const slowQueryRate =
      this.metrics.database.slowQueries /
      Math.max(this.metrics.database.queries, 1);
    if (slowQueryRate > 0.1) {
      alerts.push({
        type: 'slow_queries',
        message: `${(slowQueryRate * 100).toFixed(
          2
        )}% of queries are slow (>100ms)`,
        severity: 'warning' as const,
      });
    }

    return alerts;
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byTenant: new Map(),
        byEndpoint: new Map(),
        byStatus: new Map(),
      },
      rateLimits: {
        hits: 0,
        byTenant: new Map(),
      },
      responseTimes: {
        samples: [],
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
      },
      errors: {
        total: 0,
        byType: new Map(),
        recent: [],
      },
      database: {
        queries: 0,
        slowQueries: 0,
        errors: 0,
      },
    };
  }

  /**
   * Helper to increment map value
   */
  private incrementMap<K>(map: Map<K, number>, key: K) {
    map.set(key, (map.get(key) || 0) + 1);
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();
