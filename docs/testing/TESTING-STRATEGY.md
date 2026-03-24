# Testing Strategy - Customer Booking Portal

**Last Updated**: March 24, 2026  
**Status**: Test Foundation Created

## Overview

This document outlines the testing strategy for the Customer Booking Portal, including test coverage goals, testing approaches, and implementation guidelines.

## Test Coverage Goals

### Critical Components (Priority 1)

- ✅ **ServiceSelection** - Service cards with Reserve Now buttons
- ✅ **DateTimeSelection** - Inline calendars with brand colors
- ✅ **PetSelection** - Auto-select single pet feature
- ✅ **ReviewBooking** - Payment form with CardConnect
- ✅ **PaymentService** - CardConnect API integration

### Supporting Components (Priority 2)

- **AddOnsSelection** - Optional service enhancements
- **CustomerInfo** - Auto-filled customer information
- **BookingConfirmation** - Success page with transaction details
- **CustomerAuth** - Login/signup functionality

### Integration Tests (Priority 3)

- Complete booking flow (end-to-end)
- Payment processing integration
- API error handling
- State management across steps

## Test Files Created

### 1. ServiceSelection.test.tsx

**Location**: `frontend/src/pages/booking/steps/__tests__/ServiceSelection.test.tsx`

**Test Coverage**:

- Component rendering and loading states
- Service display (name, price, description, duration)
- Reserve Now button functionality
- Auto-advance after selection (300ms delay)
- Service category grouping (Boarding/Daycare first)
- Error handling (failed load, no services)
- Accessibility (ARIA labels, keyboard navigation)
- Compact design validation

**Key Test Cases**:

```typescript
- should render the component with title
- should display all services after loading
- should call onUpdate when Reserve Now is clicked
- should auto-advance after selecting a service
- should group services by category
- should display boarding and daycare first
- should display error message when services fail to load
- should have proper ARIA labels
```

### 2. DateTimeSelection.test.tsx

**Location**: `frontend/src/pages/booking/steps/__tests__/DateTimeSelection.test.tsx`

**Test Coverage**:

- Inline calendar rendering
- Date validation (no past dates)
- End date dependency on start date
- Continue button state management
- Navigation (Back/Continue buttons)
- Brand color application (#126f9f)
- Mobile responsiveness
- Accessibility

**Key Test Cases**:

```typescript
- should render the component with title
- should display start and end date labels
- should have Continue button disabled when no dates selected
- should display message when end date is disabled
- should prevent selecting past dates
- should apply brand color to calendars
- should be keyboard navigable
```

### 3. PetSelection.test.tsx

**Location**: `frontend/src/pages/booking/steps/__tests__/PetSelection.test.tsx`

**Test Coverage**:

- Auto-select single pet optimization
- Manual multi-pet selection
- Active/inactive pet filtering
- Pet card display (name, breed, species)
- Selection state management
- Error handling (no pets, load failure)
- Accessibility
- Navigation

**Key Test Cases**:

```typescript
- should auto-select when customer has only one pet
- should not auto-select when customer has multiple pets
- should filter out inactive pets before auto-select
- should allow selecting multiple pets
- should allow deselecting a pet
- should display error when pets fail to load
- should display message when customer has no pets
```

### 4. paymentService.test.ts

**Location**: `frontend/src/services/__tests__/paymentService.test.ts`

**Test Coverage**:

- CardConnect payment processing
- Success/decline/error scenarios
- Payment data structure validation
- Network error handling
- Security (masked card numbers, no logging)
- Test card data retrieval
- Optional billing information

**Key Test Cases**:

```typescript
- should successfully process a payment
- should handle declined payments
- should handle network errors
- should send correct payment data structure
- should include optional billing information
- should not log sensitive card data
- should return masked card number in response
- should handle different amount formats
```

## Testing Best Practices

### DO ✅

- Test user-facing functionality
- Mock external dependencies (APIs, services)
- Test error scenarios and edge cases
- Validate accessibility features
- Test mobile responsiveness
- Use descriptive test names
- Group related tests with describe blocks
- Clean up after each test (beforeEach/afterEach)

### DON'T ❌

- Test implementation details
- Skip error handling tests
- Ignore accessibility
- Write brittle tests dependent on exact DOM structure
- Test third-party library internals
- Leave console errors unaddressed

## Test Execution

### Run All Tests

```bash
pnpm --dir apps/frontend test
```

### Run Booking Portal Tests Only

```bash
pnpm --dir apps/frontend test -- --testPathPattern="booking/steps/__tests__|paymentService.test"
```

### Run with Coverage

```bash
pnpm --dir apps/frontend test -- --coverage --watchAll=false
```

### Run Specific Test File

```bash
pnpm --dir apps/frontend test ServiceSelection.test.tsx
```

### Run E2E Coverage for Booking Flows

```bash
pnpm run test:e2e -- e2e/booking-portal.spec.ts
pnpm run test:e2e:headed e2e/booking-portal.spec.ts
```

## Current Test Status

### ✅ Completed

- Test files created for all critical components
- 145+ test cases written
- Comprehensive coverage of booking portal features
- Payment service integration tests
- Accessibility tests included
- Error handling scenarios covered

### 🔄 In Progress

- Fixing test implementation to match actual components
- Adding integration tests for complete booking flow
- Improving test reliability and reducing flakiness

### 📋 Pending

- Performance testing
- Load testing for payment service
- Visual regression testing
- Cross-browser compatibility tests

### E2E Coverage Now Lives in the Isolated Workspace

- Playwright tests are maintained in the dedicated `e2e/` pnpm workspace package
- Root scripts delegate to `@tailtown/e2e` via `pnpm run test:e2e*`
- The Playwright app under test is now **[`apps/frontend-vite`](../apps/frontend-vite/)**, not `apps/frontend`
    - Booking portal scenarios should be added there instead of under `apps/frontend`. Check [`booking-portal.spec.ts`](/e2e/booking-portal.spec.ts)

## Integration with CI/CD

### GitHub Actions Workflow

```yaml
name: Frontend And E2E Tests

on: [push, pull_request]

jobs:
    frontend:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v2
            - name: Install dependencies
              run: pnpm install --frozen-lockfile
            - name: Run tests
              run: pnpm --dir apps/frontend test -- --coverage --watchAll=false
    e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v2
            - name: Install dependencies
              run: pnpm install --frozen-lockfile
            - name: Run isolated e2e suite
              run: pnpm run test:e2e
              # targets apps/frontend-vite via e2e/playwright.config.ts
            - name: Upload coverage
              uses: codecov/codecov-action@v2
```

### Pre-commit Hooks

```json
{
    "husky": {
        "hooks": {
            "pre-commit": "pnpm --dir apps/frontend test -- --watchAll=false --bail"
        }
    }
}
```

## Coverage Goals

### Current Coverage

- **Statements**: TBD (run `pnpm --dir apps/frontend test -- --coverage --watchAll=false`)
- **Branches**: TBD
- **Functions**: TBD
- **Lines**: TBD

### Target Coverage

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Critical Paths (100% Coverage Required)

- Payment processing
- User authentication
- Data validation
- Error handling

## Test Data

### Mock Services

```typescript
const mockServices = [
    {
        id: 'service-1',
        name: 'Overnight Boarding',
        serviceCategory: 'BOARDING',
        price: 45.0,
        duration: 1440,
    },
];
```

### Mock Pets

```typescript
const mockPets = [
    {
        id: 'pet-1',
        name: 'Max',
        species: 'Dog',
        breed: 'Golden Retriever',
        isActive: true,
    },
];
```

### Test Payment Data

```typescript
const validPaymentRequest = {
    amount: 100.0,
    cardNumber: '4788250000028291', // Test card
    expiry: '1225',
    cvv: '123',
    name: 'John Doe',
    email: 'john@example.com',
    capture: true,
};
```

## Accessibility Testing

### WCAG 2.1 AA Compliance

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA labels
- ✅ Focus management
- ✅ Color contrast
- ✅ Semantic HTML

### Testing Tools

- @testing-library/react (built-in accessibility checks)
- axe-core (automated accessibility testing)
- Manual keyboard navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)

## Performance Testing

### Metrics to Track

- Component render time
- API response time
- Payment processing time
- Page load time
- Time to interactive

### Tools

- React DevTools Profiler
- Lighthouse
- WebPageTest
- Chrome DevTools Performance tab

## Security Testing

### Payment Security

- ✅ No card data logging
- ✅ Masked card numbers in responses
- ✅ HTTPS required for production
- ✅ PCI-DSS compliance
- ✅ Input validation

### Authentication Security

- Session management
- JWT token validation
- CSRF protection
- XSS prevention
- SQL injection prevention

## Future Enhancements

For a comprehensive list of planned testing improvements and future enhancements, refer to the centralized roadmap:

**[Testing Future Enhancements](./FUTURE-ENHANCEMENTS.md)**

This document includes detailed plans for:

- E2E testing expansion
- Visual regression testing
- Performance and load testing
- Security testing enhancements
- CI/CD pipeline improvements
- Advanced testing techniques

## Resources

### Documentation

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Internal Docs

- `docs/TEST-COVERAGE.md` - Coverage guidelines
- `docs/CUSTOMER-BOOKING-PORTAL.md` - Feature documentation
- `README.md` - Quick start guide

## Maintenance

### Weekly Tasks

- Review test failures
- Update test data
- Check coverage metrics
- Address flaky tests

### Monthly Tasks

- Review and update test strategy
- Evaluate new testing tools
- Performance benchmarking
- Security audit

### Quarterly Tasks

- Comprehensive test suite review
- Update testing documentation
- Team training on testing best practices
- Tool and framework updates

---

**Status**: Foundation created, implementation in progress  
**Next Steps**: Fix test implementations to match actual components  
**Owner**: Development Team  
**Last Review**: March 24, 2026
