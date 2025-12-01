# Tailtown Monitoring Stack

Prometheus + Grafana monitoring for Tailtown services.

## Quick Start

```bash
cd monitoring
docker-compose up -d
```

## Access

| Service    | URL                   | Credentials   |
| ---------- | --------------------- | ------------- |
| Prometheus | http://localhost:9090 | -             |
| Grafana    | http://localhost:3030 | admin / admin |

## Metrics Endpoints

Each service exposes Prometheus-compatible metrics:

- **Customer Service**: http://localhost:4004/monitoring/prometheus
- **Reservation Service**: http://localhost:4003/monitoring/prometheus

## Available Metrics

### HTTP Metrics

- `http_requests_total` - Total HTTP requests (by method, route, status, tenant)
- `http_request_duration_seconds` - Request duration histogram
- `http_request_errors_total` - Total HTTP errors
- `http_active_connections` - Current active connections

### Rate Limiting

- `rate_limit_hits_total` - Total rate limit hits (by tenant)

### Database

- `db_queries_total` - Total database queries
- `db_query_errors_total` - Database query errors

### System

- `process_uptime_seconds` - Process uptime
- `process_memory_bytes` - Memory usage (rss, heap)
- `system_cpu_usage_percent` - CPU usage
- `system_memory_bytes` - System memory (total, free, used)

### Business

- `active_tenants_total` - Number of active tenants

## Alerting Rules

Pre-configured alerts in `alert_rules.yml`:

| Alert             | Threshold | Severity |
| ----------------- | --------- | -------- |
| HighErrorRate     | >5%       | warning  |
| CriticalErrorRate | >10%      | critical |
| SlowResponseTime  | P95 >1s   | warning  |
| HighRateLimitHits | >10%      | warning  |
| ServiceDown       | down >1m  | critical |
| HighMemoryUsage   | >85% heap | warning  |
| DatabaseErrors    | >0.1/s    | critical |

## Grafana Dashboards

Pre-configured dashboards:

1. **Tailtown Overview** - High-level metrics
   - Error rate
   - P95 response time
   - Request rate
   - Active tenants
   - Memory/CPU usage

## Production Deployment

For production, update `prometheus.yml` with actual service URLs:

```yaml
scrape_configs:
  - job_name: "customer-service"
    static_configs:
      - targets: ["your-server:4004"]
```

### Security

1. Add authentication to Grafana
2. Restrict access to `/monitoring/prometheus` endpoint
3. Use HTTPS for all connections
4. Configure alertmanager for notifications

## Extending

### Add Custom Metrics

```typescript
import { prometheusMetrics } from "./utils/prometheus";

// Record database query
prometheusMetrics.recordDbQuery(durationMs, "SELECT", true);

// Set active tenants
prometheusMetrics.setActiveTenants(count);
```

### Add New Dashboards

1. Create dashboard in Grafana UI
2. Export as JSON
3. Save to `grafana/dashboards/`
4. Restart Grafana
