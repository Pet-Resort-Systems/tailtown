# Reservation Service Tests

## Overview

This directory contains comprehensive tests for the reservation service, focusing on critical business logic including pagination, kennel assignment validation, and double-booking prevention.

## Test Files

### 1. `reservation-pagination.test.ts`
Tests for API pagination limits and filtering.

**Coverage:**
- ✅ Default limit of 10 reservations
- ✅ Maximum limit of 500 reservations
- ✅ Limit validation (rejects > 500, negative, non-numeric)
- ✅ Dashboard use case (250 reservations)
- ✅ Customer-specific pagination
- ✅ Pagination with filtering (date, status)
- ✅ Page-based pagination (skip/take calculation)
- ✅ Pagination metadata in responses

**Key Tests:**
- Validates increased limit from 100 to 500 (Oct 21, 2025 update)
- Ensures dashboard can load all daily appointments
- Tests limit enforcement and warning messages

### 2. `kennel-assignment.test.ts`
Tests for mandatory kennel assignment validation.

**Coverage:**
- ✅ Boarding services require resourceId
- ✅ Daycare services require resourceId
- ✅ Grooming services do NOT require resourceId
- ✅ Resource existence validation
- ✅ Auto-assign support (empty string)
- ✅ Suite type validation for auto-assignment
- ✅ Update validation (cannot remove kennel from boarding)
- ✅ Multi-tenant resource validation

**Key Tests:**
- Validates mandatory kennel assignment feature (Oct 21, 2025)
- Tests service-specific requirements
- Ensures auto-assign option works correctly

### 3. `double-booking-prevention.test.ts`
Tests for preventing kennel overbooking and conflicts.

**Coverage:**
- ✅ Overlapping date detection (all scenarios)
- ✅ Exact date overlap
- ✅ Partial overlaps (start/end during existing)
- ✅ Complete containment
- ✅ Non-overlapping dates (should allow)
- ✅ Cancelled reservations ignored
- ✅ Active status filtering
- ✅ Edit mode (exclude own reservation)
- ✅ Conflict detection when changing kennels
- ✅ Conflict detection when extending dates
- ✅ Query optimization (resource-specific, date-range)
- ✅ Multi-tenant conflict isolation

**Key Tests:**
- Validates double-booking prevention logic
- Tests all overlap scenarios
- Ensures edit mode works correctly

## Running Tests

### Run all tests:
```bash
npm test
```

### Run specific test file:
```bash
npm test -- reservation-pagination.test.ts
npm test -- kennel-assignment.test.ts
npm test -- double-booking-prevention.test.ts
```

### Run with coverage:
```bash
npm test -- --coverage
```

### Watch mode:
```bash
npm test -- --watch
```

## Test Implementation Status

### ✅ Completed
- Test file structure created
- Comprehensive test cases documented
- Mock helpers available
- Test scenarios cover all business logic

### ⏱️ Pending
- Controller implementation alignment
- Mock data refinement
- Integration with actual Prisma client
- E2E test scenarios

## Expected Behavior

### Pagination
- Default: 10 reservations per page
- Maximum: 500 reservations per page
- Invalid limits: Use default with warning
- Supports filtering and sorting

### Kennel Assignment
- **BOARDING**: Requires resourceId OR (empty resourceId + suiteType)
- **DAYCARE**: Requires resourceId OR (empty resourceId + suiteType)
- **GROOMING**: Does NOT require resourceId
- **TRAINING**: Does NOT require resourceId

### Double-Booking
- Prevents overlapping reservations on same kennel
- Ignores CANCELLED reservations
- Checks only CONFIRMED, CHECKED_IN, CHECKED_OUT statuses
- Edit mode excludes current reservation from conflicts
- Multi-tenant: Only checks within same organization

## Test Data Helpers

Located in `utils/test-helpers.ts`:

- `createMockPrismaClient()` - Mock Prisma client
- `createMockRequest()` - Mock Express request
- `createMockResponse()` - Mock Express response
- `createMockNext()` - Mock Express next function
- `createTestReservation()` - Test reservation data
- `createTestResource()` - Test resource data
- `createTestCustomer()` - Test customer data
- `createTestPet()` - Test pet data

## Integration with Controllers

These tests validate the expected behavior of:

- `get-reservation.controller.ts` - Pagination and filtering
- `customer-reservation.controller.ts` - Customer-specific pagination
- `create-reservation.controller.ts` - Kennel assignment and conflict detection
- `update-reservation.controller.ts` - Update validation and conflict detection

## Next Steps

1. **Align controller implementations** with test expectations
2. **Add integration tests** with real database
3. **Add E2E tests** for complete reservation flows
4. **Measure code coverage** and fill gaps
5. **Add performance tests** for high-volume scenarios

## Related Documentation

- [Reservation Service README](../../README.md)
- [Controller Documentation](../../controllers/reservation/README.md)
- [Schema Documentation](../../../prisma/schema.prisma)
- [Frontend Tests](../../../../frontend/src/components/reservations/__tests__/README.md)

## Change Log

### October 21, 2025
- Created comprehensive backend test suite
- Added pagination limit tests (500 max)
- Added kennel assignment validation tests
- Added double-booking prevention tests
- Documented all test scenarios and expected behavior
