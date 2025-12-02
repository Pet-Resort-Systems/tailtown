# Tenant Isolation Testing Guide

## Overview

This document describes the comprehensive tenant isolation test suite that ensures proper data segregation in the multi-tenant Tailtown application.

## Test Coverage

### 1. Middleware UUID Conversion
Tests that verify the tenant middleware correctly converts subdomains to UUID tenant IDs and validates tenant context.

**Tests:**
- ✅ Converts subdomain to UUID tenant ID
- ✅ Accepts UUID tenant ID via x-tenant-id header
- ✅ Rejects invalid UUID format
- ✅ Rejects non-existent tenant UUID
- ✅ Requires tenant context for all API calls

### 2. Controller Tenant Filtering
Tests that verify all controllers properly filter data by tenant ID.

**Endpoints Tested:**
- `/api/customers` - List, Get, Create, Update, Delete
- `/api/pets` - List, Get, Create, Update, Delete
- `/api/staff` - List, Get, Create, Update, Delete

**Tests:**
- ✅ GET endpoints return only tenant-specific data
- ✅ GET by ID cannot access other tenant data
- ✅ PUT cannot update other tenant data
- ✅ DELETE cannot delete other tenant data

### 3. Cross-Tenant Data Leakage Prevention
Tests that verify no data leaks between tenants through various access patterns.

**Tests:**
- ✅ Search queries do not return other tenant data
- ✅ Pagination does not leak data across tenants
- ✅ Related data (joins) only from same tenant
- ✅ Tenant B cannot see tenant A data

### 4. Tenant Context Validation
Tests that verify proper validation of tenant context and status.

**Tests:**
- ✅ Rejects requests with inactive tenant
- ✅ Rejects requests with paused tenant
- ✅ Token tenant ID must match request tenant ID

### 5. Database Query Isolation
Tests that verify direct Prisma queries respect tenant isolation.

**Tests:**
- ✅ Direct Prisma queries respect tenant isolation
- ✅ Count queries respect tenant isolation
- ✅ Aggregate queries respect tenant isolation
- ✅ findFirst respects tenant isolation

### 6. Email Uniqueness Per Tenant
Tests that verify email uniqueness is enforced per tenant, not globally.

**Tests:**
- ✅ Allows same email across different tenants
- ✅ Prevents duplicate email within same tenant

## Running the Tests

### Locally

```bash
# Navigate to customer service
cd services/customer

# Install dependencies
npm install

# Setup test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/customer_test" npx prisma db push

# Run all tenant isolation tests
npm test -- tenant-isolation

# Run comprehensive test suite
npm test -- tenant-isolation-comprehensive

# Run with coverage
npm test -- tenant-isolation --coverage
```

### In CI/CD Pipeline

The tenant isolation tests run automatically on:
- Push to `main`, `sept25-stable`, or `develop` branches
- Pull requests to these branches
- Manual workflow dispatch

**Workflow File:** `.github/workflows/tenant-isolation-tests.yml`

## Test Architecture

### Test Data Setup

Each test suite creates:
- 2 test tenants (Tenant A and Tenant B) with proper UUIDs
- 2 staff members (one per tenant)
- 2 customers (one per tenant)
- 2 pets (one per tenant)
- JWT tokens for authentication

### Cleanup

All test data is cleaned up after tests complete, respecting foreign key constraints:
1. Pets
2. Customers
3. Staff
4. Tenants

## Key Implementation Details

### Tenant Middleware

**File:** `src/middleware/tenant.middleware.ts`

The middleware:
1. Extracts tenant context from subdomain, header, or query parameter
2. Looks up tenant by subdomain in database
3. Converts subdomain to UUID tenant ID
4. Validates tenant is active and not paused
5. Attaches `tenantId` and `tenant` object to request

### Controller Pattern

All controllers must:
1. Import `TenantRequest` type
2. Use `req.tenantId` in all database queries
3. Include `tenantId` in WHERE clauses
4. Never allow cross-tenant access

**Example:**
```typescript
export const getAllCustomers = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const tenantId = req.tenantId!;
  
  const where: any = {
    tenantId, // CRITICAL: Always filter by tenant
  };
  
  const customers = await prisma.customer.findMany({
    where,
    // ... other options
  });
};
```

### Database Schema

All tenant-scoped tables must have:
- `tenantId` field (UUID)
- Composite unique indexes including `tenantId`
- Indexes for efficient tenant-filtered queries

**Example:**
```prisma
model Customer {
  id        String @id @default(uuid())
  tenantId  String @default("dev")
  email     String
  // ... other fields
  
  @@unique([tenantId, email])
  @@index([tenantId, lastName, firstName])
}
```

## Security Considerations

### Critical Rules

1. **Never trust client-provided tenant ID without validation**
   - Always look up tenant in database
   - Verify tenant is active
   - Check tenant status

2. **Always include tenantId in WHERE clauses**
   - List queries: `where: { tenantId }`
   - Get by ID: `where: { id, tenantId }`
   - Updates: `where: { id, tenantId }`
   - Deletes: `where: { id, tenantId }`

3. **Validate JWT token tenant ID matches request tenant ID**
   - Prevents token reuse across tenants
   - Enforces proper authentication

4. **Use composite unique constraints**
   - Email uniqueness: `@@unique([tenantId, email])`
   - Prevents conflicts between tenants

## Common Pitfalls

### ❌ Incorrect: Missing tenantId filter
```typescript
const customer = await prisma.customer.findUnique({
  where: { id: customerId }
});
```

### ✅ Correct: Include tenantId filter
```typescript
const customer = await prisma.customer.findFirst({
  where: { 
    id: customerId,
    tenantId: req.tenantId 
  }
});
```

### ❌ Incorrect: Global email uniqueness
```prisma
model Customer {
  email String @unique
}
```

### ✅ Correct: Per-tenant email uniqueness
```prisma
model Customer {
  tenantId String
  email    String
  
  @@unique([tenantId, email])
}
```

## Monitoring and Alerts

### Metrics to Track

1. **Test Pass Rate**
   - Target: 100% pass rate
   - Alert if any test fails

2. **Test Execution Time**
   - Target: < 30 seconds
   - Alert if > 60 seconds

3. **Coverage**
   - Target: > 90% for tenant middleware
   - Target: > 80% for controllers

### Production Monitoring

1. **Cross-Tenant Access Attempts**
   - Log all 404 errors on tenant-scoped resources
   - Alert on patterns suggesting attempted cross-tenant access

2. **Tenant Context Failures**
   - Log all 400/403 errors from tenant middleware
   - Alert on high error rates

## Maintenance

### Adding New Endpoints

When adding new tenant-scoped endpoints:

1. **Add tenant filtering in controller**
   ```typescript
   const where = { tenantId: req.tenantId };
   ```

2. **Add tests to tenant-isolation-comprehensive.test.ts**
   - Test GET returns only tenant data
   - Test GET by ID cannot access other tenant
   - Test UPDATE cannot modify other tenant
   - Test DELETE cannot remove other tenant

3. **Update this documentation**
   - Add endpoint to "Endpoints Tested" section
   - Document any special considerations

### Updating Database Schema

When modifying tenant-scoped tables:

1. **Ensure tenantId field exists**
2. **Add/update composite unique constraints**
3. **Add/update tenant-filtered indexes**
4. **Regenerate Prisma client**
   ```bash
   npx prisma generate
   ```
5. **Run tenant isolation tests**
   ```bash
   npm test -- tenant-isolation
   ```

## Troubleshooting

### Tests Failing Locally

**Issue:** Database connection errors
```
Error: Can't reach database server
```

**Solution:**
1. Ensure PostgreSQL is running
2. Check DATABASE_URL environment variable
3. Run `npx prisma db push` to sync schema

**Issue:** Prisma client out of sync
```
Error: Unknown field 'tenantId'
```

**Solution:**
```bash
npx prisma generate
```

### Tests Failing in CI

**Issue:** Database not ready
```
Error: Connection refused
```

**Solution:**
- Check PostgreSQL service health checks in workflow
- Increase health check timeout if needed

**Issue:** Missing environment variables
```
Error: JWT_SECRET is not defined
```

**Solution:**
- Add required env vars to workflow file
- Check secrets configuration in GitHub

## References

- [Tenant Middleware Implementation](../services/customer/src/middleware/tenant.middleware.ts)
- [Tenant Isolation Tests](../services/customer/src/__tests__/integration/tenant-isolation-comprehensive.test.ts)
- [CI/CD Workflow](../.github/workflows/tenant-isolation-tests.yml)
- [Prisma Schema](../services/customer/prisma/schema.prisma)

## Changelog

- **2025-11-19**: Initial comprehensive tenant isolation test suite created
  - 8 test categories with 40+ individual tests
  - Full CI/CD integration
  - Complete documentation
