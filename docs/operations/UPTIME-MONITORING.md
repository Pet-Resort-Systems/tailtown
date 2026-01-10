# Uptime Monitoring Setup

## Health Check Endpoints

### Simple Health Check (for external monitoring)

```
GET /api/system/health/simple
```

- **No authentication required**
- Returns `200 OK` with `{ status: "healthy" }` when service is up
- Use this for UptimeRobot, Pingdom, or load balancer health checks

### Detailed Health Check (for dashboards)

```
GET /api/system/health
```

- **Requires authentication**
- Returns detailed metrics: database status, memory, CPU, uptime, active connections

## Setting Up External Monitoring

### Option 1: UptimeRobot (Free)

1. Create account at https://uptimerobot.com
2. Add new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://your-domain.com/api/system/health/simple`
   - **Interval**: 5 minutes
   - **Alert Contacts**: Add email/SMS notifications

### Option 2: Pingdom

1. Create account at https://www.pingdom.com
2. Add uptime check with same URL

### Option 3: AWS CloudWatch (if on AWS)

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Tailtown-Health" \
  --metric-name "HealthCheckStatus" \
  --namespace "AWS/Route53" \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold
```

## Recommended Alerts

| Alert               | Threshold              | Action      |
| ------------------- | ---------------------- | ----------- |
| Service Down        | 2 consecutive failures | SMS + Email |
| High Response Time  | > 5 seconds            | Email       |
| Database Connection | Failed                 | SMS + Email |

## Testing Health Endpoint

```bash
# Local
curl http://localhost:4004/api/system/health/simple

# Production
curl https://tailtown.canicloud.com/api/system/health/simple
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T22:00:00.000Z",
  "uptime": 86400
}
```
