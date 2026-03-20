# Integration Tests

## Overview

Integration tests that use the actual PostgreSQL database to validate end-to-end functionality of the reservation service.

## Setup

### Prerequisites

1. **PostgreSQL Database Running**
   ```bash
   # Your database should be running on localhost:5434
   # Database name: reservation
   ```

2. **Install Dependencies**
   ```bash
   cd services/reservation-service
   npm install
   ```

3. **Environment Variables**
   ```bash
   # Set in .env or export
   DATABASE_URL="postgresql://postgres:postgres@localhost:5434/reservation"
   TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5434/reservation"
   ```

## Running Tests

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run All Tests
```bash
npm run test:all
```

### Watch Mode
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:coverage
```

## Test Structure

### `reservation-integration.test.ts`

Comprehensive integration tests covering:

1. **Pagination Integration** (2 tests)
   - Returns up to 250 reservations
   - Rejects limit > 500

2. **Kennel Assignment Integration** (5 tests)
   - Requires resourceId for boarding
   - Allows boarding with specific resourceId
   - Allows boarding with auto-assign
   - Does NOT require resourceId for grooming
   - Prevents removing resourceId from boarding

3. **Double-Booking Prevention Integration** (3 tests)
   - Prevents overlapping reservations
   - Allows non-overlapping reservations
   - Allows editing own reservation

4. **Multi-Tenant Isolation Integration** (2 tests)
   - Does not see other tenant reservations
   - Does not allow using other tenant resources

**Total: 12 integration tests**

## Test Data Management

### Automatic Cleanup

Tests automatically:
- Create test data before running (`beforeAll`)
- Clean up test data after running (`afterAll`)
- Use unique tenant ID: `test-tenant-integration`

### Test Data Created

- Test customer
- Test pet
- Test boarding service
- Test grooming service
- Test resource (kennel)

### Isolation

Each test suite:
- Uses unique tenant IDs
- Cleans up its own data
- Does not interfere with other tests
- Does not affect production data

## Configuration

### `jest.integration.config.js`

- Test environment: Node
- Test pattern: `**/*.integration.test.ts`
- Timeout: 30 seconds (for database operations)
- Coverage directory: `coverage/integration`

### `setup.ts`

- Sets test environment variables
- Configures database connection
- Sets global timeout
- Provides test lifecycle logging

## What's Being Tested

### ✅ Real Database Operations
- Actual Prisma queries
- Real foreign key constraints
- Actual data validation
- Real transaction handling

### ✅ API Endpoints
- HTTP requests via supertest
- Request/response validation
- Status codes
- Error messages

### ✅ Business Logic
- Pagination limits enforced
- Kennel assignment validation
- Double-booking prevention
- Multi-tenant isolation

### ✅ Data Integrity
- Foreign key relationships
- Unique constraints
- Required fields
- Data types

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Check if port 5434 is in use
lsof -i :5434

# Test connection
psql -h localhost -p 5434 -U postgres -d reservation
```

### Test Failures

1. **Check database is running**
2. **Verify DATABASE_URL is correct**
3. **Ensure no port conflicts**
4. **Check test data cleanup**

### Common Errors

**Error: Cannot find module 'supertest'**
```bash
npm install --save-dev supertest @types/supertest
```

**Error: Database connection failed**
```bash
# Check your .env file
cat .env

# Verify database exists
psql -h localhost -p 5434 -U postgres -l
```

**Error: Timeout**
```bash
# Increase timeout in jest.integration.config.js
testTimeout: 60000 // 60 seconds
```

## Best Practices

### ✅ DO
- Use unique tenant IDs for tests
- Clean up test data in `afterAll`
- Use descriptive test names
- Test both success and failure cases
- Verify database state after operations

### ❌ DON'T
- Use production tenant IDs
- Leave test data in database
- Run tests against production database
- Assume test order
- Share state between tests

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

### Pre-deployment

```bash
# Run all tests before deploying
npm run test:all

# Ensure coverage meets threshold
npm run test:coverage
```

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add performance tests
- [ ] Add load testing
- [ ] Add database migration tests
- [ ] Add backup/restore tests
- [ ] Add monitoring integration

## Related Documentation

- [Unit Tests](../README.md)
- [Controller Documentation](../../controllers/reservation/README.md)
- [API Documentation](../../README.md)
