# Reservation Overlap Prevention

## Overview

This document describes the system for preventing and detecting overlapping reservations in the same suite/room.

## Problem

Previously, all reservations were assigned to the same suite (A01), causing overlaps where multiple pets were booked in the same room at the same time. This is problematic because:

1. **Physical impossibility**: A suite can only hold one pet at a time
2. **Data integrity**: The calendar UI cannot properly display overlapping reservations
3. **Business logic**: Staff need accurate suite assignments for operations

## Solution

### 1. Data Reorganization Scripts

We created scripts to redistribute existing reservations across available suites:

#### `scripts/reorganize-reservations-simple.sql`
- Distributes reservations using round-robin across all A, B, C, D suites
- Simple and fast, but doesn't account for date overlaps

#### `scripts/fix-overlapping-reservations.sql`
- Intelligently moves overlapping reservations to available suites
- Checks for date conflicts before assigning
- Run iteratively until all overlaps are resolved

### 2. Validation Script

#### `scripts/validate-no-overlaps.sql`
Run this anytime to verify no overlaps exist:

```bash
docker exec -i tailtown-postgres psql -U postgres -d customer < scripts/validate-no-overlaps.sql
```

**Output:**
- Total number of overlaps
- Number of affected suites
- Details of first 10 overlaps (if any)

### 3. Automated Tests

#### `apps/reservation-service/src/__tests__/reservation-overlap.test.ts`

Comprehensive test suite that validates:

1. **Overlap Detection**: Confirms system can detect overlapping reservations
2. **Consecutive Reservations**: Verifies back-to-back bookings (same start/end) don't count as overlaps
3. **Different Suites**: Confirms same dates in different suites are allowed
4. **Utility Function**: Tests the `checkReservationOverlap()` helper

**Run tests:**
```bash
cd apps/reservation-service
pnpm test -- reservation-overlap.test.ts
```

## Overlap Detection Logic

Two reservations overlap if they share the same resource AND their date ranges intersect:

```typescript
// Reservations overlap if:
reservation1.startDate < reservation2.endDate 
AND 
reservation1.endDate > reservation2.startDate
```

**Examples:**

| Reservation 1 | Reservation 2 | Overlaps?          |
| ------------- | ------------- | ------------------ |
| Jan 1-5       | Jan 3-7       | ✅ Yes              |
| Jan 1-5       | Jan 5-10      | ❌ No (consecutive) |
| Jan 1-5       | Jan 6-10      | ❌ No (separate)    |

## Utility Function

Use this function to check for overlaps before creating/updating reservations:

```typescript
import { checkReservationOverlap } from './__tests__/reservation-overlap.test';

const hasOverlap = await checkReservationOverlap(
  resourceId,
  startDate,
  endDate,
  tenantId,
  excludeReservationId // optional - for updates
);

if (hasOverlap) {
  throw new Error('This suite is already booked for these dates');
}
```

## Current Status

✅ **All overlaps resolved** (as of Nov 2, 2025)

**Distribution:**
- A Rooms: 100 reservations
- B Rooms: 195 reservations
- C Rooms: 142 reservations
- D Rooms: 180 reservations

**Total:** 617 active reservations with zero overlaps

## Maintenance

### Regular Validation

Run the validation script weekly or after bulk imports:

```bash
docker exec -i tailtown-postgres psql -U postgres -d customer < scripts/validate-no-overlaps.sql
```

### If Overlaps Detected

1. Run the fix script:
   ```bash
   docker exec -i tailtown-postgres psql -U postgres -d customer < scripts/fix-overlapping-reservations.sql
   ```

2. Validate again until clean:
   ```bash
   docker exec -i tailtown-postgres psql -U postgres -d customer < scripts/validate-no-overlaps.sql
   ```

### Future Prevention

Consider adding:

1. **Database constraint**: Prevent overlaps at DB level using exclusion constraints
2. **API validation**: Check for overlaps in reservation creation/update endpoints
3. **UI feedback**: Show available suites when creating reservations
4. **Automated alerts**: Monitor for overlaps in production

## Related Files

- `scripts/reorganize-reservations-simple.sql` - Initial distribution
- `scripts/fix-overlapping-reservations.sql` - Overlap resolution
- `scripts/validate-no-overlaps.sql` - Validation check
- `apps/reservation-service/src/__tests__/reservation-overlap.test.ts` - Test suite
- `scripts/reorganize-reservations.ts` - TypeScript version (not used)
- `scripts/reorganize-reservations.sql` - Complex SQL version (not used)
