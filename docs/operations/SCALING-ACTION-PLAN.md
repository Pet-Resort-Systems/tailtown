# Tailtown Scaling Action Plan
**Created**: November 20, 2025  
**Target**: Support 100+ tenants by Q2 2026

## 🎯 Quick Wins (This Week - 8 hours total)

### 1. Remove Console.log Statements (2 hours)
**Impact**: Security, Performance, Compliance

```bash
# Find all console.log
grep -r "console.log" services/*/src --include="*.ts"

# Replace with proper logging
npm install winston
```

**Implementation**:
```typescript
// services/shared/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

**Files to Update**:
- `services/customer/src/controllers/customer.controller.ts`
- `services/customer/src/controllers/staff.controller.ts`
- All other controllers

---

### 2. Add Database Indexes (2 hours)
**Impact**: 50-80% query performance improvement

```prisma
// services/customer/prisma/schema.prisma

model Reservation {
  // Add these indexes
  @@index([tenantId, checkInDate])
  @@index([tenantId, checkOutDate])
  @@index([tenantId, status])
  @@index([tenantId, customerId])
}

model Invoice {
  @@index([tenantId, status])
  @@index([tenantId, issueDate])
  @@index([tenantId, customerId])
}

model Pet {
  @@index([tenantId, customerId])
  @@index([tenantId, isActive])
}
```

**Deploy**:
```bash
cd services/customer
npx prisma migrate dev --name add_performance_indexes
npx prisma migrate deploy
```

---

### 3. Configure Connection Pooling (1 hour)
**Impact**: Better resource utilization

```typescript
// services/customer/src/config/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pool configuration via DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

**Update .env**:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10&connect_timeout=5"
```

---

### 4. Add Request ID Tracking (1 hour)
**Impact**: Better debugging and monitoring

```typescript
// services/customer/src/middleware/requestId.middleware.ts
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

// Add to app.ts
app.use(requestIdMiddleware);
```

---

### 5. Environment-based Logging (2 hours)
**Impact**: Cleaner logs, better performance

```typescript
// Update all controllers
import { logger } from '../shared/logger';

// Instead of console.log
logger.info('Customer created', { 
  customerId: customer.id,
  tenantId: req.tenantId,
  requestId: req.id
});

logger.error('Failed to create customer', {
  error: error.message,
  tenantId: req.tenantId,
  requestId: req.id
});
```

---

## 🚀 High Impact (This Month - 40 hours total)

### 6. Implement Redis Caching (8 hours)
**Impact**: 80% reduction in database load

**Setup**:
```bash
# Install Redis
brew install redis  # macOS
sudo apt-get install redis  # Ubuntu

# Start Redis
redis-server

# Install client
npm install ioredis
```

**Implementation**:
```typescript
// services/shared/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const cache = new CacheService();
```

**Use in Middleware**:
```typescript
// Tenant middleware with caching
const cacheKey = `tenant:${subdomain}`;
let tenant = await cache.get(cacheKey);

if (!tenant) {
  tenant = await prisma.tenant.findUnique({ where: { subdomain } });
  if (tenant) {
    await cache.set(cacheKey, tenant, 3600); // 1 hour
  }
}
```

---

### 7. Per-Tenant Rate Limiting (4 hours)
**Impact**: Prevent tenant abuse

```typescript
// services/customer/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

export const tenantRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    const tier = req.tenant?.subscriptionTier || 'FREE';
    return {
      FREE: 100,
      BASIC: 500,
      PRO: 1000,
      ENTERPRISE: 5000,
    }[tier];
  },
  keyGenerator: (req) => `tenant:${req.tenantId}`,
  message: 'Too many requests from this tenant',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to routes
app.use('/api', tenantRateLimiter);
```

---

### 8. Implement Proper Migrations (4 hours)
**Impact**: Safe schema changes

```bash
# Stop using db push
# Start using migrations

# Create migration
npx prisma migrate dev --name descriptive_name

# Deploy to production
npx prisma migrate deploy

# Rollback if needed
npx prisma migrate resolve --rolled-back migration_name
```

**Update deploy script**:
```bash
# deploy.sh
npm run build
npx prisma migrate deploy  # Instead of db push
pm2 reload ecosystem.config.js
```

---

### 9. Add Health Check Endpoints (4 hours)
**Impact**: Better monitoring

```typescript
// services/customer/src/routes/health.ts
import express from 'express';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
```

---

### 10. Optimize Prisma Queries (8 hours)
**Impact**: Faster response times

**Find N+1 queries**:
```typescript
// BAD
const customers = await prisma.customer.findMany({ where: { tenantId } });
for (const customer of customers) {
  customer.pets = await prisma.pet.findMany({ 
    where: { customerId: customer.id } 
  });
}

// GOOD
const customers = await prisma.customer.findMany({
  where: { tenantId },
  include: {
    pets: true,
    reservations: {
      where: { status: 'ACTIVE' },
      take: 5,
    },
  },
});
```

**Add select statements**:
```typescript
// Only fetch needed fields
const customers = await prisma.customer.findMany({
  where: { tenantId },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    // Don't fetch notes, documents, etc. if not needed
  },
});
```

---

### 11. Add Monitoring (8 hours)
**Impact**: Proactive issue detection

```bash
npm install @sentry/node
```

```typescript
// services/customer/src/config/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Add to app.ts
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

### 12. Database Backup Automation (4 hours)
**Impact**: Data safety

```bash
#!/bin/bash
# scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="tailtown_production"

pg_dump $DB_NAME | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp "$BACKUP_DIR/backup_$DATE.sql.gz" s3://tailtown-backups/
```

**Cron job**:
```bash
# Run daily at 2 AM
0 2 * * * /opt/tailtown/scripts/backup-database.sh
```

---

## 📊 Success Metrics

### Week 1:
- [ ] Zero console.log in production code
- [ ] All critical queries have indexes
- [ ] Connection pooling configured
- [ ] Request ID tracking implemented

### Month 1:
- [ ] Redis caching operational
- [ ] Per-tenant rate limiting active
- [ ] Proper migrations in use
- [ ] Health checks responding
- [ ] Monitoring dashboard live

### Performance Targets:
- API response time: <100ms (p95)
- Database query time: <20ms (p95)
- Cache hit rate: >80%
- Error rate: <0.1%

---

## 💡 Quick Reference

### Development Workflow:
```bash
# Start with caching
npm run dev:start

# Check health
curl http://localhost:4004/health

# Monitor logs
pm2 logs customer-service

# Check cache stats
redis-cli info stats
```

### Production Deployment:
```bash
# 1. Run migrations
npx prisma migrate deploy

# 2. Build services
npm run build

# 3. Reload PM2
pm2 reload ecosystem.config.js

# 4. Verify health
curl https://api.canicloud.com/health
```

---

## 🎯 Next Steps

1. **This Week**: Implement quick wins (8 hours)
2. **This Month**: High impact changes (40 hours)
3. **This Quarter**: Service separation and scaling prep

**Total Investment**: ~50 hours over next month  
**Expected ROI**: Support 100+ tenants without infrastructure changes
