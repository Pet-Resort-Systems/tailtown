# Load Testing Guide

## Overview

This directory contains load tests to validate:
- Per-tenant rate limiting
- Database connection pooling
- API performance under load
- Multi-tenant isolation

## Tools

### k6 (Primary)
Modern load testing tool with JavaScript DSL.

**Install:**
```bash
brew install k6
```

### autocannon (Alternative)
Node.js HTTP benchmarking tool.

**Install:**
```bash
npm install -g autocannon
```

## Test Scenarios

### 1. Rate Limiting Tests
- **Single tenant burst**: Verify 1000 req/15min limit
- **Multi-tenant isolation**: Ensure one tenant doesn't affect others
- **Rate limit recovery**: Test behavior after limit expires

### 2. Connection Pool Tests
- **Concurrent requests**: Test connection reuse
- **Connection exhaustion**: Verify graceful handling
- **Pool recovery**: Test after high load

### 3. API Performance Tests
- **Baseline**: Measure normal performance
- **Sustained load**: 100 RPS for 5 minutes
- **Spike test**: Sudden traffic increase

## Quick Start

### Test Rate Limiting (Single Tenant)
```bash
k6 run load-tests/rate-limiting-single.js
```

### Test Rate Limiting (Multi-Tenant)
```bash
k6 run load-tests/rate-limiting-multi.js
```

### Test Connection Pooling
```bash
k6 run load-tests/connection-pool.js
```

### Test API Performance
```bash
k6 run load-tests/api-performance.js
```

## Test Against Production

**⚠️ WARNING**: Only run against production during off-peak hours with reduced load.

```bash
# Set production URL
export API_URL=http://129.212.178.244:4004

# Run with reduced load
k6 run --vus 10 --duration 1m load-tests/api-performance.js
```

## Interpreting Results

### Good Performance Indicators
- ✅ P95 response time < 200ms
- ✅ Error rate < 1%
- ✅ Rate limiting triggers at expected threshold
- ✅ No connection pool exhaustion

### Warning Signs
- ⚠️ P95 response time > 500ms
- ⚠️ Error rate > 5%
- ⚠️ Database connection errors
- ⚠️ Memory leaks (increasing over time)

## Next Steps

After load testing:
1. Review results in `load-tests/results/`
2. Adjust rate limits if needed
3. Tune connection pool size
4. Add monitoring alerts
