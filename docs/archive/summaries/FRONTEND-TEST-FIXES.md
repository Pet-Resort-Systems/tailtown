# Frontend Test Fixes

## Current Status
- **Total Test Suites**: 52
- **Passing**: 28 (54%)
- **Failing**: 24 (46%)
- **Total Tests**: 806
- **Passing**: 695 (86%)
- **Failing**: 106 (13%)
- **Skipped**: 5 (1%)

## Failure Categories

### 1. Mock Setup Issues (24 failures)
**Error**: `TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')`

**Cause**: Service mocks not properly initialized before tests run.

**Files Affected**:
- `ReservationForm.test.tsx`
- `GroomerSelector.test.tsx`
- Various service tests

**Fix Strategy**:
```typescript
// Before each test, ensure mocks are properly set up
beforeEach(() => {
  jest.clearAllMocks();
  (serviceName.method as jest.Mock) = jest.fn().mockResolvedValue({});
});
```

### 2. Date/Time Equality Issues (26 failures)
**Error**: `expect(received).toBe(expected) // Object.is equality`

**Cause**: Date objects or timestamps not matching exactly due to:
- Timezone differences
- Millisecond precision
- Date object vs string comparison

**Files Affected**:
- `reservationManagementService.test.ts`
- `availabilityService.test.ts`
- `availabilityLogic.test.ts`
- `GroomerAvailability.test.tsx`

**Fix Strategy**:
```typescript
// Use date matchers instead of toBe
expect(result).toEqual(expected); // For objects
expect(new Date(result)).toEqual(new Date(expected)); // For dates

// Or use date-specific matchers
expect(result).toBeCloseTo(expected, 0); // For numbers
```

### 3. UI Element Not Found (30+ failures)
**Error**: `TestingLibraryElementError: Unable to find an element with the text: ...`

**Cause**: 
- Components not rendering completely
- Async data not loaded
- Text split across multiple elements
- Missing test IDs

**Files Affected**:
- `UpcomingClasses.test.tsx`
- `TenantStatusManager.test.tsx`
- `SimpleVaccinationBadge.test.tsx`
- `StaffScheduleForm.test.tsx`

**Fix Strategy**:
```typescript
// Use more flexible matchers
screen.getByText(/text/i); // Case insensitive regex

// Wait for async rendering
await waitFor(() => {
  expect(screen.getByText('text')).toBeInTheDocument();
});

// Use test IDs for complex elements
<button data-testid="enroll-button">Enroll Pet</button>
screen.getByTestId('enroll-button');
```

### 4. Form Control Association Issues (4 failures)
**Error**: `Found a label with the text of: /staff member/i, however no form control was found associated to that label`

**Cause**: Label not properly associated with input using `htmlFor` or `aria-labelledby`.

**Files Affected**:
- `StaffScheduleForm.test.tsx`

**Fix Strategy**:
```typescript
// Ensure labels are properly associated
<label htmlFor="staff-select">Staff Member</label>
<select id="staff-select">...</select>

// Or use aria-labelledby
<select aria-labelledby="staff-label">...</select>
```

## Priority Fixes

### High Priority (Blocking CI/CD)
1. ✅ Fix mock setup issues (24 tests)
2. ✅ Fix date comparison issues (26 tests)

### Medium Priority (Improve Coverage)
3. Fix UI element finding (30+ tests)
4. Fix form control associations (4 tests)

### Low Priority (Nice to Have)
5. Add missing test IDs
6. Improve test data setup
7. Add more edge case tests

## Action Plan

### Phase 1: Mock Setup Fixes
**Target**: Fix 24 failing tests

**Steps**:
1. Identify all files with mock setup issues
2. Add proper `beforeEach` setup
3. Ensure mocks are cleared between tests
4. Verify mock return values match expected types

**Files to Fix**:
- [ ] `src/components/reservations/__tests__/ReservationForm.test.tsx`
- [ ] `src/components/reservations/__tests__/GroomerSelector.test.tsx`
- [ ] `src/services/__tests__/serviceManagement.test.ts`
- [ ] `src/hooks/__tests__/useDashboardData.test.ts`

### Phase 2: Date/Time Fixes
**Target**: Fix 26 failing tests

**Steps**:
1. Replace `toBe` with `toEqual` for objects
2. Use date-specific matchers
3. Normalize timezones in tests
4. Mock `Date.now()` for consistent results

**Files to Fix**:
- [ ] `src/services/__tests__/reservationManagementService.test.ts`
- [ ] `src/services/__tests__/availabilityService.test.ts`
- [ ] `src/utils/__tests__/availabilityLogic.test.ts`
- [ ] `src/components/reservations/__tests__/GroomerAvailability.test.tsx`

### Phase 3: UI Element Fixes
**Target**: Fix 30+ failing tests

**Steps**:
1. Add `data-testid` attributes to complex components
2. Use regex matchers for flexible text matching
3. Add proper `waitFor` for async rendering
4. Mock API responses consistently

**Files to Fix**:
- [ ] `src/components/dashboard/__tests__/UpcomingClasses.test.tsx`
- [ ] `src/components/super-admin/__tests__/TenantStatusManager.test.tsx`
- [ ] `src/components/pets/__tests__/SimpleVaccinationBadge.test.tsx`
- [ ] `src/components/check-in/__tests__/MedicationForm.test.tsx`
- [ ] `src/components/check-in/__tests__/BelongingsForm.test.tsx`

### Phase 4: Form Control Fixes
**Target**: Fix 4 failing tests

**Steps**:
1. Add proper `htmlFor` attributes to labels
2. Ensure inputs have matching `id` attributes
3. Use `aria-labelledby` where appropriate

**Files to Fix**:
- [ ] `src/components/staff/__tests__/StaffScheduleForm.test.tsx`

## Quick Wins

These can be fixed quickly with minimal changes:

1. **Mock Setup Template**:
```typescript
// Add to all affected test files
beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup all mocks
  (service.method as jest.Mock) = jest.fn().mockResolvedValue(mockData);
});
```

2. **Date Comparison Fix**:
```typescript
// Replace all instances of:
expect(result).toBe(expected);

// With:
expect(result).toEqual(expected);
```

3. **Flexible Text Matching**:
```typescript
// Replace:
screen.getByText('Exact Text');

// With:
screen.getByText(/exact text/i);
```

## Testing the Fixes

After each phase, run:
```bash
cd frontend
npm test -- --watchAll=false
```

Target metrics:
- Phase 1: 82 failures → 58 failures
- Phase 2: 58 failures → 32 failures
- Phase 3: 32 failures → 2 failures
- Phase 4: 2 failures → 0 failures

## Long-term Improvements

1. **Add Test Utilities**:
   - Create `renderWithProviders()` helper
   - Create `mockAllServices()` helper
   - Create `waitForLoadingToFinish()` helper

2. **Improve Test Data**:
   - Create factory functions for test data
   - Use consistent mock data across tests
   - Add data builders for complex objects

3. **Add E2E Tests**:
   - Use Playwright for critical user flows
   - Test actual API integration
   - Test real database interactions

4. **CI/CD Integration**:
   - Run tests on every PR
   - Block merges on test failures
   - Generate coverage reports
   - Track test metrics over time

## Resources

- [Testing Library Best Practices](https://testing-library.com/docs/queries/about#priority)
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
