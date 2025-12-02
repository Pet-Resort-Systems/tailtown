# Database Connection Pooling

## Overview

Connection pooling has been implemented to improve database performance and prevent connection exhaustion.

## What Changed

### Customer Service
- Updated `services/customer/src/config/prisma.ts` with connection pooling
- Singleton pattern to prevent multiple Prisma instances
- Graceful shutdown handling
- Development logging enabled

### Configuration

Add these to your `.env` file for optimal connection pooling:

```bash
# Database Connection Pool Settings
DATABASE_URL="postgresql://user:password@host:5432/database?connection_limit=10&pool_timeout=20"

# Optional: Fine-tune pool settings
# connection_limit: Maximum number of connections (default: 10)
# pool_timeout: Seconds to wait for connection (default: 20)
```

## Benefits

✅ **Performance**: Reuses connections instead of creating new ones  
✅ **Scalability**: Handles more concurrent requests  
✅ **Reliability**: Prevents connection exhaustion  
✅ **Resource Efficiency**: Lower database server load  

## Connection Pool Sizing

**Recommended settings by environment:**

- **Development**: `connection_limit=5`
- **Staging**: `connection_limit=10`
- **Production**: `connection_limit=20-50` (depends on traffic)

**Formula**: `connections = (core_count * 2) + effective_spindle_count`

For a 4-core server with SSD: `(4 * 2) + 1 = 9` connections

## Monitoring

Check connection pool usage:

```sql
-- PostgreSQL: View active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database';

-- PostgreSQL: View connection limit
SELECT setting FROM pg_settings WHERE name = 'max_connections';
```

## Troubleshooting

### "Too many connections" error

1. Increase `connection_limit` in DATABASE_URL
2. Check for connection leaks (unclosed connections)
3. Verify graceful shutdown is working

### Slow queries

1. Enable query logging: Set `NODE_ENV=development`
2. Check Prisma logs for slow queries
3. Add database indexes if needed

## Testing

Test connection pooling under load:

```bash
# Install Apache Bench
brew install ab

# Test with 100 concurrent requests
ab -n 1000 -c 100 http://localhost:4004/api/customers
```

Monitor connection count during the test.

## Next Steps

- [ ] Update reservation service with same pooling config
- [ ] Configure production DATABASE_URL with optimal pool size
- [ ] Set up connection monitoring/alerting
- [ ] Load test to verify performance improvements

## References

- [Prisma Connection Pooling](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
