# Customer Service Test Suite

This directory contains comprehensive health and integration tests for the customer service.

## Test Categories

### 1. Migration Health Tests (`migrations.health.test.ts`)
**Purpose**: Validate database migrations are correct and idempotent

**What it catches**:
- Duplicate enum creation (like the `PetType` error we had)
- Missing tables (like the `veterinarians` table issue)
- Non-idempotent migrations
- Column name mismatches
- Excessive data in CI/CD environments

**Run**: `npm test migrations.health`

### 2. Dependency Health Tests (`dependencies.health.test.ts`)
**Purpose**: Ensure all required packages are installed

**What it catches**:
- Missing runtime dependencies (like `helmet`, `morgan`)
- Missing TypeScript type definitions
- Invalid package.json configuration
- Missing Prisma configuration

**Run**: `npm test dependencies.health`

### 3. Database Connection Tests (`database.health.test.ts`)
**Purpose**: Validate database connectivity and configuration

**What it catches**:
- Database connection failures
- Wrong database user (like the `root` user error)
- Missing database permissions
- Failed migrations
- Connection string issues

**Run**: `npm test database.health`

### 4. API Integration Tests (`api.integration.test.ts`)
**Purpose**: Test API endpoints work correctly

**What it catches**:
- Broken API endpoints
- Missing CORS headers
- Missing security headers
- Invalid response formats
- Error handling issues

**Run**: `npm test api.integration`

## Running Tests

### Run all health tests:
```bash
npm test
```

### Run specific test file:
```bash
npm test migrations.health
npm test dependencies.health
npm test database.health
```

### Run with coverage:
```bash
npm test -- --coverage
```

### Run in watch mode (during development):
```bash
npm test -- --watch
```

## CI/CD Integration

These tests run automatically in GitHub Actions on:
- Every pull request
- Every push to `main` or `development`
- Manual workflow dispatch

### Test Workflow Steps:
1. Set up PostgreSQL database
2. Install dependencies
3. Run migrations
4. Run all health tests
5. Run integration tests
6. Generate coverage report

## Test Environment Variables

Required for tests to run:
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to `test` for test runs
- `CI`: Set to `true` in CI/CD environments

Example `.env.test`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/customer_test
NODE_ENV=test
PORT=4004
```

## What These Tests Prevent

Based on issues we encountered:

### ✅ Migration Issues
- **Problem**: Migrations tried to create enums that already existed
- **Test**: `migrations.health.test.ts` checks for idempotent enum creation
- **Prevention**: Catches duplicate `CREATE TYPE` without proper error handling

### ✅ Missing Dependencies
- **Problem**: `helmet` and `morgan` packages were missing
- **Test**: `dependencies.health.test.ts` validates all required packages
- **Prevention**: Fails fast if critical dependencies are missing

### ✅ Database Configuration
- **Problem**: CI tried to connect as user `root` which doesn't exist
- **Test**: `database.health.test.ts` validates database user
- **Prevention**: Catches incorrect database configuration early

### ✅ Schema Mismatches
- **Problem**: Migrations referenced tables that didn't exist
- **Test**: `migrations.health.test.ts` validates schema consistency
- **Prevention**: Ensures all referenced tables exist

## Adding New Tests

When adding new features, add corresponding tests:

1. **New Migration**: Add validation in `migrations.health.test.ts`
2. **New Dependency**: Add check in `dependencies.health.test.ts`
3. **New API Endpoint**: Add test in `api.integration.test.ts`
4. **New Database Table**: Add validation in `database.health.test.ts`

## Best Practices

1. **Keep tests fast**: Health tests should run in < 5 seconds
2. **Make tests independent**: Each test should clean up after itself
3. **Use descriptive names**: Test names should explain what they validate
4. **Test edge cases**: Don't just test the happy path
5. **Keep tests maintainable**: Update tests when code changes

## Troubleshooting

### Tests fail locally but pass in CI
- Check your local DATABASE_URL
- Ensure local database is migrated
- Check Node version matches CI

### Tests pass locally but fail in CI
- Check CI environment variables
- Verify CI database setup
- Check for timing issues

### Slow test runs
- Run specific test files instead of all tests
- Use `--maxWorkers=1` for serial execution
- Check for database connection leaks

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add load testing for API endpoints
- [ ] Add mutation testing
- [ ] Add visual regression tests for frontend
- [ ] Add contract testing between services
