# Customer Service Tests

This directory contains tests for the customer service, focusing on multi-tenant isolation and authentication.

## Test Structure

```
__tests__/
├── integration/          # Integration tests that test multiple components together
│   ├── tenant-isolation.test.ts    # Tests for multi-tenant data isolation
│   ├── auth-flow.test.ts           # Tests for authentication flow
│   └── resource-filter.test.ts     # Tests for resource type filtering
└── unit/                 # Unit tests for individual functions (to be added)
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run only integration tests
npm run test:integration

# Run only unit tests
npm run test:unit

# Run specific test suites
npm run test:tenant-isolation
npm run test:auth

# Run tests with coverage report
npm run test:coverage
```

## Test Suites

### Tenant Isolation Tests (`tenant-isolation.test.ts`)
**Purpose:** Ensure that multi-tenant data isolation works correctly.

**What it tests:**
- Staff endpoint returns only tenant-specific data
- Customer endpoint filters by tenant
- Cross-tenant data access is prevented
- Email uniqueness is enforced per tenant (not globally)

**Why it's important:**
- Prevents data leakage between tenants
- Ensures each business only sees their own data
- Critical for security and compliance

### Authentication Flow Tests (`auth-flow.test.ts`)
**Purpose:** Verify the complete authentication system works correctly.

**What it tests:**
- Login returns JWT tokens
- Tokens contain correct claims (id, email, role, tenantId)
- Authenticated requests are accepted
- Unauthenticated requests are rejected
- Invalid tokens are rejected
- Token tampering is detected

**Why it's important:**
- Ensures users can log in and access the system
- Prevents unauthorized access
- Validates token security

### Resource Filter Tests (`resource-filter.test.ts`)
**Purpose:** Ensure resource type filtering works correctly.

**What it tests:**
- `type=suite` returns all suite types including 'SUITE'
- Case-insensitive filtering works
- Specific type filters (kennel, suite, etc.)
- No filter returns all resources

**Why it's important:**
- Prevents "No kennels found" errors in the calendar
- Ensures frontend can filter resources correctly
- Validates API query parameter handling

## Writing New Tests

### Integration Test Template

```typescript
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../../utils/jwt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Your Feature', () => {
  beforeAll(async () => {
    // Set up test data
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.$disconnect();
  });

  test('should do something', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
});
```

## CI/CD Integration

These tests should be run:
1. **Pre-commit** - Run fast unit tests
2. **Pre-push** - Run all tests
3. **CI Pipeline** - Run all tests on every PR
4. **Nightly** - Run full test suite including E2E

## Test Database

Tests use the same database as development but with test-specific tenant IDs:
- `test-tenant`
- `tenant-a`
- `tenant-b`
- `test-filter`

All test data is cleaned up after tests complete.

## Troubleshooting

### Tests failing with "Cannot find module"
```bash
npm run prisma:generate
npm run build
```

### Tests failing with database errors
```bash
# Make sure database is running
# Check .env file has correct DATABASE_URL
npm run prisma:migrate
```

### Tests hanging or timing out
- Check if test database is accessible
- Ensure `afterAll` cleanup is running
- Add `--forceExit` flag if needed: `jest --forceExit`

## Coverage Goals

- **Tenant Isolation:** 100% - Critical for security
- **Authentication:** 100% - Critical for security
- **API Endpoints:** 80%+ - Good coverage
- **Overall:** 70%+ - Acceptable coverage
