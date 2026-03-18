# Issue: Implement True Multi-Pet Suite Capacity

**Issue Type**: Feature Enhancement  
**Priority**: High  
**Component**: Reservations, Resources  
**Status**: Confirmed  
**Date**: November 20, 2025

---

## Problem Statement

The reservation system currently prevents multiple pets from sharing the same suite/kennel, even for multi-pet capable suites (VIP_SUITE, STANDARD_PLUS_SUITE). This forces families with multiple pets to book separate adjacent kennels instead of a single family suite.

---

## Current Behavior

1. When creating a multi-pet reservation, each pet must be assigned to a different kennel
2. System marks a kennel as "Selected for another pet" if you try to assign it to a second pet
3. No capacity-based validation for multi-pet suites
4. Frontend code explicitly disables suite options already assigned to another pet

---

## Desired Behavior

1. **Suite Capacity Support**:
   - STANDARD_SUITE: 1 pet (single occupancy)
   - STANDARD_PLUS_SUITE: 2 pets (family suite)
   - VIP_SUITE: 2-3 pets (large family suite)

2. **Multi-Pet Assignment**:
   - Allow multiple pets to be assigned to the same suite if capacity permits
   - Show capacity indicators in UI (e.g., "VIP Suite A03R - 2/3 pets")
   - Prevent over-capacity assignments

3. **Validation**:
   - Frontend: Check suite capacity before allowing assignment
   - Backend: Validate capacity on reservation creation/update
   - Show clear error messages when capacity exceeded

---

## Technical Implementation

### 1. Database Schema Changes

**Add capacity field to Resource model**:

```prisma
model Resource {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  type        String   // STANDARD_SUITE, STANDARD_PLUS_SUITE, VIP_SUITE
  maxPets     Int      @default(1)  // NEW FIELD: Maximum pets allowed
  isActive    Boolean  @default(true)
  // ... existing fields
  
  @@index([tenantId, type])
  @@map("resources")
}
```

**Migration**:
```sql
ALTER TABLE resources ADD COLUMN "maxPets" INTEGER DEFAULT 1;

-- Set capacity based on suite type
UPDATE resources SET "maxPets" = 1 WHERE type = 'STANDARD_SUITE';
UPDATE resources SET "maxPets" = 2 WHERE type = 'STANDARD_PLUS_SUITE';
UPDATE resources SET "maxPets" = 3 WHERE type = 'VIP_SUITE';
```

### 2. Frontend Changes

**File**: `apps/frontend/src/components/reservations/ReservationForm.tsx`

**Change 1: Update getOptionDisabled logic** (lines ~1402-1411):

```typescript
getOptionDisabled={(option) => {
  if (!option.id) return false; // Auto-assign always enabled
  
  // Check if occupied by existing reservation
  const isOccupied = occupiedSuiteIds.has(option.id);
  if (isOccupied) return true;
  
  // Count how many pets already assigned to this suite
  const petsInSuite = Object.values(petSuiteAssignments).filter(
    id => id === option.id
  ).length;
  
  // Get suite capacity (default to 1 if not specified)
  const suiteCapacity = option.maxPets || 1;
  
  // Disable if suite is at capacity
  return petsInSuite >= suiteCapacity;
}}
```

**Change 2: Update renderOption to show capacity** (lines ~1413-1436):

```typescript
renderOption={(props, option) => {
  if (!option.id) {
    return <li {...props}><em>Auto-assign</em></li>;
  }
  
  const isOccupied = occupiedSuiteIds.has(option.id);
  const petsInSuite = Object.values(petSuiteAssignments).filter(
    id => id === option.id
  ).length;
  const suiteCapacity = option.maxPets || 1;
  const atCapacity = petsInSuite >= suiteCapacity;
  
  const displayName = option.name || `Suite #${option.id.substring(0, 8)}`;
  const capacityText = suiteCapacity > 1 
    ? ` (${petsInSuite}/${suiteCapacity} pets)` 
    : '';
  
  return (
    <li {...props} style={{
      color: isOccupied ? '#d32f2f' : atCapacity ? '#ff9800' : '#2e7d32',
      opacity: (atCapacity || isOccupied) ? 0.6 : 1
    }}>
      {isOccupied && '🔴 '}
      {atCapacity && !isOccupied && '🟡 '}
      {!isOccupied && !atCapacity && '🟢 '}
      {displayName}{capacityText}
      {isOccupied && ' (Occupied)'}
      {atCapacity && !isOccupied && ' (At Capacity)'}
    </li>
  );
}}
```

### 3. Backend Changes

**File**: `apps/reservation-service/src/controllers/reservation/create-reservation.controller.ts`

**Add capacity validation**:

```typescript
// After resource assignment, validate capacity
if (resourceId) {
  // Get the resource to check capacity
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId }
  });
  
  if (!resource) {
    return next(new AppError('Resource not found', 404));
  }
  
  // Count existing reservations for this resource in the date range
  const existingReservations = await prisma.reservation.findMany({
    where: {
      resourceId: resourceId,
      tenantId: tenantId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        }
      ]
    }
  });
  
  const currentOccupancy = existingReservations.length;
  const maxCapacity = resource.maxPets || 1;
  
  if (currentOccupancy >= maxCapacity) {
    return next(new AppError(
      `Suite ${resource.name} is at capacity (${currentOccupancy}/${maxCapacity} pets)`,
      400
    ));
  }
}
```

### 4. Resource Service Changes

**File**: `apps/reservation-service/src/controllers/resource/get-resource.controller.ts`

**Include maxPets in resource responses**:

```typescript
select: {
  id: true,
  name: true,
  type: true,
  maxPets: true,  // ADD THIS
  isActive: true,
  // ... other fields
}
```

---

## Testing Checklist

- [ ] Add `maxPets` field to Resource model
- [ ] Run migration to add column and set default values
- [ ] Update resource GET endpoints to include `maxPets`
- [ ] Modify frontend `getOptionDisabled` logic
- [ ] Update frontend `renderOption` to show capacity
- [ ] Add backend capacity validation
- [ ] Test: Assign 2 pets to STANDARD_PLUS_SUITE (should work)
- [ ] Test: Assign 3 pets to STANDARD_PLUS_SUITE (should fail)
- [ ] Test: Assign 1 pet to STANDARD_SUITE (should work)
- [ ] Test: Assign 2 pets to STANDARD_SUITE (should fail)
- [ ] Test: UI shows correct capacity indicators
- [ ] Test: Backend returns proper error messages
- [ ] Update multi-pet testing plan with results

---

## Files to Modify

1. **Database**:
   - `apps/reservation-service/prisma/schema.prisma`
   - Create migration for `maxPets` field

2. **Backend**:
   - `apps/reservation-service/src/controllers/reservation/create-reservation.controller.ts`
   - `apps/reservation-service/src/controllers/reservation/update-reservation.controller.ts`
   - `apps/reservation-service/src/controllers/resource/get-resource.controller.ts`

3. **Frontend**:
   - `apps/frontend/src/components/reservations/ReservationForm.tsx`
   - `apps/frontend/src/types/resource.ts` (add maxPets field)

4. **Documentation**:
   - `docs/testing/MULTI-PET-TESTING-PLAN.md`
   - `apps/reservation-service/docs/README.md`

---

## Acceptance Criteria

✅ **Must Have**:
1. Resource model has `maxPets` field
2. Frontend allows multiple pets in same suite if capacity permits
3. Frontend shows capacity indicators (e.g., "2/3 pets")
4. Backend validates capacity on reservation creation
5. Clear error messages when capacity exceeded
6. All existing single-pet reservations work unchanged

✅ **Should Have**:
1. Capacity shown in resource management UI
2. Bulk capacity updates for suite types
3. Capacity reporting/analytics

✅ **Nice to Have**:
1. Auto-suggest alternative suites when at capacity
2. Capacity-based pricing tiers
3. Waitlist for full suites

---

## Related Issues

- Multi-Pet Testing Plan: `docs/testing/MULTI-PET-TESTING-PLAN.md`
- Roadmap Item #9: Multi-Pet Room Check-in Testing

---

## Estimated Effort

- **Database Migration**: 30 minutes
- **Backend Changes**: 2-3 hours
- **Frontend Changes**: 3-4 hours
- **Testing**: 2-3 hours
- **Total**: 1-2 days

---

## Priority Justification

**High Priority** because:
1. Core feature for multi-pet reservations
2. Affects customer experience and pricing
3. Currently blocking true family suite functionality
4. Relatively straightforward to implement
5. High customer demand for family suites
