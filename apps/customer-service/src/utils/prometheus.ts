/**
 * Prometheus Metrics Utility
 *
 * Exports metrics in Prometheus format for scraping.
 * Compatible with Prometheus + Grafana monitoring stack.
 */

import { Request, Response, NextFunction } from "express";
import os from "os";

// Service start time for uptime calculation
const SERVICE_START_TIME = Date.now();

// Metric types
interface Counter {
  value: number;
  labels: Map<string, number>;
}

interface Histogram {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

interface Gauge {
  value: number;
}

// Prometheus metrics storage
class PrometheusMetrics {
  // Counters
  private httpRequestsTotal: Counter = { value: 0, labels: new Map() };
  private httpRequestDuration: Map<string, Histogram> = new Map();
  private httpRequestErrors: Counter = { value: 0, labels: new Map() };
  private rateLimitHits: Counter = { value: 0, labels: new Map() };
  private dbQueriesTotal: Counter = { value: 0, labels: new Map() };
  private dbQueryErrors: Counter = { value: 0, labels: new Map() };

  // Histograms
  private httpDurationBuckets = [
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
  ];
  private dbDurationBuckets = [
    0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1,
  ];

  // Gauges
  private activeConnections: Gauge = { value: 0 };
  private activeTenants: Gauge = { value: 0 };

  // Labels
  private serviceName = "customer_service";

  /**
   * Express middleware to track HTTP metrics
   */
  httpMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const method = req.method;
      const route = this.normalizeRoute(req.route?.path || req.path);
      const tenantId = (req as any).tenantId || "unknown";

      this.activeConnections.value++;

      res.on("finish", () => {
        this.activeConnections.value--;

        const duration = Number(process.hrtime.bigint() - startTime) / 1e9; // Convert to seconds
        const statusCode = res.statusCode;
        const statusClass = `${Math.floor(statusCode / 100)}xx`;

        // Increment request counter
        this.httpRequestsTotal.value++;
        const labelKey = `${method}|${route}|${statusCode}|${tenantId}`;
        this.httpRequestsTotal.labels.set(
          labelKey,
          (this.httpRequestsTotal.labels.get(labelKey) || 0) + 1
        );

        // Record duration histogram
        this.recordHttpDuration(method, route, statusCode, duration);

        // Track errors
        if (statusCode >= 400) {
          this.httpRequestErrors.value++;
          const errorKey = `${method}|${route}|${statusCode}`;
          this.httpRequestErrors.labels.set(
            errorKey,
            (this.httpRequestErrors.labels.get(errorKey) || 0) + 1
          );
        }

        // Track rate limits
        if (statusCode === 429) {
          this.rateLimitHits.value++;
          this.rateLimitHits.labels.set(
            tenantId,
            (this.rateLimitHits.labels.get(tenantId) || 0) + 1
          );
        }
      });

      next();
    };
  }

  /**
   * Record HTTP request duration in histogram buckets
   */
  private recordHttpDuration(
    method: string,
    route: string,
    status: number,
    duration: number
  ) {
    const key = `${method}|${route}|${status}`;

    if (!this.httpRequestDuration.has(key)) {
      this.httpRequestDuration.set(key, {
        count: 0,
        sum: 0,
        buckets: new Map(this.httpDurationBuckets.map((b) => [b, 0])),
      });
    }

    const histogram = this.httpRequestDuration.get(key)!;
    histogram.count++;
    histogram.sum += duration;

    // Increment bucket counts
    for (const bucket of this.httpDurationBuckets) {
      if (duration <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  /**
   * Record database query
   */
  recordDbQuery(duration: number, operation: string, success: boolean) {
    this.dbQueriesTotal.value++;
    const key = `${operation}|${success ? "success" : "error"}`;
    this.dbQueriesTotal.labels.set(
      key,
      (this.dbQueriesTotal.labels.get(key) || 0) + 1
    );

    if (!success) {
      this.dbQueryErrors.value++;
    }
  }

  /**
   * Set active tenants gauge
   */
  setActiveTenants(count: number) {
    this.activeTenants.value = count;
  }

  /**
   * Normalize route path for consistent labeling
   */
  private normalizeRoute(path: string): string {
    // Replace UUIDs and IDs with placeholders
    return (
      path
        .replace(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          ":id"
        )
        .replace(/\/\d+/g, "/:id")
        .replace(/\/$/, "") || "/"
    );
  }

  /**
   * Generate Prometheus-format metrics output
   */
  generateMetrics(): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    // System metrics
    lines.push("# HELP process_uptime_seconds Process uptime in seconds");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(
      `process_uptime_seconds{service="${this.serviceName}"} ${
        (Date.now() - SERVICE_START_TIME) / 1000
      }`
    );

    lines.push("# HELP process_memory_bytes Process memory usage");
    lines.push("# TYPE process_memory_bytes gauge");
    const memUsage = process.memoryUsage();
    lines.push(
      `process_memory_bytes{type="rss",service="${this.serviceName}"} ${memUsage.rss}`
    );
    lines.push(
      `process_memory_bytes{type="heapTotal",service="${this.serviceName}"} ${memUsage.heapTotal}`
    );
    lines.push(
      `process_memory_bytes{type="heapUsed",service="${this.serviceName}"} ${memUsage.heapUsed}`
    );
    lines.push(
      `process_memory_bytes{type="external",service="${this.serviceName}"} ${memUsage.external}`
    );

    lines.push("# HELP nodejs_version_info Node.js version");
    lines.push("# TYPE nodejs_version_info gauge");
    lines.push(
      `nodejs_version_info{version="${process.version}",service="${this.serviceName}"} 1`
    );

    // CPU metrics
    lines.push("# HELP system_cpu_usage_percent System CPU usage percentage");
    lines.push("# TYPE system_cpu_usage_percent gauge");
    const cpus = os.cpus();
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total) * 100;
      }, 0) / cpus.length;
    lines.push(
      `system_cpu_usage_percent{service="${
        this.serviceName
      }"} ${cpuUsage.toFixed(2)}`
    );

    // Memory metrics
    lines.push("# HELP system_memory_bytes System memory");
    lines.push("# TYPE system_memory_bytes gauge");
    lines.push(
      `system_memory_bytes{type="total",service="${
        this.serviceName
      }"} ${os.totalmem()}`
    );
    lines.push(
      `system_memory_bytes{type="free",service="${
        this.serviceName
      }"} ${os.freemem()}`
    );
    lines.push(
      `system_memory_bytes{type="used",service="${this.serviceName}"} ${
        os.totalmem() - os.freemem()
      }`
    );

    // HTTP metrics
    lines.push("# HELP http_requests_total Total HTTP requests");
    lines.push("# TYPE http_requests_total counter");
    for (const [labels, count] of this.httpRequestsTotal.labels) {
      const [method, route, status, tenant] = labels.split("|");
      lines.push(
        `http_requests_total{method="${method}",route="${route}",status="${status}",tenant="${tenant}",service="${this.serviceName}"} ${count}`
      );
    }

    lines.push("# HELP http_request_duration_seconds HTTP request duration");
    lines.push("# TYPE http_request_duration_seconds histogram");
    for (const [key, histogram] of this.httpRequestDuration) {
      const [method, route, status] = key.split("|");
      for (const [bucket, count] of histogram.buckets) {
        lines.push(
          `http_request_duration_seconds_bucket{method="${method}",route="${route}",status="${status}",le="${bucket}",service="${this.serviceName}"} ${count}`
        );
      }
      lines.push(
        `http_request_duration_seconds_bucket{method="${method}",route="${route}",status="${status}",le="+Inf",service="${this.serviceName}"} ${histogram.count}`
      );
      lines.push(
        `http_request_duration_seconds_sum{method="${method}",route="${route}",status="${status}",service="${this.serviceName}"} ${histogram.sum}`
      );
      lines.push(
        `http_request_duration_seconds_count{method="${method}",route="${route}",status="${status}",service="${this.serviceName}"} ${histogram.count}`
      );
    }

    lines.push("# HELP http_request_errors_total Total HTTP errors");
    lines.push("# TYPE http_request_errors_total counter");
    for (const [labels, count] of this.httpRequestErrors.labels) {
      const [method, route, status] = labels.split("|");
      lines.push(
        `http_request_errors_total{method="${method}",route="${route}",status="${status}",service="${this.serviceName}"} ${count}`
      );
    }

    lines.push("# HELP http_active_connections Current active connections");
    lines.push("# TYPE http_active_connections gauge");
    lines.push(
      `http_active_connections{service="${this.serviceName}"} ${this.activeConnections.value}`
    );

    // Rate limiting metrics
    lines.push("# HELP rate_limit_hits_total Total rate limit hits");
    lines.push("# TYPE rate_limit_hits_total counter");
    lines.push(
      `rate_limit_hits_total{service="${this.serviceName}"} ${this.rateLimitHits.value}`
    );
    for (const [tenant, count] of this.rateLimitHits.labels) {
      lines.push(
        `rate_limit_hits_total{tenant="${tenant}",service="${this.serviceName}"} ${count}`
      );
    }

    // Database metrics
    lines.push("# HELP db_queries_total Total database queries");
    lines.push("# TYPE db_queries_total counter");
    lines.push(
      `db_queries_total{service="${this.serviceName}"} ${this.dbQueriesTotal.value}`
    );
    for (const [labels, count] of this.dbQueriesTotal.labels) {
      const [operation, status] = labels.split("|");
      lines.push(
        `db_queries_total{operation="${operation}",status="${status}",service="${this.serviceName}"} ${count}`
      );
    }

    lines.push("# HELP db_query_errors_total Total database query errors");
    lines.push("# TYPE db_query_errors_total counter");
    lines.push(
      `db_query_errors_total{service="${this.serviceName}"} ${this.dbQueryErrors.value}`
    );

    // Business metrics
    lines.push("# HELP active_tenants_total Number of active tenants");
    lines.push("# TYPE active_tenants_total gauge");
    lines.push(
      `active_tenants_total{service="${this.serviceName}"} ${this.activeTenants.value}`
    );

    return lines.join("\n") + "\n";
  }

  /**
   * Reset all metrics (for testing)
   */
  reset() {
    this.httpRequestsTotal = { value: 0, labels: new Map() };
    this.httpRequestDuration = new Map();
    this.httpRequestErrors = { value: 0, labels: new Map() };
    this.rateLimitHits = { value: 0, labels: new Map() };
    this.dbQueriesTotal = { value: 0, labels: new Map() };
    this.dbQueryErrors = { value: 0, labels: new Map() };
    this.activeConnections = { value: 0 };
    this.activeTenants = { value: 0 };
  }
}

// Export singleton
export const prometheusMetrics = new PrometheusMetrics();
