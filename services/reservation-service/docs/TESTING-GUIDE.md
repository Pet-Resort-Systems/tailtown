# Testing Guide for Reservation Service

This document outlines the testing patterns and best practices established for the Reservation Service. Following these guidelines will ensure consistent, reliable, and maintainable tests across the codebase.

## Current Test Status

**Last Updated**: November 24, 2025

| Metric        | Value                  |
| ------------- | ---------------------- |
| Tests Passing | 59                     |
| Tests Skipped | 13 (integration tests) |
| Tests Failing | 0                      |

### Passing Test Files

1. `src/tests/utils/reservation-conflicts.test.ts` - 8 tests
2. `src/tests/timezone.test.ts` - 7 tests
3. `src/__tests__/reservation-overlap.test.ts` - 9 tests
4. `src/tests/controllers/reservation-pagination.test.ts` - 10 tests
5. `src/tests/controllers/double-booking-prevention.test.ts` - 10 tests
6. `src/tests/controllers/kennel-assignment.test.ts` - 9 tests
7. `src/tests/controllers/reservation.controller.test.ts` - 6 tests

### Skipped Test Files (Integration Tests)

- `src/tests/integration/reservation-integration.test.ts`
- `src/tests/controllers/reservation-date-filtering.test.ts`

These require a running database and are excluded from normal test runs via `jest.config.js`.

---

## Test Implementation Patterns

### Controller Testing Pattern

We've established a robust pattern for testing controllers that avoids circular dependencies and ensures proper isolation between tests:

1. **Mock Dependencies Before Importing Controllers**

   ```typescript
   // @ts-nocheck - Required due to mock type mismatches
   import { PrismaClient } from "@prisma/client";

   // Mock the Prisma client BEFORE any imports that use it
   jest.mock("@prisma/client", () => {
     const mockPrismaClient = {
       reservation: {
         findMany: jest.fn(),
         findFirst: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
       },
       // Other models as needed
     };
     return {
       PrismaClient: jest.fn(() => mockPrismaClient),
     };
   });

   // Get the mocked client instance
   const prisma = new PrismaClient();

   // Then import the controller
   import { getReservationById } from "../../controllers/reservation/get-reservation.controller";
   ```

2. **Reset Mocks Between Tests**

   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
     // Reset specific mocks to default values if needed
     mockPrisma.reservation.findFirst.mockResolvedValue(null);
   });
   ```

3. **Test Both Success and Error Paths**

   ```typescript
   it("should return 404 when reservation not found", async () => {
     // Arrange
     mockPrisma.reservation.findFirst.mockResolvedValue(null);

     // Act
     await getReservationById(req, res, next);

     // Assert
     expect(res.status).toHaveBeenCalledWith(404);
     expect(res.json).toHaveBeenCalledWith(
       expect.objectContaining({
         status: "error",
         error: expect.objectContaining({
           message: expect.stringContaining("not found"),
         }),
       })
     );
   });
   ```

4. **Mock Utility Functions**

   ```typescript
   jest.mock("../../utils/reservationUtils", () => ({
     detectReservationConflicts: jest.fn().mockResolvedValue([]),
     generateOrderNumber: jest.fn().mockReturnValue("RES-20250602-001"),
   }));
   ```

5. **Mock Error Classes (Must Extend Error for throw to work)**

   ```typescript
   // AppError mock must extend Error for throw/catch to work properly
   class MockAppError extends Error {
     statusCode: number;
     constructor(message: string, statusCode: number) {
       super(message);
       this.statusCode = statusCode;
     }
     static validationError(msg: string) {
       return new MockAppError(msg, 400);
     }
     static notFoundError(msg: string) {
       return new MockAppError(msg, 404);
     }
     static conflictError(msg: string) {
       return new MockAppError(msg, 409);
     }
     static authorizationError(msg: string) {
       return new MockAppError(msg, 403);
     }
   }

   jest.mock("../../utils/service", () => ({
     AppError: MockAppError,
     safeExecutePrismaQuery: jest.fn().mockImplementation((fn) => fn()),
   }));
   ```

## Best Practices

1. **Test Isolation**

   - Each test should be independent and not rely on the state from previous tests
   - Use `beforeEach` to reset mocks and set up test conditions
   - Avoid shared mutable state between tests

2. **Comprehensive Coverage**

   - Test all controller methods
   - Include tests for success cases, error cases, and edge cases
   - Test tenant validation, input validation, and business logic

3. **Realistic Test Data**

   - Use realistic test data that matches the expected schema
   - Include all required fields in test objects
   - Use helper functions to generate test data for reuse

4. **Clear Assertions**

   - Make assertions specific and clear
   - Test both the status code and response body
   - Verify that the correct error messages are returned

5. **Avoid Circular Dependencies**
   - Always mock dependencies before importing the module under test
   - Use jest.mock() at the top of the file
   - Be careful with imports that might cause circular dependencies

## Example Test Files

See these files for complete examples of the mocking patterns:

- `src/tests/controllers/reservation.controller.test.ts` - Controller CRUD tests
- `src/tests/controllers/reservation-pagination.test.ts` - Pagination and filtering tests
- `src/tests/controllers/double-booking-prevention.test.ts` - Conflict detection tests
- `src/__tests__/reservation-overlap.test.ts` - Overlap prevention tests

## Troubleshooting Common Issues

### "Cannot find module" errors

- Ensure the import path is correct
- Check that the module exists at the specified path
- Verify that the module is included in the TypeScript compilation

### Mock function not called

- Verify that the mock is set up correctly
- Check that the function is being called with the expected arguments
- Ensure that the mock is reset between tests

### Unexpected test interactions

- Look for shared state between tests
- Ensure all mocks are properly reset in beforeEach
- Check for asynchronous operations that might be affecting other tests

## Integration Tests

### Tenant Isolation Tests

We have implemented comprehensive tenant isolation integration tests to ensure proper multi-tenancy security.

**Test File**: `src/__tests__/integration/tenant-isolation-reservations.test.ts`

**Coverage** (All 9/9 tests passing ✅):

1. GET list operations with tenant filtering
2. GET by ID with cross-tenant protection
3. PATCH operations with tenant isolation
4. DELETE operations with tenant isolation
5. Data integrity verification across tenants

**Key Features**:

- Automated test data setup with 2 complete tenant environments
- Real API calls through Supertest
- Verifies tenant boundaries at the HTTP layer
- Runs in CI/CD pipeline

**Running the tests**:

```bash
npm test -- tenant-isolation-reservations --watchAll=false
```

**Security Impact**:
These tests have identified and verified fixes for critical security vulnerabilities, including a cross-tenant DELETE vulnerability that could have allowed data breaches.

## Next Steps

1. ~~Apply these patterns to all controller tests~~ ✅ Done (Nov 24, 2025)
2. Create shared test utilities for common operations
3. Expand tenant isolation tests to other services (invoices, payments, check-ins)
4. Add performance benchmarks for critical paths
5. Add check-in controller tests
6. Convert integration tests to unit tests (optional)
