# Dashboard and Calendar Synchronization Tests

## Overview

These tests ensure that the dashboard metrics (In, Out, Overnight counts) always match what's displayed on the calendar for the same date. They also validate correct timezone handling to prevent UTC vs local time bugs.

## Running the Tests

```bash
# From the frontend directory
cd frontend

# Run all tests
npm test

# Run only dashboard-calendar sync tests
npm test dashboard-calendar-sync

# Run only timezone handling tests
npm test timezone-handling

# Run tests in watch mode
npm test -- --watch
```

## What the Tests Validate

### 1. **IN Count Accuracy**
- Counts reservations checking in today (start date = today)
- Should match pets arriving on the calendar

### 2. **OUT Count Accuracy**
- Counts reservations checking out today (end date = today)
- Should match pets leaving on the calendar

### 3. **OVERNIGHT Count Accuracy**
- Counts reservations staying overnight (active today, ending after today)
- Should match pets staying on the calendar

### 4. **Calendar Occupancy Matching**
- Ensures all active reservations on calendar are accounted for in dashboard
- Validates that dashboard metrics cover all calendar entries

### 5. **Timezone Handling** ⭐ NEW
- Validates correct conversion from UTC timestamps to local dates
- Prevents bugs like "6:48pm local = next day" (UTC midnight crossing)
- Tests edge cases: midnight crossings, DST transitions, cross-timezone consistency
- Ensures dashboard and calendar use identical date extraction logic

## Test Scenarios

### Standard Cases
- ✅ Same-day reservations (check-in and check-out today)
- ✅ Multi-day stays starting today
- ✅ Multi-day stays that started yesterday
- ✅ Reservations ending today

### Edge Cases
- ✅ Reservations spanning multiple days
- ✅ Overlapping reservations
- ✅ Reservations with different statuses
- ✅ Midnight crossings (11:59pm vs 12:01am)
- ✅ Daylight saving time transitions
- ✅ UTC timestamps that cross date boundaries in local time

## Validation Rules

The tests enforce these key rules:

1. **Every reservation on the calendar must be counted in at least one dashboard metric**
2. **IN count must equal the number of reservations starting today (local timezone)**
3. **OUT count must equal the number of reservations ending today (local timezone)**
4. **OVERNIGHT count must equal active reservations ending after today**
5. **Calendar occupancy = all reservations overlapping with today**
6. **Date extraction must use Date objects, NOT string splitting on 'T'** ⭐
7. **Dashboard and calendar must use identical date extraction logic** ⭐

## Example Test Output

```
Dashboard and Calendar Synchronization
  ✓ should calculate correct IN count for reservations starting today
  ✓ should calculate correct OUT count for reservations ending today
  ✓ should calculate correct OVERNIGHT count for reservations staying overnight
  ✓ should match calendar occupancy with total active reservations
  ✓ should have consistent logic between dashboard and calendar
  ✓ should handle edge case: same-day reservation
  ✓ should handle edge case: multi-day stay that started yesterday

Dashboard Metrics Validation Rules
  ✓ should ensure IN + OVERNIGHT >= total calendar occupancy
  ✓ should ensure calendar occupancy includes all dashboard categories

Timezone Handling
  ✓ should correctly extract local date from UTC timestamp
  ✓ should NOT use split on T for date extraction
  ✓ should correctly identify check-outs on a given day
  ✓ should correctly identify check-ins on a given day
  ✓ should handle midnight crossings correctly
  ✓ should handle daylight saving time transitions
  ✓ should handle different timezones consistently
  ✓ should use consistent date formatting across the app
  ✓ should pad single-digit months and days with zeros

Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
```

## Debugging Failed Tests

If tests fail, check:

1. **Dashboard.tsx logic** - Ensure date normalization matches test logic
2. **Calendar filtering** - Verify active reservation filtering
3. **Date comparison** - Check timezone handling and midnight normalization
4. **API responses** - Ensure backend returns consistent date formats

## Adding New Test Cases

To add new test scenarios:

1. Add mock reservation data to `mockReservations` array
2. Create a new test case using the helper functions:
   - `calculateDashboardMetrics(reservations, targetDate)`
   - `calculateCalendarOccupancy(reservations, targetDate)`
3. Add assertions to validate expected behavior

Example:

```typescript
it('should handle new edge case', () => {
  const customReservations = [
    {
      id: 'test-1',
      startDate: '2025-09-30T09:00:00.000Z',
      endDate: '2025-10-02T17:00:00.000Z',
      status: 'CONFIRMED',
      pet: { name: 'TestPet' },
      customer: { firstName: 'Test', lastName: 'User' }
    }
  ];
  
  const metrics = calculateDashboardMetrics(customReservations, testDate);
  const calendar = calculateCalendarOccupancy(customReservations, testDate);
  
  expect(metrics.inCount).toBe(1);
  expect(calendar.totalOccupied).toBe(1);
});
```

## Continuous Integration

These tests should be run:
- ✅ Before every commit
- ✅ In CI/CD pipeline
- ✅ Before deploying to production
- ✅ After any changes to dashboard or calendar logic

## Related Files

- `/frontend/src/pages/Dashboard.tsx` - Dashboard metrics calculation
- `/frontend/src/hooks/useKennelData.ts` - Calendar data loading
- `/frontend/src/components/calendar/KennelCalendar.tsx` - Calendar display logic
