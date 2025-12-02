# Monitoring & Alerts Guide

## Overview

Comprehensive monitoring system for Tailtown infrastructure:
- Real-time metrics collection
- Performance tracking
- Alert system
- Visual dashboard

## Features

### 📊 Metrics Tracked

1. **Request Metrics**
   - Total requests
   - Requests by tenant
   - Requests by endpoint
   - Requests by status code

2. **Performance Metrics**
   - Response times (P50, P95, P99, Avg)
   - Request throughput
   - Error rates

3. **Rate Limiting**
   - Rate limit hits
   - Hits by tenant
   - Rate limit percentage

4. **Database Metrics**
   - Total queries
   - Slow queries (>100ms)
   - Database errors

5. **System Health**
   - Overall status (healthy/degraded)
   - Active issues
   - Uptime

### 🚨 Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | >5% | >10% |
| P95 Response Time | >1000ms | - |
| Rate Limit Hits | >20% | - |
| Slow Queries | >10% | - |

## Endpoints

### GET /monitoring/metrics
Get all current metrics in JSON format.

**Response:**
```json
{
  "requests": {
    "total": 10000,
    "byTenant": { "tenant-a": 5000, "tenant-b": 5000 },
    "byEndpoint": { "GET /api/customers": 3000 },
    "byStatus": { "200": 9500, "429": 500 }
  },
  "rateLimits": {
    "hits": 500,
    "byTenant": { "tenant-a": 300, "tenant-b": 200 }
  },
  "responseTimes": {
    "p50": 50,
    "p95": 150,
    "p99": 300,
    "avg": 75,
    "samples": 1000
  },
  "errors": {
    "total": 50,
    "byType": { "HTTP 404": 30, "HTTP 500": 20 },
    "recent": []
  },
  "database": {
    "queries": 5000,
    "slowQueries": 50,
    "errors": 0
  },
  "health": {
    "status": "healthy",
    "issues": []
  }
}
```

### GET /monitoring/health
Get health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-08T19:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 50000000,
    "heapTotal": 20000000,
    "heapUsed": 15000000
  },
  "health": {
    "status": "healthy",
    "issues": []
  }
}
```

### GET /monitoring/alerts
Get active alerts.

**Response:**
```json
{
  "alerts": [
    {
      "type": "high_error_rate",
      "message": "Error rate is 12.50% (threshold: 10%)",
      "severity": "critical"
    }
  ],
  "count": 1,
  "timestamp": "2025-11-08T19:00:00.000Z"
}
```

### GET /monitoring/dashboard
Visual HTML dashboard with real-time metrics.

**Features:**
- System health status
- Key metrics cards
- Requests by tenant table
- Top endpoints table
- Recent errors log
- Auto-refresh every 30 seconds

## Integration

### 1. Add to Express App

```typescript
import { monitoring } from './utils/monitoring';
import monitoringRoutes from './routes/monitoring.routes';

// Add monitoring middleware
app.use(monitoring.requestTracker());

// Add monitoring routes
app.use('/monitoring', monitoringRoutes);
```

### 2. Track Database Queries

```typescript
import { monitoring } from './utils/monitoring';

// Before query
const startTime = Date.now();

// Execute query
const result = await prisma.customer.findMany();

// After query
const duration = Date.now() - startTime;
monitoring.recordDatabaseQuery(duration);
```

### 3. Track Errors

```typescript
import { monitoring } from './utils/monitoring';

try {
  // Your code
} catch (error) {
  monitoring.recordError(error.message, req.tenantId);
  throw error;
}
```

## Accessing the Dashboard

### Local Development
```
http://localhost:4004/monitoring/dashboard
```

### Production
```
http://129.212.178.244:4004/monitoring/dashboard
```

## Alert Notifications

### Email Alerts (Future Enhancement)
Configure email notifications for critical alerts:

```typescript
// In monitoring.ts
if (alerts.some(a => a.severity === 'critical')) {
  await sendEmailAlert(alerts);
}
```

### Slack Alerts (Future Enhancement)
Send alerts to Slack channel:

```typescript
// In monitoring.ts
if (alerts.length > 0) {
  await sendSlackAlert(alerts);
}
```

## Monitoring Best Practices

### 1. Regular Review
- Check dashboard daily
- Review metrics weekly
- Analyze trends monthly

### 2. Alert Response
- **Critical alerts**: Respond within 15 minutes
- **Warning alerts**: Review within 1 hour
- **Info alerts**: Review within 24 hours

### 3. Metric Analysis
- Compare current vs. historical data
- Identify patterns and anomalies
- Adjust thresholds as needed

### 4. Performance Optimization
- Investigate slow queries
- Optimize high-traffic endpoints
- Review error patterns

## Troubleshooting

### High Error Rate
1. Check recent errors in dashboard
2. Review error logs
3. Identify common error types
4. Fix root cause
5. Deploy fix
6. Monitor error rate

### Slow Response Times
1. Check P95/P99 metrics
2. Identify slow endpoints
3. Review database queries
4. Add indexes if needed
5. Optimize code
6. Monitor improvements

### High Rate Limit Hits
1. Check which tenants are affected
2. Review tenant usage patterns
3. Consider increasing limits for specific tenants
4. Communicate with affected tenants
5. Monitor after adjustments

### Database Issues
1. Check slow query count
2. Review query patterns
3. Add missing indexes
4. Optimize complex queries
5. Consider connection pool adjustments

## Metrics Export

### Prometheus Format (Future Enhancement)
Export metrics in Prometheus format:

```
GET /monitoring/metrics/prometheus
```

### JSON Export
Download metrics as JSON:

```bash
curl http://localhost:4004/monitoring/metrics > metrics.json
```

## Security

### Access Control
Monitoring endpoints should be protected in production:

```typescript
// Add authentication middleware
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Verify admin token
    const token = req.headers.authorization;
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});
```

### Rate Limiting
Monitoring endpoints are excluded from rate limiting:

```typescript
const limiter = rateLimit({
  skip: (req) => req.path.startsWith('/monitoring'),
});
```

## Next Steps

1. ✅ Monitoring system implemented
2. ⏭️ Set up email/Slack alerts
3. ⏭️ Add Prometheus export
4. ⏭️ Create historical data storage
5. ⏭️ Build trend analysis dashboard
6. ⏭️ Add custom metric tracking

## Resources

- Dashboard: `/monitoring/dashboard`
- Metrics API: `/monitoring/metrics`
- Health Check: `/monitoring/health`
- Alerts: `/monitoring/alerts`
