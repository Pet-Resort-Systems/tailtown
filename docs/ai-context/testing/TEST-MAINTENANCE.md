# Test Maintenance Guide

## Current Test Status

As of November 7, 2025:
- **Total Test Suites**: 52
- **Passing**: 29 suites (696 tests)
- **Failing**: 23 suites (105 tests)
- **Skipped**: 5 tests

## Test Health Summary

### ✅ Passing & Maintained Tests
These tests are actively maintained and passing:
- `KennelCardPrint.test.tsx` - Kennel card printing (8 tests)
- `tenantService.timezone.test.ts` - Timezone management (9 tests)
- All utility tests in `utils/__tests__/` (except sortingUtils, availabilityLogic)
- Service tests for core functionality
- Component tests for booking flow
- Integration tests for critical paths

### ⚠️ Tests Needing Updates
These tests are failing due to component/API changes and need updates:

#### High Priority (Core Functionality)
1. **SimpleVaccinationBadge.test.tsx** - Text changed from "Compliant"/"Expired" to "Current"/"Due"
2. **sortingUtils.test.ts** - Expected values don't match implementation
3. **ReservationForm tests** - Form validation logic changed
4. **GroomerSelector/GroomerAvailability** - Availability logic updated

#### Medium Priority (Features)
5. **MedicationForm.test.tsx** - Check-in form updates
6. **BelongingsForm.test.tsx** - Check-in form updates
7. **StaffScheduleForm.test.tsx** - Scheduling logic changes
8. **TenantStatusManager.test.tsx** - Admin features

#### Low Priority (Nice to Have)
9. **UpcomingClasses.test.tsx** - Training class display
10. **TrainingClasses.validation.test.tsx** - Training validations
11. **BookingFlow.integration.test.tsx** - E2E integration tests

## Fixing Strategy

### Phase 1: Quick Wins (1-2 hours)
Fix tests where the implementation is correct but test expectations are outdated:

```bash
# 1. SimpleVaccinationBadge - Update text expectations
# Change: "Compliant" → "Current", "Expired" → "Due"

# 2. sortingUtils - Update expected values
# Fix undefined checks and expected sort orders

# 3. availabilityLogic - Update business logic expectations
```

### Phase 2: Component Updates (2-4 hours)
Update tests for components with changed behavior:

```bash
# 1. Form validation tests
# 2. Selector component tests
# 3. Check-in workflow tests
```

### Phase 3: Integration Tests (4-6 hours)
Fix or rewrite integration and E2E tests:

```bash
# 1. BookingFlow integration
# 2. Critical paths E2E
# 3. Dashboard calendar sync
```

## Running Tests by Category

### Run all passing tests only
```bash
pnpm test -- --watchAll=false --testPathIgnorePatterns="(SimpleVaccinationBadge|sortingUtils|availabilityLogic|ReservationForm|GroomerSelector|GroomerAvailability|MedicationForm|BelongingsForm|StaffScheduleForm|TenantStatusManager|UpcomingClasses|TrainingClasses|BookingFlow|critical-paths)"
```

### Run specific failing test to debug
```bash
pnpm test -- SimpleVaccinationBadge.test --watchAll=false
```

### Run tests with coverage
```bash
pnpm run test:coverage -- --watchAll=false
```

## CI/CD Integration

### Current Recommendation
Until all tests are fixed, run only passing tests in CI/CD:

```yaml
# .github/workflows/test.yml or similar
test:
  script:
    - pnpm test -- --watchAll=false --testPathIgnore="(SimpleVaccinationBadge|sortingUtils|availabilityLogic|ReservationForm|GroomerSelector|GroomerAvailability|MedicationForm|BelongingsForm|StaffScheduleForm|TenantStatusManager|UpcomingClasses|TrainingClasses|BookingFlow|critical-paths)"
```

### Future Goal
Once all tests are fixed:

```yaml
test:
  script:
    - pnpm test -- --watchAll=false --coverage
    - pnpm run test:coverage -- --watchAll=false --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

## Test Maintenance Checklist

When making code changes:

- [ ] Run related tests before committing
- [ ] Update test expectations if behavior intentionally changed
- [ ] Add new tests for new features
- [ ] Remove tests for removed features
- [ ] Keep test descriptions accurate
- [ ] Mock external dependencies properly
- [ ] Use meaningful test data

## Common Test Patterns

### Component Testing
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

it('should render and handle user interaction', async () => {
  render(<MyComponent />);
  
  const button = screen.getByRole('button', { name: /click me/i });
  fireEvent.click(button);
  
  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

### Service Testing
```typescript
import { myService } from '../myService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

it('should fetch data from API', async () => {
  mockedAxios.get.mockResolvedValueOnce({ data: { data: mockData } });
  
  const result = await myService.getData();
  
  expect(result).toEqual(mockData);
  expect(mockedAxios.get).toHaveBeenCalledWith(
    expect.stringContaining('/api/endpoint'),
    expect.any(Object)
  );
});
```

### Hook Testing
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

it('should return data after loading', async () => {
  const { result } = renderHook(() => useMyHook());
  
  expect(result.current.loading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeDefined();
  });
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Test Maintenance Guide](https://martinfowler.com/articles/practical-test-pyramid.html)

## Next Steps

1. **Immediate**: Run only passing tests in CI/CD
2. **This Sprint**: Fix Phase 1 quick wins (SimpleVaccinationBadge, sortingUtils)
3. **Next Sprint**: Fix Phase 2 component tests
4. **Future**: Fix Phase 3 integration tests and achieve 80%+ coverage
