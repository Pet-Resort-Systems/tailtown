# Visual Indicators Testing Guide

This document describes the automated tests for pet visual indicators including icons, playgroup badges, and vaccination status.

## Overview

The visual indicators tests ensure that:

- **Playgroup compatibility badges** display correctly for different group sizes
- **Special requirement icons** show for allergies, medications, and other needs
- **Vaccination badges** reflect current, expired, or missing vaccination status
- **Profile photos** are properly displayed
- **No false positives** occur (e.g., "none" or "n/a" don't trigger icons)

## Test Files

### Backend Integration Tests

**Location:** `/services/customer/src/__tests__/integration/pet-visual-indicators.test.ts`

Tests the database layer to ensure:

- Pets have correct `playgroupCompatibility` values
- `specialRequirements` array contains valid values
- No false positives for allergies/medications (e.g., "none", "n/a")
- Vaccination status is properly stored
- Profile photos are linked correctly
- Data consistency between fields and flags

**Run with:**

```bash
cd services/customer
npm test -- pet-visual-indicators.test.ts
```

### Frontend Component Tests

#### PlaygroupBadge Tests

**Location:** `/frontend/src/components/compatibility/__tests__/PlaygroupBadge.test.tsx`

Tests the PlaygroupBadge component:

- Renders correct labels (Large Dog, Medium Dog, Small Dog, etc.)
- Applies correct colors for each group size
- Handles null/undefined values gracefully
- Supports different size variants (small, medium)
- Provides accessible labels

**Run with:**

```bash
cd frontend
npm test -- PlaygroupBadge.test.tsx
```

#### SpecialRequirementIcons Tests

**Location:** `/frontend/src/components/compatibility/__tests__/SpecialRequirementIcons.test.tsx`

Tests the SpecialRequirementIcons component:

- Renders correct emoji icons (💊 for medication, 🤧 for allergies, etc.)
- Shows tooltips with descriptive labels
- Handles multiple icons simultaneously
- Renders icons in priority order
- Handles invalid/duplicate requirements gracefully

**Run with:**

```bash
cd frontend
npm test -- SpecialRequirementIcons.test.tsx
```

#### Vaccination Badge Tests

**Location:** `/frontend/src/components/pets/__tests__/VaccinationBadge.visual.test.tsx`

Tests the SimpleVaccinationBadge component:

- Shows green badge for current vaccinations
- Shows red badge for expired/missing vaccinations
- Displays detailed vaccine information when requested
- Handles dog vs cat vaccine requirements
- Manages edge cases (null status, invalid dates)

**Run with:**

```bash
cd frontend
npm test -- VaccinationBadge.visual.test.tsx
```

## Test Coverage

### Playgroup Compatibility

- ✅ Large Dog groups
- ✅ Medium Dog groups
- ✅ Small Dog groups
- ✅ Non-Compatible pets
- ✅ Senior/Staff Required pets
- ✅ Unknown/null values

### Special Requirements

- ✅ HAS_MEDICATION icon
- ✅ ALLERGIES icon
- ✅ MEDICAL_MONITORING icon
- ✅ HEAT_SENSITIVE icon
- ✅ NO_POOL icon
- ✅ NO_LEASH_ON_NECK icon
- ✅ BLIND, DEAF, and other physical limitations
- ✅ False positive prevention

### Vaccination Status

- ✅ Current vaccinations (green badge)
- ✅ Expired vaccinations (red badge)
- ✅ Missing vaccinations (red badge)
- ✅ Mixed status (any expired = red)
- ✅ Dog-specific vaccines (Rabies, DHPP, Bordetella)
- ✅ Cat-specific vaccines (Rabies, FVRCP)

## False Positive Prevention

The tests specifically verify that false positives are prevented:

### Allergies False Positives

These values should NOT trigger the allergy icon:

- "none"
- "no"
- "n/a"
- "nka" (no known allergies)
- "no allergies"
- "none known"
- "none that we are aware of"
- Empty or null values

### Medication False Positives

These values should NOT trigger the medication icon:

- "none"
- "no"
- "no meds"
- "n/a"
- "no medications"
- Empty or null values

## Running All Tests

### Backend Tests

```bash
cd services/customer
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Run Specific Test Suites

```bash
# Backend integration tests only
npm test -- --testPathPattern=integration

# Frontend component tests only
npm test -- --testPathPattern=components

# Visual indicator tests only
npm test -- --testPathPattern=visual-indicators
```

## Continuous Integration

These tests run automatically in CI/CD pipelines to ensure:

1. No regressions in visual indicator display
2. False positives are prevented
3. All components render correctly
4. Data integrity is maintained

## Troubleshooting

### Tests Failing After Data Import

If tests fail after importing new pet data:

1. Run the cleanup scripts to remove false positives:
   ```bash
   cd services/customer
   node scripts/cleanup-false-allergy-icons.js
   node scripts/cleanup-false-medication-icons.js
   ```
2. Re-run the tests

### Component Tests Failing

If component tests fail:

1. Ensure all dependencies are installed: `npm install`
2. Check that component imports are correct
3. Verify Material-UI theme provider is available

### Integration Tests Failing

If integration tests fail:

1. Ensure database is running and accessible
2. Check that `TEST_TENANT_ID` environment variable is set
3. Verify Prisma client is generated: `npx prisma generate`

## Adding New Tests

When adding new visual indicators:

1. **Add Backend Test:** Update `pet-visual-indicators.test.ts` to verify database storage
2. **Add Component Test:** Create a new test file in the component's `__tests__` directory
3. **Update This Documentation:** Add the new indicator to the coverage list
4. **Run All Tests:** Ensure no regressions

## Best Practices

- **Test Real Scenarios:** Use realistic pet data in tests
- **Test Edge Cases:** Include null, undefined, and invalid values
- **Test Accessibility:** Verify labels and tooltips are present
- **Prevent False Positives:** Always test that "none"/"n/a" don't trigger icons
- **Keep Tests Fast:** Use mocks where appropriate to speed up tests

## Related Documentation

- [Playgroup Compatibility System](../features/playgroup-compatibility.md)
- [Special Requirements System](../features/special-requirements.md)
- [Vaccination Tracking](../features/vaccination-tracking.md)
- [False Positive Prevention](../operations/false-positive-cleanup.md)
