# Test Database Setup Guide

## Overview

This guide explains how to set up and use the test database for running automated tests, specifically the staff schedule overlap prevention tests.

## Prerequisites

- PostgreSQL running on `localhost:5433`
- Database user: `postgres`
- Database password: `password`

## Quick Start

### 1. Set Up Test Database

```bash
npm run test:db:setup
```

This will:
- Drop existing `customer_test` database (if exists)
- Create new `customer_test` database
- Run all Prisma migrations
- Generate Prisma client

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:schedule

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### 3. Clean Up (Optional)

```bash
npm run test:db:teardown
```

This drops the test database.

## Database Configuration

### Test Environment Variables

The test database configuration is in `.env.test`:

```env
NODE_ENV=test
DATABASE_URL="postgresql://postgres:password@localhost:5433/customer_test"
JWT_SECRET="test-jwt-secret-key-for-testing-only"
JWT_REFRESH_SECRET="test-refresh-secret-key-for-testing-only"
DISABLE_REDIS=true
DISABLE_SENTRY=true
LOG_LEVEL=error
```

### Customizing Database Connection

If your PostgreSQL setup is different, update `.env.test` or the scripts:

**Option 1: Update `.env.test`**
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/customer_test"
```

**Option 2: Update Scripts**

Edit `scripts/setup-test-db.sh` and `scripts/teardown-test-db.sh`:

```bash
DB_HOST="your-host"
DB_PORT="your-port"
DB_USER="your-user"
DB_PASSWORD="your-password"
```

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run test:db:setup` | Create test database and run migrations |
| `npm run test:db:teardown` | Drop test database |
| `npm run test:db:reset` | Teardown and setup (fresh start) |
| `npm run test:schedule` | Run staff schedule overlap tests |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Test Database Lifecycle

### During Development

1. **First Time Setup**:
   ```bash
   npm run test:db:setup
   ```

2. **Run Tests**:
   ```bash
   npm test
   ```

3. **After Schema Changes**:
   ```bash
   npm run test:db:reset
   ```

### In CI/CD

```bash
# Setup
npm run test:db:setup

# Run tests
npm test

# Cleanup
npm run test:db:teardown
```

## Troubleshooting

### PostgreSQL Not Running

**Error**: `PostgreSQL is not running on localhost:5433`

**Solution**: Start PostgreSQL:
```bash
# Check if running
pg_isready -h localhost -p 5433 -U postgres

# Start PostgreSQL (if using Docker)
docker start tailtown-postgres

# Or start local PostgreSQL service
brew services start postgresql
```

### Database Already Exists

**Error**: `database "customer_test" already exists`

**Solution**: Reset the database:
```bash
npm run test:db:reset
```

### Permission Denied

**Error**: `permission denied to create database`

**Solution**: Ensure your PostgreSQL user has CREATE DATABASE permission:
```sql
ALTER USER postgres CREATEDB;
```

### Migration Errors

**Error**: `Migration failed`

**Solution**: 
1. Check that all migrations are valid
2. Reset the test database:
   ```bash
   npm run test:db:reset
   ```

### Prisma Client Out of Sync

**Error**: `Prisma Client is out of sync with schema`

**Solution**: Regenerate Prisma client:
```bash
npx prisma generate
```

## Test Data Management

### Automatic Cleanup

Tests automatically clean up their data:
- `beforeAll`: Creates test tenants and staff
- `afterEach`: Cleans up schedules after each test
- `afterAll`: Removes test tenants and staff

### Manual Cleanup

If tests fail and leave data behind:

```bash
# Reset entire test database
npm run test:db:reset

# Or connect and clean manually
psql -h localhost -p 5433 -U postgres -d customer_test
```

## Best Practices

### 1. Isolate Test Data

- Each test suite creates its own test data
- Use unique identifiers (e.g., `test-schedule-overlap` subdomain)
- Clean up in `afterAll` hooks

### 2. Use Transactions

For faster tests, consider using database transactions:

```typescript
beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});
```

### 3. Reset Between Test Runs

For consistent results:

```bash
npm run test:db:reset && npm test
```

### 4. Don't Commit .env.test Secrets

The `.env.test` file contains test credentials. For production:
- Use different credentials
- Add `.env.test` to `.gitignore` if it contains real secrets
- Use environment variables in CI/CD

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: services/customer
      
      - name: Setup test database
        run: npm run test:db:setup
        working-directory: services/customer
      
      - name: Run tests
        run: npm test
        working-directory: services/customer
      
      - name: Teardown test database
        if: always()
        run: npm run test:db:teardown
        working-directory: services/customer
```

## Related Documentation

- [Staff Schedule Overlap Tests](../../docs/testing/staff-schedule-overlap-tests.md)
- [Staff Schedule Overlap Prevention Changelog](../../docs/changelog/2025-11-14-staff-schedule-overlap-prevention.md)

## Support

If you encounter issues:

1. Check PostgreSQL is running: `pg_isready -h localhost -p 5433`
2. Verify database exists: `psql -h localhost -p 5433 -U postgres -l | grep customer_test`
3. Check migrations: `npx prisma migrate status`
4. Reset everything: `npm run test:db:reset`

For persistent issues, check the [Troubleshooting](#troubleshooting) section above.
