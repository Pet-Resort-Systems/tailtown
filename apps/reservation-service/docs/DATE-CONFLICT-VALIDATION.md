# Reservation Date Conflict Validation

This document describes the implementation of date conflict validation in the reservation service, which ensures that resources are not double-booked and pets are not scheduled for multiple services at the same time.

## Overview

The date conflict validation system provides comprehensive checks for:

1. **Resource Availability**: Ensures a resource is not booked for overlapping time periods
2. **Pet Availability**: Prevents a pet from being booked for multiple services at the same time
3. **Suite Type Availability**: Checks if any resources of a requested suite type are available

## Implementation Details

### Conflict Detection Utility

We've implemented a reusable utility function `detectReservationConflicts` in `src/utils/reservation-conflicts.ts` that centralizes all conflict detection logic. This utility:

- Takes parameters including dates, resource ID, pet ID, and tenant ID
- Returns detailed conflict information including warnings and conflicting reservations
- Handles different types of conflicts (resource, pet, suite type)
- Supports both creation and update operations

### Integration with Reservation Controller

The conflict detection utility is integrated into:

1. **createReservation**: Checks for conflicts before creating a new reservation
2. **updateReservation**: Validates that changes don't create conflicts with existing reservations

### Conflict Types

#### Resource Conflicts

When a specific resource is requested, the system checks if that resource is already booked for any overlapping time period. This prevents double-booking of resources.

```typescript
// Example: Resource conflict check
const conflictResult = await detectReservationConflicts({
  startDate: parsedStartDate,
  endDate: parsedEndDate,
  resourceId,
  tenantId,
  petId
});

if (conflictResult.hasConflicts) {
  // Handle conflict
}
```

#### Pet Conflicts

The system checks if a pet is already booked for another service during the requested time period. This prevents scheduling conflicts for pets.

```typescript
// Example: Pet conflict check
const petConflictResult = await detectReservationConflicts({
  startDate: parsedStartDate,
  endDate: parsedEndDate,
  tenantId,
  petId,
  suiteType: determinedSuiteType
});
```

#### Suite Type Availability

When no specific resource is requested but a suite type is specified, the system checks if any resources of that type are available during the requested time period.

## Conflict Resolution

When conflicts are detected, the system:

1. Logs detailed information about the conflict
2. Returns appropriate HTTP status codes (409 Conflict)
3. Provides detailed error messages to help users understand and resolve the conflict

## Error Messages

The system provides specific error messages for different conflict types:

- Resource conflicts: "Resource is not available for the requested dates. There are X overlapping reservations."
- Pet conflicts: "Pet already has X overlapping reservation(s) during the requested dates."
- Suite type conflicts: "All [SUITE_TYPE] suites are booked for the requested dates."

## Integration with Schema Alignment Strategy

The conflict detection system is designed to work with our schema alignment strategy:

- Uses defensive programming to handle potential schema mismatches
- Gracefully handles missing fields or tables
- Provides meaningful fallbacks when schema validation fails

## Future Enhancements

Potential future enhancements to the conflict validation system:

1. Add conflict visualization for the frontend
2. Implement suggested alternative dates/times when conflicts are detected
3. Add capacity-based conflict detection for group services
4. Implement waitlist functionality for fully booked resources

## Testing

To test the conflict detection system:

1. Create a reservation for a specific resource and time period
2. Attempt to create another reservation for the same resource with overlapping dates
3. Verify that the system correctly identifies and reports the conflict
4. Test pet conflict detection by booking the same pet for multiple services at the same time
5. Test suite type availability by booking all resources of a specific type and then attempting to create a new reservation for that type
