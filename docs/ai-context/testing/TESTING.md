# Frontend Testing Guide

## Overview

This document describes the automated tests for the Tailtown frontend application.

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests in watch mode (recommended for development)
```bash
pnpm test -- --watch
```

### Run tests with coverage report
```bash
pnpm run test:coverage
```

### Run specific test file
```bash
pnpm test -- KennelCardPrint.test
```

### Run tests matching a pattern
```bash
pnpm test -- --testNamePattern="timezone"
```

## Test Coverage

### Kennel Card Print Feature
**Location:** `src/pages/__tests__/KennelCardPrint.test.tsx`

Tests cover:
- ✅ Loading state while fetching reservation data
- ✅ Successful rendering of kennel card with reservation data
- ✅ Parsing pet icons from JSON string format
- ✅ Handling empty pet icons (no fake defaults)
- ✅ Error handling for failed API calls
- ✅ Validation of invalid reservation data
- ✅ Auto-triggering print dialog after render
- ✅ Fallback values for missing optional fields

**Run these tests:**
```bash
pnpm test -- KennelCardPrint.test
```

### Timezone Management Feature
**Location:** `src/services/__tests__/tenantService.timezone.test.ts`

Tests cover:
- ✅ Returning cached timezone from localStorage
- ✅ Fetching timezone from API when not cached
- ✅ Falling back to default timezone on API errors
- ✅ Using default timezone when tenant has none set
- ✅ Fetching tenant by subdomain
- ✅ Including authorization headers in requests
- ✅ Handling API errors gracefully
- ✅ Caching timezone after successful fetch
- ✅ Supporting multiple timezone formats

**Run these tests:**
```bash
pnpm test -- tenantService.timezone.test
```

## Test Structure

Tests use:
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation

## Best Practices

1. **Test user behavior, not implementation details**
   - Focus on what users see and do
   - Avoid testing internal state or methods

2. **Use semantic queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Mock external dependencies**
   - Mock API calls with `jest.mock()`
   - Mock browser APIs like `window.print()`

4. **Clean up after tests**
   - Clear mocks with `jest.clearAllMocks()`
   - Clear localStorage in `beforeEach`

## Continuous Integration

These tests should be run automatically in CI/CD pipeline before deployment:

```bash
# In CI pipeline
pnpm run test:coverage -- --watchAll=false --ci
```

## Adding New Tests

When adding new features, create corresponding test files:

1. Create test file next to the component: `ComponentName.test.tsx`
2. Or create in `__tests__` directory: `__tests__/ComponentName.test.tsx`
3. Follow existing test patterns
4. Aim for >80% code coverage on critical features

## Debugging Tests

### Run tests in debug mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome and click "inspect"

### View test output
```bash
pnpm test -- --verbose
```

### Update snapshots (if using snapshot tests)
```bash
pnpm test -- -u
```

## Known Issues

- Some Material-UI components may require additional setup for proper testing
- Print functionality tests use `jest.useFakeTimers()` to control timing
- Network mocks use `global.fetch` instead of axios for some components

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
