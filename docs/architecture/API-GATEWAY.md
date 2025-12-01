# API Gateway Implementation

**Status**: ✅ Implemented  
**Date**: November 30, 2025  
**Version**: 1.0

## Overview

Tailtown uses a lightweight API Gateway approach built on top of the existing Nginx reverse proxy and Express middleware. This provides centralized API management without the operational overhead of Kong or Tyk.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                           │
│                    https://tailtown.canicloud.com/api            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx (API Gateway Layer)                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Rate Limiting                                           │   │
│  │  - Per-tenant: 100 req/s (tenant_api_limit)             │   │
│  │  - Per-IP: 10 req/s (api_limit)                         │   │
│  │  - Login: 5 req/15min (login_limit)                     │   │
│  │  - Booking: 2 req/s (booking_limit)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API Versioning                                          │   │
│  │  - /api/v1/* → /api/* (current)                         │   │
│  │  - /api/* → /api/* (default to v1)                      │   │
│  │  - X-API-Version header added to responses              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Request Headers                                         │   │
│  │  - X-Tenant-ID: Extracted from subdomain                │   │
│  │  - X-Real-IP: Client IP                                 │   │
│  │  - X-Forwarded-For: Proxy chain                         │   │
│  │  - X-Forwarded-Proto: https                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Middleware Layer                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  correlationId()                                         │   │
│  │  - Generates/propagates X-Request-ID                    │   │
│  │  - Enables distributed tracing                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  apiVersionHeaders()                                     │   │
│  │  - Adds X-API-Version to responses                      │   │
│  │  - Warns if deprecated version requested                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  apiAnalytics()                                          │   │
│  │  - Tracks request metrics to Redis                      │   │
│  │  - Endpoint usage, response times, errors               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  enhancedRequestLogging()                                │   │
│  │  - Structured JSON logs                                 │   │
│  │  - Tenant/user context                                  │   │
│  │  - Slow request detection                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. API Versioning

**Supported Versions:**

- `v1` (current) - All existing endpoints

**Usage:**

```bash
# Explicit version
curl https://tailtown.canicloud.com/api/v1/customers

# Default (v1)
curl https://tailtown.canicloud.com/api/customers
```

**Response Headers:**

```
X-API-Version: v1
X-API-Deprecated: false
```

### 2. Per-Tenant Rate Limiting

| Zone               | Rate    | Burst | Purpose              |
| ------------------ | ------- | ----- | -------------------- |
| `tenant_api_limit` | 100/s   | 50    | Per-tenant API calls |
| `api_limit`        | 10/s    | 20    | Per-IP fallback      |
| `login_limit`      | 5/15min | 3     | Authentication       |
| `booking_limit`    | 2/s     | 5     | Public booking       |

### 3. API Analytics

Metrics stored in Redis with 30-day retention:

**Per-Tenant Metrics:**

- Total requests by day
- Requests by HTTP method
- Requests by endpoint
- Response time percentiles (P50, P95, P99)
- Error rates by endpoint

**Access via API:**

```bash
# Tenant metrics (requires admin auth)
GET /api/metrics?date=2025-11-30

# Global metrics (requires super admin)
GET /api/metrics/global?date=2025-11-30
```

**Response Example:**

```json
{
  "status": "success",
  "data": {
    "date": "2025-11-30",
    "tenantId": "tailtown",
    "summary": {
      "totalRequests": 15420,
      "avgResponseTime": 45,
      "p50ResponseTime": 32,
      "p95ResponseTime": 120,
      "p99ResponseTime": 250
    },
    "byMethod": {
      "GET": 12000,
      "POST": 2500,
      "PUT": 800,
      "DELETE": 120
    },
    "topEndpoints": [
      { "endpoint": "/api/reservations", "count": 5000 },
      { "endpoint": "/api/customers", "count": 3200 }
    ],
    "errors": [
      { "endpoint": "/api/reservations", "statusCode": 400, "count": 15 }
    ]
  }
}
```

### 4. Request Correlation

Every request gets a unique correlation ID for distributed tracing:

**Headers:**

```
X-Request-ID: 1701388800000-abc123def
X-Correlation-ID: 1701388800000-abc123def
```

### 5. Enhanced Logging

Structured JSON logs with context:

```json
{
  "timestamp": "2025-11-30T23:30:00.000Z",
  "correlationId": "1701388800000-abc123def",
  "tenantId": "tailtown",
  "userId": "user-123",
  "method": "GET",
  "path": "/api/reservations",
  "statusCode": 200,
  "duration": 45,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

## Configuration

### Nginx Configuration

Location: `/etc/nginx/sites-available/tailtown`

Key sections:

1. Rate limiting zones (top of file)
2. Tenant ID extraction via `map`
3. API versioning with `rewrite`
4. Per-endpoint rate limits

### Express Middleware

Location: `services/customer/src/middleware/apiGateway.middleware.ts`

Exports:

- `correlationId()` - Request ID generation
- `apiVersionHeaders()` - Version headers
- `apiAnalytics()` - Redis metrics tracking
- `enhancedRequestLogging()` - Structured logging
- `getApiMetrics()` - Retrieve metrics
- `getGlobalApiMetrics()` - Global metrics

## Deployment

### 1. Update Nginx

```bash
# Copy new config
sudo cp config/nginx/tailtown.conf /etc/nginx/sites-available/tailtown

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 2. Deploy Backend

```bash
cd /opt/tailtown/services/customer
git pull origin main
npm run build
pm2 restart customer-service
```

### 3. Verify

```bash
# Check rate limiting
curl -I https://tailtown.canicloud.com/api/customers

# Check version header
curl -I https://tailtown.canicloud.com/api/v1/customers

# Check metrics endpoint
curl https://tailtown.canicloud.com/api/metrics/health
```

## Future Enhancements

1. **API v2** - When breaking changes needed
2. **Request transformation** - Modify requests/responses
3. **Circuit breaker** - Automatic service protection
4. **API key authentication** - For external integrations
5. **GraphQL gateway** - If GraphQL is added

## Related Documentation

- [NGINX-ROUTING.md](../NGINX-ROUTING.md) - Nginx configuration details
- [CURRENT-SYSTEM-ARCHITECTURE.md](../CURRENT-SYSTEM-ARCHITECTURE.md) - Overall architecture
- [DEVELOPMENT-BEST-PRACTICES.md](../DEVELOPMENT-BEST-PRACTICES.md) - Development guidelines
