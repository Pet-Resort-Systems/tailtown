# Test Setup Notes

## Current Status

The multi-tenancy test suite has been created and is ready to run, but there's a **database schema drift issue** that needs to be resolved first.

## Issue: Schema Drift

**Problem**: The Prisma schema file includes fields that don't exist in the database yet.

**Specific Issue**: 
- Prisma schema has `groomingSkills` field on `Staff` model (mapped to `grooming_skills` column)
- Database doesn't have this column yet
- Tests fail when trying to create staff records

**Error**:
```
PrismaClientKnownRequestError: The column `staff.grooming_skills` does not exist in the current database.
```

## Resolution Options

### Option 1: Create Missing Migration (Recommended)
```bash
cd services/customer

# Create migration for missing fields
npx prisma migrate dev --name add_missing_staff_fields

# Apply migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Run tests
npm test -- analytics-tenant-isolation.test.ts
```

### Option 2: Reset Database (Development Only - DESTRUCTIVE)
```bash
cd services/customer

# WARNING: This will delete all data!
npx prisma migrate reset

# Regenerate client
npx prisma generate

# Run tests
npm test -- analytics-tenant-isolation.test.ts
```

### Option 3: Use Test Database
Create a separate test database to avoid affecting development data:

1. Create `.env.test`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/customer_test"
```

2. Update jest.config.js to use test database
3. Run migrations on test database
4. Run tests

## Verification

Once schema is synced, verify with:

```bash
# Check Prisma client is up to date
npx prisma generate

# Check migrations are applied
npx prisma migrate status

# Run a simple test
npm test -- tenant-isolation.test.ts

# Run analytics tests
npm test -- analytics-tenant-isolation.test.ts
```

## Test Suite Files

- **Test Suite**: `/src/__tests__/integration/analytics-tenant-isolation.test.ts`
- **Documentation**: `/src/__tests__/integration/README.md`
- **Summary**: `/MULTI-TENANCY-TESTS-SUMMARY.md`

## What the Tests Cover

✅ Dashboard Summary - tenant isolation
✅ Sales by Service - tenant-specific data
✅ Sales by Add-On - no cross-tenant data
✅ Customer Value Reports - filtered by tenant
✅ Customer Reports - access control
✅ Financial Aggregations - tenant-specific calculations
✅ Date Range Filtering - respects tenant boundaries

## Expected Test Results

When schema is synced, all 14 test cases should pass:

```
PASS src/__tests__/integration/analytics-tenant-isolation.test.ts
  Analytics & Reports Tenant Isolation
    Dashboard Summary Endpoint
      ✓ Tenant A sees only their own data
      ✓ Tenant B sees only their own data
      ✓ Tenant A does not see Tenant B revenue
    Sales by Service Endpoint
      ✓ Tenant A sees only their services
      ✓ Tenant B sees only their services
    Sales by Add-On Endpoint
      ✓ Tenant A sees only their add-ons
      ✓ Tenant B sees only their add-ons
    Customer Value Endpoint
      ✓ Tenant A sees only their customers
      ✓ Tenant B sees only their customers
    Customer Report Endpoint
      ✓ Tenant A can access their customer report
      ✓ Tenant A cannot access Tenant B customer report
    Financial Reports - Critical Tenant Isolation
      ✓ Invoice queries are filtered by tenant
      ✓ Revenue aggregation is tenant-specific
      ✓ Customer count is tenant-specific
    Date Range Filtering with Tenant Isolation
      ✓ Month filter respects tenant boundaries
      ✓ All-time filter respects tenant boundaries

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

## Next Steps

1. **Resolve schema drift** using one of the options above
2. **Run tests** to verify multi-tenancy isolation
3. **Add to CI/CD** to run on every PR
4. **Monitor** for any future schema drift issues

## Questions?

If you're unsure which option to use:
- **Development**: Use Option 1 (create migration)
- **CI/CD**: Use Option 3 (separate test database)
- **Fresh start**: Use Option 2 (reset - but backup data first!)

---

**Created**: November 6, 2025
**Status**: Tests created, awaiting schema sync
**Priority**: High - these tests prevent critical security bugs
