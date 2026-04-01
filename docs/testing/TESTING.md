# Testing Guide

This document describes the automated testing setup for Tailtown.

## Overview

Tailtown uses a comprehensive testing strategy covering:

- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API endpoint and database testing
- **End-to-End Tests**: Full user flow testing through the isolated `e2e` workspace package, targeting `apps/frontend` as the app under test
- **Automated CI/CD**: Tests run on every push and PR

## Test Structure

```
tailtown/
├── apps/
│   ├── frontend/                # Frontend unit/component tests
│   ├── frontend-vite/           # App under test for Playwright E2E flows
│   ├── customer-service/        # Backend API tests
│   └── reservation-service/     # Backend and integration tests
├── e2e/                         # Isolated Playwright workspace package for apps/frontend
│   ├── package.json
│   ├── playwright.config.ts
│   ├── *.spec.ts
│   └── setup/
├── package.json                 # Root test orchestration scripts
└── pnpm-workspace.yaml          # Workspace includes the e2e package
```

## Running Tests

### Quick Start

Run all tests:

```bash
pnpm test
```

Run the isolated E2E suite:

```bash
pnpm run test:e2e
```

This Playwright suite runs against `apps/frontend` as the app under test through the isolated `e2e/` workspace package.

### Individual Test Suites

**Customer Service Tests**:

```bash
pnpm --dir apps/customer-service test
```

**Messaging API Tests** (specific):

```bash
pnpm --dir apps/customer-service test -- messaging.api.test.ts
```

**Reservation Service Tests**:

```bash
pnpm --dir apps/reservation-service test
```

**E2E Tests**:

```bash
pnpm run test:e2e
pnpm run test:e2e:ui
pnpm run test:e2e:headed
pnpm run test:e2e:debug
```

### Watch Mode (Development)

Run tests in watch mode for active development:

```bash
pnpm --dir apps/frontend test -- --watch
```

## Test Coverage

Generate coverage reports:

```bash
pnpm run test:coverage
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
pnpm --dir apps/customer-service test -- messaging.api.test.ts
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

Primary active locations: `.github/workflows/test.yml` and `.github/workflows/pr-checks.yml`

Archived migration-only workflow references: `.github/workflows-disabled/test-coverage.yml` and `.github/workflows-disabled/test-gate.yml`

See [DOKPLOY-MIGRATION.md](/docs/DOKPLOY-MIGRATION.md) for the current migration status.

The CI pipeline:

1. Sets up Node.js and pnpm
2. Installs workspace dependencies
3. Sets up service dependencies and required databases
4. Runs unit and integration suites
5. Runs E2E through the isolated `@tailtown/e2e` workspace package
6. Generates coverage and test artifacts where applicable
7. Uploads reports and logs for inspection

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
cd apps/customer-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/customer_test" \
  pnpm exec prisma migrate deploy
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
pnpm --dir apps/frontend test -- -t "test name"
```

### Run with Verbose Output

```bash
pnpm --dir apps/frontend test -- --verbose
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
# Replace "apps/customer-service" with the service you want to generate the client for
pnpm --dir apps/customer-service exec prisma generate
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
    testTimeout: 30000, // 30 seconds
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

For a comprehensive list of planned testing improvements and future enhancements, refer to the centralized roadmap:

**[Testing Future Enhancements](./FUTURE-ENHANCEMENTS.md)**

This document consolidates all planned improvements across the Tailtown testing strategy, including E2E expansion, visual regression testing, performance testing, and CI/CD enhancements.

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest](https://github.com/visionmedia/supertest)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
