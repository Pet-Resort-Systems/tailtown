# Tenant Isolation CI/CD - Troubleshooting Guide

## Common Issues & Solutions

### 1. Tests Failing with "Cannot find module"

**Symptom:**
```
Cannot find module 'uuid'
Cannot find module '@types/uuid'
```

**Cause:** Missing dependencies in `package.json`

**Solution:**
```bash
cd services/customer
npm install uuid @types/uuid
git add package.json package-lock.json
git commit -m "fix: Add missing dependencies"
```

---

### 2. npm ci Fails with Lock File Error

**Symptom:**
```
npm ERR! `npm ci` can only install packages when your package.json and package-lock.json are in sync
```

**Cause:** `package.json` and `package-lock.json` out of sync

**Solution:**
Update workflow to use `npm install` instead:
```yaml
- name: Install dependencies
  run: npm install
  working-directory: ./services/customer
```

---

### 3. Jest Hangs After Tests Complete

**Symptom:**
- Tests complete successfully
- Jest doesn't exit
- Workflow runs for 40+ minutes
- Message: "Jest did not exit one second after the test run has completed"

**Cause:** Open handles (database connections, timers, etc.)

**Solution:**
Add `--forceExit` flag to Jest command:
```yaml
- name: Run tenant isolation tests
  run: |
    npm test -- tenant-isolation-comprehensive --watchAll=false --verbose --forceExit
```

---

### 4. Tests Expect 404 but Get 200

**Symptom:**
```
Expected: 404
Received: 200
```

**Cause:** Missing tenant isolation checks in controllers

**Solution:**
Add tenant validation before operations:

```typescript
// BEFORE (vulnerable)
const customer = await prisma.customer.findUnique({
  where: { id }
});

// AFTER (secure)
const customer = await prisma.customer.findFirst({
  where: { 
    id,
    tenantId: req.tenantId
  }
});
```

---

### 5. Tests Expect tenantId but Get undefined

**Symptom:**
```
Expected: "uuid-here"
Received: undefined
```

**Cause:** `tenantId` not included in response

**Solution:**
Add `tenantId` to select statement:

```typescript
select: {
  id: true,
  tenantId: true,  // Add this
  firstName: true,
  // ... other fields
}
```

---

### 6. Wrong Header Used in Tests

**Symptom:**
```
Expected: 200
Received: 404
```

**Cause:** Using `x-tenant-id` with UUID instead of `x-tenant-subdomain` with subdomain

**Solution:**
Update test headers:

```typescript
// BEFORE (wrong)
.set('x-tenant-id', tenantAId)  // UUID

// AFTER (correct)
.set('x-tenant-subdomain', 'tenant-a-isolation-test')  // subdomain
```

---

### 7. Database Connection Issues in CI

**Symptom:**
```
Error: Can't reach database server
```

**Cause:** PostgreSQL service not ready or wrong connection string

**Solution:**
Ensure service is configured with health checks:

```yaml
services:
  postgres:
    image: postgres:14
    env:
      POSTGRES_PASSWORD: postgres
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

And use correct DATABASE_URL:
```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/customer_test
```

---

### 8. Prisma Schema Not Applied

**Symptom:**
```
Error: Table 'customers' doesn't exist
```

**Cause:** Database schema not pushed before tests

**Solution:**
Add Prisma push step before tests:

```yaml
- name: Setup test database
  run: |
    npx prisma db push --skip-generate
```

---

### 9. Tests Pass Locally but Fail in CI

**Possible Causes:**
1. **Environment differences**: Check `NODE_ENV`, `DATABASE_URL`
2. **Missing dependencies**: Ensure all deps in `package.json`
3. **Different Node versions**: Specify Node version in workflow
4. **Timing issues**: Add delays or use `waitFor` utilities

**Debug Steps:**
```bash
# Check workflow logs
gh run view <run-id> --log

# Run with same environment locally
NODE_ENV=test DATABASE_URL=postgresql://... npm test

# Check for console.log/errors
gh run view <run-id> --log | grep -i error
```

---

### 10. Coverage Report Not Generated

**Symptom:**
No coverage artifacts uploaded

**Cause:** Coverage directory doesn't exist or wrong path

**Solution:**
Ensure coverage is generated:

```yaml
- name: Generate test coverage report
  run: |
    npm test -- tenant-isolation-comprehensive --coverage --watchAll=false
  working-directory: ./services/customer
```

And upload from correct path:
```yaml
- name: Upload coverage
  uses: actions/upload-artifact@v4
  with:
    name: tenant-isolation-coverage
    path: services/customer/coverage/
```

---

## Debugging Workflow

### Step 1: Check Workflow Status
```bash
gh run list --workflow=tenant-isolation-tests.yml --limit 5
```

### Step 2: View Failed Run Logs
```bash
gh run view <run-id> --log
```

### Step 3: Search for Specific Errors
```bash
# Find test failures
gh run view <run-id> --log | grep "FAIL\|Error"

# Find specific test
gh run view <run-id> --log | grep "cannot update other tenant"

# Check test summary
gh run view <run-id> --log | grep "Test Suites:"
```

### Step 4: Run Tests Locally
```bash
cd services/customer

# Run specific test file
npm test -- tenant-isolation-comprehensive

# Run with coverage
npm test -- tenant-isolation-comprehensive --coverage

# Run with verbose output
npm test -- tenant-isolation-comprehensive --verbose

# Run with force exit
npm test -- tenant-isolation-comprehensive --forceExit
```

### Step 5: Check Database State
```bash
# Connect to test database
psql postgresql://postgres:postgres@localhost:5432/customer_test

# Check tables
\dt

# Check tenant data
SELECT id, subdomain FROM tenants;

# Check customer data
SELECT id, "tenantId", email FROM customers;
```

---

## Prevention Checklist

Before pushing code that modifies tenant isolation:

- [ ] Run tests locally: `npm test -- tenant-isolation-comprehensive`
- [ ] Verify all controllers use `findFirst` with `tenantId` filter
- [ ] Check that `tenantId` is included in all responses
- [ ] Ensure UPDATE/DELETE operations validate tenant ownership
- [ ] Test both positive and negative cases
- [ ] Update tests if adding new endpoints
- [ ] Check that middleware properly extracts tenant context
- [ ] Verify database queries include `tenantId` in WHERE clause

---

## Quick Fixes

### Force Re-run Failed Workflow
```bash
gh run rerun <run-id>
```

### Cancel Running Workflow
```bash
gh run cancel <run-id>
```

### View Workflow in Browser
```bash
gh run view <run-id> --web
```

### Download Coverage Artifacts
```bash
gh run download <run-id>
```

---

## Getting Help

### Check Documentation
- `docs/TENANT-ISOLATION-TESTING.md` - Complete testing guide
- `docs/TENANT-ISOLATION-QUICK-REFERENCE.md` - Developer quick reference
- `docs/TENANT-ISOLATION-CI-CD-SUMMARY.md` - CI/CD integration summary

### Review Code Examples
- `services/customer/src/__tests__/integration/tenant-isolation-comprehensive.test.ts`
- `services/customer/src/middleware/tenant.middleware.ts`
- `services/customer/src/controllers/customer.controller.ts`

### Common Commands
```bash
# Check workflow status
npm run test:tenant-isolation

# Run locally with same flags as CI
npm test -- tenant-isolation-comprehensive --watchAll=false --verbose --forceExit

# Generate coverage report
npm test -- tenant-isolation-comprehensive --coverage
```

---

## Contact & Support

If issues persist:
1. Check GitHub Actions logs for detailed error messages
2. Review recent commits for breaking changes
3. Verify database schema is up to date
4. Ensure all dependencies are installed
5. Check that environment variables are set correctly

---

*Last Updated: November 20, 2025*
