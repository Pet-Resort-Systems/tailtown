# Testing Guide

This document describes the automated testing setup for Tailtown.

## Overview

Tailtown uses a comprehensive testing strategy covering:
- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API endpoint and database testing
- **End-to-End Tests**: Full user flow testing (planned)
- **Automated CI/CD**: Tests run on every push and PR

## Test Structure

```
tailtown/
├── frontend/
│   ├── src/
│   │   └── __tests__/          # Frontend component tests
│   └── package.json             # Test scripts
├── services/
│   ├── customer/
│   │   ├── __tests__/           # Backend API tests
│   │   │   ├── messaging.api.test.ts
│   │   │   ├── api.integration.test.ts
│   │   │   └── ...
│   │   └── package.json
│   └── reservation-service/
│       ├── __tests__/
│       └── package.json
└── scripts/
    └── run-tests.sh             # Automated test runner
```

## Running Tests

### Quick Start

Run all tests:
```bash
./scripts/run-tests.sh
```

### Individual Test Suites

**Frontend Tests**:
```bash
cd frontend
npm test
```

**Customer Service Tests**:
```bash
cd services/customer
npm test
```

**Messaging API Tests** (specific):
```bash
cd services/customer
npm test -- messaging.api.test.ts
```

**Reservation Service Tests**:
```bash
cd services/reservation-service
npm test
```

### Watch Mode (Development)

Run tests in watch mode for active development:
```bash
cd frontend
npm test -- --watch
```

## Test Coverage

Generate coverage reports:
```bash
cd services/customer
npm run test:coverage
```

View coverage:
```bash
open coverage/lcov-report/index.html
```

## Messaging API Tests

The messaging system has comprehensive test coverage:

### Test Categories

1. **Channel Management**
   - List channels for authenticated staff
   - Filter archived channels
   - Calculate unread counts
   - Channel membership validation

2. **Message Operations**
   - Send messages
   - Fetch messages with pagination
   - Message editing and deletion
   - Soft delete functionality

3. **Read Receipts**
   - Mark channels as read
   - Track last read message
   - Update read timestamps

4. **Unread Counts**
   - Total unread across channels
   - Exclude own messages
   - Per-channel unread counts

5. **Authorization**
   - Require authentication
   - Prevent non-member access
   - Validate channel membership

6. **Message Features**
   - Mentions (@user)
   - Reactions (emoji)
   - Attachments (planned)
   - Threading (planned)

### Running Messaging Tests

```bash
cd services/customer
npm test -- messaging.api.test.ts
```

Expected output:
```
 PASS  __tests__/messaging.api.test.ts
  Messaging API Tests
    GET /api/messaging/channels
      ✓ should return channels for authenticated staff
      ✓ should not return archived channels
      ✓ should calculate unread count correctly
    GET /api/messaging/channels/:channelId/messages
      ✓ should return messages for channel member
      ✓ should not return messages for non-member
      ✓ should support pagination with before cursor
    POST /api/messaging/channels/:channelId/messages
      ✓ should create a new message
      ✓ should reject empty message content
      ✓ should support mentions
    ... (60+ tests total)
```

## Continuous Integration

Tests run automatically on:
- Every push to `main` or `development`
- Every pull request
- Manual workflow dispatch

### GitHub Actions Workflow

Location: `.github/workflows/test.yml`

The CI pipeline:
1. Sets up Node.js (16.x and 18.x)
2. Installs dependencies
3. Sets up PostgreSQL test database
4. Runs Prisma migrations
5. Runs all test suites
6. Generates coverage reports
7. Uploads to Codecov

### Viewing CI Results

1. Go to GitHub Actions tab
2. Click on latest workflow run
3. View test results and logs

## Writing Tests

### Backend API Tests (Jest + Supertest)

```typescript
describe('API Endpoint', () => {
  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should do something', async () => {
    const result = await prisma.model.findMany();
    expect(result).toBeDefined();
  });
});
```

### Frontend Component Tests (React Testing Library)

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Test Database

Tests use a separate test database to avoid affecting development data.

**Setup**:
```bash
# Create test database
createdb customer_test

# Run migrations
cd services/customer
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/customer_test" \
  npx prisma migrate deploy
```

**Environment Variables**:
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/customer_test"
export NODE_ENV="test"
```

## Best Practices

### DO:
- ✅ Write tests for all new features
- ✅ Test both success and error cases
- ✅ Use descriptive test names
- ✅ Clean up test data in `afterAll`
- ✅ Mock external services
- ✅ Test edge cases
- ✅ Keep tests fast and isolated

### DON'T:
- ❌ Depend on test execution order
- ❌ Use production database for tests
- ❌ Leave test data in database
- ❌ Skip cleanup in afterAll
- ❌ Test implementation details
- ❌ Write flaky tests

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "test name"
```

### Run with Verbose Output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues

### Prisma Client Not Generated

```bash
cd services/customer
npx prisma generate
```

### Database Connection Errors

Check:
1. PostgreSQL is running
2. DATABASE_URL is correct
3. Test database exists
4. Migrations are applied

### Test Timeouts

Increase timeout in jest.config.js:
```javascript
module.exports = {
  testTimeout: 30000 // 30 seconds
};
```

## Coverage Goals

Target coverage levels:
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

Current coverage:
- Customer Service: ~75%
- Frontend: ~60%
- Reservation Service: ~70%

## Future Enhancements

- [ ] E2E tests with Playwright
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Load testing
- [ ] Security testing
- [ ] Accessibility testing

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest](https://github.com/visionmedia/supertest)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)

## Support

For testing questions or issues:
1. Check this documentation
2. Review existing tests for examples
3. Ask in #engineering Slack channel
4. Create an issue in GitHub
