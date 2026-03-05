# Multi-Tenancy Integration Tests

## Overview

These tests ensure that **tenant data isolation** is properly enforced across all analytics, reports, and financial endpoints. This is critical for data security and privacy in our multi-tenant system.

## Why These Tests Matter

**The Bug We Caught**: We discovered that the analytics system was missing `tenantId` filtering in the `financialService.getInvoicesInRange()` function. This caused:
- Dashboard showing 23,628 customers instead of 1,157 (data from ALL tenants)
- Revenue numbers including data from multiple tenants
- Potential data leakage between tenants

**These tests prevent this from happening again.**

## Test Files

### `analytics-tenant-isolation.test.ts`
Comprehensive tests for analytics and financial reports:

- ✅ **Dashboard Summary** - Ensures each tenant sees only their data
- ✅ **Sales by Service** - Verifies service revenue is tenant-specific
- ✅ **Sales by Add-On** - Checks add-on data isolation
- ✅ **Customer Value Reports** - Confirms customer lists are filtered
- ✅ **Customer Reports** - Tests individual customer data access
- ✅ **Financial Aggregations** - Validates revenue calculations per tenant
- ✅ **Date Range Filtering** - Ensures date filters respect tenant boundaries

### `tenant-isolation.test.ts`
General tenant isolation tests for:
- Staff endpoints
- Customer endpoints
- Email uniqueness per tenant

## Running the Tests

### Run All Integration Tests
```bash
cd services/customer
npm test -- --testPathPattern=integration
```

### Run Only Analytics Tenant Tests
```bash
npm test -- analytics-tenant-isolation.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage --testPathPattern=integration
```

### Watch Mode (for development)
```bash
npm test -- --watch analytics-tenant-isolation.test.ts
```

## Test Structure

Each test follows this pattern:

1. **Setup**: Create two test tenants (test-tenant-a and test-tenant-b)
2. **Seed Data**: Add customers, services, invoices, and reservations for both tenants
3. **Test**: Make API calls with tenant-specific tokens
4. **Assert**: Verify only tenant-specific data is returned
5. **Cleanup**: Remove all test data

## Key Assertions

### ❌ **FAIL Conditions** (What we're preventing):
```typescript
// Tenant A should NOT see Tenant B's data
expect(data.totalRevenue).not.toBe(330); // Combined revenue
expect(customerEmails).not.toContain('tenant-b-customer@test.com');
```

### ✅ **PASS Conditions** (What we're enforcing):
```typescript
// Tenant A should ONLY see their own data
expect(data.totalRevenue).toBe(110); // Only tenant A revenue
expect(data.customerCount).toBe(1); // Only tenant A customers
```

## Adding New Tests

When adding new analytics or report endpoints, **always add tenant isolation tests**:

```typescript
test('New endpoint respects tenant boundaries', async () => {
  const response = await request(app)
    .get('/api/your-new-endpoint')
    .set('Authorization', `Bearer ${tokenTenantA}`)
    .set('x-tenant-subdomain', 'test-tenant-a');

  expect(response.status).toBe(200);
  
  // Verify tenant isolation
  const data = response.body.data;
  expect(data.every(item => item.tenantId === 'test-tenant-a')).toBe(true);
});
```

## CI/CD Integration

These tests should run:
- ✅ On every PR
- ✅ Before deployment to staging
- ✅ Before deployment to production
- ✅ As part of nightly regression tests

## Troubleshooting

### Tests Failing?

1. **Check database state**: Ensure test database is clean
   ```bash
   npm run prisma:reset:test
   ```

2. **Check tenant middleware**: Verify `extractTenantContext` is applied to routes

3. **Check service functions**: Ensure all queries include `tenantId` filter

### Common Issues

**Issue**: Tests pass but production shows cross-tenant data
- **Cause**: Middleware not applied to route
- **Fix**: Add `requireTenant` middleware to route definition

**Issue**: Tests fail with "Tenant not found"
- **Cause**: Test database doesn't have tenant records
- **Fix**: Check `beforeAll` setup creates tenants properly

## Best Practices

1. **Always filter by tenantId** in Prisma queries
2. **Use `req.tenantId`** from middleware, never trust client input
3. **Test both positive and negative cases** (can access own data, cannot access other tenant's data)
4. **Clean up test data** in `afterAll` to avoid test pollution
5. **Use unique identifiers** for test data to avoid conflicts

## Related Documentation

- [Tenant Strategy](../../../docs/TENANT-STRATEGY.md)
- [Security Checklist](../../../docs/SECURITY-CHECKLIST.md)
- [Financial Service](../../services/financialService.ts)
- [Analytics Controller](../../controllers/analytics.controller.ts)

## Questions?

If you're unsure whether an endpoint needs tenant isolation tests, **the answer is YES**. When in doubt, add the test.
