# Load Testing Quick Start

## Install k6

```bash
brew install k6
```

## Run Tests Locally

Make sure your services are running first:
```bash
# Terminal 1: Customer service
cd services/customer && npm start

# Terminal 2: Reservation service  
cd services/reservation-service && npm start
```

Then run tests:

```bash
cd load-tests

# Test 1: Single tenant rate limiting
k6 run rate-limiting-single.js

# Test 2: Multi-tenant isolation
k6 run rate-limiting-multi.js

# Test 3: Connection pool stress test
k6 run connection-pool.js
```

## Results

Results are saved to `load-tests/results/` as JSON files.

## What to Look For

✅ **Good Signs:**
- P95 response time < 500ms
- Error rate < 1%
- Rate limits trigger at ~1000 requests
- No database connection errors

❌ **Warning Signs:**
- High error rates (>5%)
- Slow response times (P95 > 1s)
- Database connection pool exhaustion
- One tenant affecting another

## Next Steps

1. Review results JSON files
2. Adjust rate limits in code if needed
3. Tune connection pool size in DATABASE_URL
4. Add monitoring alerts for production
