# Tenant Isolation Quick Reference

## 🚀 Quick Start

```bash
# Run tenant isolation tests
cd services/customer
npm test -- tenant-isolation-comprehensive

# Run with coverage
npm test -- tenant-isolation --coverage
```

## ✅ Checklist for New Endpoints

When creating a new tenant-scoped endpoint:

- [ ] Import `TenantRequest` type
- [ ] Use `req.tenantId` in WHERE clause
- [ ] Add tenant filtering to all queries
- [ ] Write tenant isolation tests
- [ ] Verify no cross-tenant access possible

## 📝 Code Templates

### Controller Template
```typescript
import { Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../config/prisma';

export const getAll = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!; // Get from middleware
    
    const items = await prisma.model.findMany({
      where: { tenantId }, // ALWAYS filter by tenant
    });
    
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    const item = await prisma.model.findFirst({
      where: { 
        id, 
        tenantId // CRITICAL: Include tenant filter
      },
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ data: item });
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    // Verify ownership before update
    const existing = await prisma.model.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const updated = await prisma.model.update({
      where: { id },
      data: req.body,
    });
    
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};
```

### Test Template
```typescript
describe('YourEndpoint Tenant Isolation', () => {
  test('returns only tenant-specific data', async () => {
    const response = await request(app)
      .get('/api/your-endpoint')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-tenant-id', tenantAId);

    expect(response.status).toBe(200);
    
    // Verify all items belong to tenant A
    response.body.data.forEach((item: any) => {
      expect(item.tenantId).toBe(tenantAId);
    });
  });

  test('cannot access other tenant data by ID', async () => {
    const response = await request(app)
      .get(`/api/your-endpoint/${tenantBItemId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-tenant-id', tenantAId);

    expect(response.status).toBe(404);
  });

  test('cannot update other tenant data', async () => {
    const response = await request(app)
      .put(`/api/your-endpoint/${tenantBItemId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-tenant-id', tenantAId)
      .send({ name: 'Hacked' });

    expect(response.status).toBe(404);
  });
});
```

### Schema Template
```prisma
model YourModel {
  id        String   @id @default(uuid())
  tenantId  String   // REQUIRED for all tenant-scoped models
  name      String
  email     String
  // ... other fields
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Composite unique constraints (per-tenant uniqueness)
  @@unique([tenantId, email])
  
  // Tenant-filtered indexes (for performance)
  @@index([tenantId, name])
  @@index([tenantId, createdAt])
  
  @@map("your_table_name")
}
```

## ❌ Common Mistakes

### Mistake 1: Missing tenantId in WHERE
```typescript
// ❌ WRONG - No tenant filter
const customer = await prisma.customer.findUnique({
  where: { id: customerId }
});

// ✅ CORRECT - Include tenant filter
const customer = await prisma.customer.findFirst({
  where: { 
    id: customerId,
    tenantId: req.tenantId 
  }
});
```

### Mistake 2: Using findUnique with tenantId
```typescript
// ❌ WRONG - findUnique only works with unique fields
const customer = await prisma.customer.findUnique({
  where: { id: customerId, tenantId: req.tenantId }
});

// ✅ CORRECT - Use findFirst for composite filters
const customer = await prisma.customer.findFirst({
  where: { id: customerId, tenantId: req.tenantId }
});
```

### Mistake 3: Global unique constraints
```prisma
// ❌ WRONG - Email unique across all tenants
model Customer {
  email String @unique
}

// ✅ CORRECT - Email unique per tenant
model Customer {
  tenantId String
  email    String
  @@unique([tenantId, email])
}
```

### Mistake 4: Forgetting tenant filter in updates
```typescript
// ❌ WRONG - No tenant verification
const updated = await prisma.customer.update({
  where: { id: customerId },
  data: req.body
});

// ✅ CORRECT - Verify tenant ownership first
const existing = await prisma.customer.findFirst({
  where: { id: customerId, tenantId: req.tenantId }
});
if (!existing) throw new Error('Not found');

const updated = await prisma.customer.update({
  where: { id: customerId },
  data: req.body
});
```

## 🔍 Debugging

### Check tenant context
```typescript
console.log('Tenant ID:', req.tenantId);
console.log('Tenant:', req.tenant);
```

### Verify database queries
```typescript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Test tenant isolation manually
```bash
# Get data for tenant A
curl -H "x-tenant-id: tenant-a-uuid" \
     -H "Authorization: Bearer $TOKEN_A" \
     http://localhost:4004/api/customers

# Try to access tenant B data with tenant A token
curl -H "x-tenant-id: tenant-a-uuid" \
     -H "Authorization: Bearer $TOKEN_A" \
     http://localhost:4004/api/customers/$TENANT_B_CUSTOMER_ID
# Should return 404
```

## 📊 Test Coverage

### Required Coverage
- Middleware: >90%
- Controllers: >80%
- Database queries: 100%

### Check coverage
```bash
npm test -- tenant-isolation --coverage
```

## 🚨 Security Rules

### ALWAYS
- ✅ Filter by tenantId in ALL queries
- ✅ Verify tenant ownership before updates/deletes
- ✅ Use composite unique constraints
- ✅ Test cross-tenant access prevention

### NEVER
- ❌ Trust client-provided tenant ID without validation
- ❌ Use global unique constraints for tenant-scoped data
- ❌ Skip tenant filtering in any query
- ❌ Allow cross-tenant data access

## 📚 Resources

- **Full Guide:** [TENANT-ISOLATION-TESTING.md](./TENANT-ISOLATION-TESTING.md)
- **Implementation Summary:** [TENANT-ISOLATION-IMPLEMENTATION-SUMMARY.md](./TENANT-ISOLATION-IMPLEMENTATION-SUMMARY.md)
- **Test Suite:** `services/customer/src/__tests__/integration/tenant-isolation-comprehensive.test.ts`
- **Middleware:** `services/customer/src/middleware/tenant.middleware.ts`

## 🆘 Help

### Tests failing?
1. Check DATABASE_URL is set
2. Run `npx prisma generate`
3. Run `npx prisma db push`
4. Check PostgreSQL is running

### Cross-tenant access detected?
1. Review controller code
2. Verify tenantId in WHERE clause
3. Check middleware is applied
4. Run tenant isolation tests

### Need help?
- Check documentation
- Review existing controllers
- Run tests for examples
- Ask team for code review
