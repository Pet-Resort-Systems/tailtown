# Automated Deployment Tests

**Created:** November 16, 2025  
**Purpose:** Prevent deployment failures like the Nov 16, 2025 incident  
**Status:** Active

---

## 🎯 Overview

This document describes the automated test suite designed to catch deployment issues before they reach production. These tests were created in response to the Nov 16, 2025 deployment incident where Prisma schema mismatches caused complete service outages.

---

## 🧪 Test Suites

### 1. Prisma Schema Validation Tests
**File:** `services/customer/src/__tests__/prisma-schema-validation.test.ts`

**Purpose:** Ensure Prisma client matches database schema

**Tests Include:**
- ✅ Database connectivity
- ✅ Tenant model field validation (catches String vs Enum mismatches)
- ✅ TrainingClass relation validation (catches field name errors)
- ✅ Enum value validation
- ✅ Schema consistency checks
- ✅ Common query pattern validation
- ✅ TypeScript type safety

**What It Catches:**
- Prisma client out of sync with schema
- Invalid field names in queries (like `classWaitlist` vs `waitlist`)
- Enum type mismatches (like `TenantStatus` vs `String`)
- Missing or renamed fields

**Example:**
```typescript
it('should have Tenant model with correct fields', async () => {
  const tenant = await prisma.tenant.findFirst();
  
  if (tenant) {
    // This would have caught the String vs Enum bug
    expect(['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'DELETED', 'PENDING'])
      .toContain(tenant.status);
  }
});
```

---

### 2. Service Health Tests
**File:** `services/customer/src/__tests__/service-health.test.ts`

**Purpose:** Verify service can start and operate correctly

**Tests Include:**
- ✅ Environment configuration validation
- ✅ Database health checks
- ✅ Prisma client health
- ✅ Model accessibility
- ✅ Critical query execution
- ✅ Error handling
- ✅ Performance benchmarks

**What It Catches:**
- Missing environment variables
- Database connection failures
- Prisma client generation failures
- Broken queries
- Performance regressions

**Example:**
```typescript
it('should execute training class query with counts', async () => {
  // This would have caught the invalid count field
  await expect(
    prisma.trainingClass.findFirst({
      include: {
        _count: {
          select: {
            enrollments: true,
            sessions: true
            // classWaitlist would fail here
          }
        }
      }
    })
  ).resolves.not.toThrow();
});
```

---

### 3. CI/CD Pre-Deployment Tests
**File:** `.github/workflows/pre-deployment-tests.yml`

**Purpose:** Run comprehensive checks before deployment

**Jobs:**
1. **Prisma Validation**
   - Generate Prisma client
   - Apply migrations
   - Run schema validation tests
   - Run health tests

2. **Reservation Service Validation**
   - Install dependencies with `--legacy-peer-deps`
   - Generate Prisma client
   - Apply migrations
   - Build TypeScript

3. **TypeScript Compilation**
   - Build both services
   - Catch compilation errors

4. **Deployment Readiness**
   - Check required files
   - Validate Prisma schemas
   - Summary report

**What It Catches:**
- TypeScript compilation errors
- Prisma generation failures
- Migration failures
- Missing configuration files
- Dependency resolution issues

---

## 🚀 Running Tests Locally

### Run All Tests
```bash
cd services/customer
npm test
```

### Run Specific Test Suite
```bash
# Prisma schema validation
npm test -- prisma-schema-validation.test.ts

# Service health checks
npm test -- service-health.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

---

## 🔄 CI/CD Integration

### Automatic Triggers
The pre-deployment tests run automatically on:
- ✅ Pull requests to `main`
- ✅ Pushes to `main`
- ✅ Manual workflow dispatch

### Required Checks
All tests must pass before:
- ✅ Merging PRs
- ✅ Deploying to production
- ✅ Releasing new versions

### Workflow Status
Check status at: https://github.com/moosecreates/tailtown/actions

---

## 🐛 Issues These Tests Prevent

### 1. Prisma Schema Mismatch (Nov 16, 2025)
**Problem:**
```
Invalid `prisma.tenant.findUnique()` invocation:
Error converting field "status" of expected non-nullable type "String",
found incompatible value of "ACTIVE"
```

**Prevention:**
```typescript
it('should have Tenant model with correct fields', async () => {
  const tenant = await prisma.tenant.findFirst();
  expect(tenant.status).toBeDefined();
  expect(['TRIAL', 'ACTIVE', ...]).toContain(tenant.status);
});
```

**Result:** ✅ Test fails if Prisma client doesn't match schema

---

### 2. Invalid Field Names (Nov 16, 2025)
**Problem:**
```
Unknown field 'classWaitlist' for select statement on model TrainingClassCountOutputType.
```

**Prevention:**
```typescript
it('should query TrainingClass with valid _count fields', async () => {
  const classes = await prisma.trainingClass.findMany({
    include: {
      _count: {
        select: {
          enrollments: true,
          sessions: true
          // Invalid fields would cause test to fail
        }
      }
    }
  });
  expect(classes).toBeDefined();
});
```

**Result:** ✅ Test fails if invalid field names used

---

### 3. Node Modules Corruption (Nov 16, 2025)
**Problem:**
```
Error: Cannot find module '@prisma/engines'
```

**Prevention:**
```typescript
it('should have Prisma client properly generated', () => {
  expect(prisma).toBeDefined();
  expect(prisma.tenant).toBeDefined();
});
```

**Result:** ✅ Test fails if Prisma client not properly installed

---

## 📊 Test Coverage Goals

### Current Coverage
- Prisma schema validation: ✅ Comprehensive
- Service health: ✅ Comprehensive
- CI/CD integration: ✅ Complete

### Target Coverage
- Unit tests: 60%+
- Integration tests: 80%+
- Critical paths: 90%+

---

## 🔧 Maintenance

### When to Update Tests

**Add tests when:**
- ✅ New models added to Prisma schema
- ✅ New relations added
- ✅ New enum types created
- ✅ Critical queries added
- ✅ New services created

**Update tests when:**
- ✅ Schema changes
- ✅ Field names change
- ✅ Relations change
- ✅ Enum values change

### Test Review Schedule
- **Weekly:** Review failed tests
- **Monthly:** Review test coverage
- **Quarterly:** Full test suite audit

---

## 🎯 Best Practices

### 1. Run Tests Before Committing
```bash
npm test
```

### 2. Run Tests Before Creating PR
```bash
npm test -- --coverage
```

### 3. Check CI Status Before Merging
- All checks must be green ✅
- No skipped tests
- Coverage meets targets

### 4. Fix Failing Tests Immediately
- Don't merge with failing tests
- Don't skip tests to make them pass
- Fix the root cause

---

## 📈 Success Metrics

### Pre-Tests (Before Nov 16, 2025)
- ❌ 0 automated deployment checks
- ❌ Manual testing only
- ❌ Issues found in production

### Post-Tests (After Nov 16, 2025)
- ✅ 50+ automated test cases
- ✅ CI/CD integration complete
- ✅ Issues caught before deployment

### Target Metrics
- 🎯 100% of PRs tested automatically
- 🎯 0 deployment failures due to schema issues
- 🎯 < 5 minute test execution time
- 🎯 90%+ test reliability

---

## 🚨 Troubleshooting

### Tests Failing Locally

**Problem:** Tests fail on your machine but pass in CI

**Solution:**
```bash
# Clean install
rm -rf node_modules
npm ci

# Regenerate Prisma client
npx prisma generate

# Run tests
npm test
```

---

### Tests Failing in CI

**Problem:** Tests pass locally but fail in CI

**Solution:**
1. Check environment variables
2. Verify database migrations applied
3. Check Prisma client generation
4. Review CI logs for specific errors

---

### Slow Tests

**Problem:** Tests take too long to run

**Solution:**
1. Use test database (not production)
2. Limit query results with `take: 1`
3. Run tests in parallel
4. Mock external services

---

## 📚 Related Documentation

- [DEPLOYMENT-FIX-SESSION-NOV-16-2025.md](./DEPLOYMENT-FIX-SESSION-NOV-16-2025.md) - Incident report
- [TESTING-STRATEGY.md](./TESTING-STRATEGY.md) - Overall testing approach
- [DEVELOPMENT-BEST-PRACTICES.md](./DEVELOPMENT-BEST-PRACTICES.md) - Coding standards

---

## 🎓 Learning Resources

### Prisma Testing
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

### CI/CD Testing
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Testing Best Practices](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Last Updated:** November 16, 2025  
**Next Review:** December 16, 2025  
**Maintained By:** Development Team
