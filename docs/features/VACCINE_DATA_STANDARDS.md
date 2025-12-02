# Vaccine Data Standards

## Overview
This document defines the standards for handling vaccine data across the Tailtown application to ensure consistency and prevent bugs related to casing mismatches.

## Core Principle
**All vaccine names used as keys in data structures MUST be lowercase.**

## Standard Vaccine Names

The following are the recognized vaccine names (all lowercase):

- `rabies`
- `dhpp`
- `bordetella`
- `fvrcp`
- `influenza`
- `lepto`

## Data Structure Standards

### vaccinationStatus
```typescript
{
  "rabies": { "status": "CURRENT" },
  "dhpp": { "status": "CURRENT" },
  "bordetella": { "status": "EXPIRED" }
}
```

### vaccineExpirations
```typescript
{
  "rabies": "2027-09-17",
  "dhpp": "2026-10-09",
  "bordetella": "2026-10-09"
}
```

## Implementation Guidelines

### Backend (TypeScript/Node.js)

#### When Reading Medical Records
Always normalize vaccine names to lowercase:

```typescript
import { normalizeVaccineName } from '../utils/vaccine-normalization';

pet.medicalRecords.forEach((record: any) => {
  const vaccineName = normalizeVaccineName(record.description);
  if (vaccineName) {
    vaccinationStatus[vaccineName] = { status: 'CURRENT' };
    vaccineExpirations[vaccineName] = record.expirationDate;
  }
});
```

#### When Saving Pet Data
Validate and normalize before saving:

```typescript
import { normalizeVaccinationStatus } from '../utils/vaccine-normalization';

const { vaccinationStatus, vaccineExpirations, warnings } = 
  normalizeVaccinationStatus(petData.vaccinationStatus, petData.vaccineExpirations);

if (warnings.length > 0) {
  console.warn('Vaccine data warnings:', warnings);
}

await prisma.pet.update({
  where: { id: petId },
  data: {
    vaccinationStatus,
    vaccineExpirations
  }
});
```

#### When Checking Compliance
Always convert requirement names to lowercase:

```typescript
const vaccineName = requirement.name.toLowerCase();
const vaccineStatus = vaccinationStatus[vaccineName];
const expirationDate = vaccineExpirations[vaccineName];
```

### Frontend (React/TypeScript)

#### Vaccine Mapping
Always map to lowercase keys:

```typescript
const vaccineMap: { [key: string]: string } = {
  'Rabies vaccination': 'rabies',
  'DHPP vaccination': 'dhpp',
  'Bordetella vaccination': 'bordetella',
  'FVRCP vaccination': 'fvrcp',
  'Canine Influenza vaccination': 'influenza',
  'Lepto vaccination': 'lepto'
};
```

#### State Management
Store vaccine data with lowercase keys:

```typescript
setPet(prev => ({
  ...prev,
  vaccinationStatus: {
    ...(prev.vaccinationStatus || {}),
    [key.toLowerCase()]: value
  }
}));
```

### Database

#### Medical Records
- `description` field should use proper capitalization for display (e.g., "Rabies vaccination")
- Backend code should normalize these to lowercase when creating vaccination status

#### Vaccine Requirements
- `name` field can use proper capitalization for display
- Backend code should normalize to lowercase when checking compliance

## Testing

### Unit Tests
Run vaccine validation tests:
```bash
npm test -- vaccine-validation.test.ts
```

### Integration Tests
Verify vaccine data flow:
1. Create medical record with vaccine
2. Fetch pet data
3. Verify `vaccinationStatus` and `vaccineExpirations` have lowercase keys
4. Check compliance API returns correct status

### Manual Testing Checklist
- [ ] Create a new pet with vaccinations
- [ ] Verify badge shows correct status on Pets list
- [ ] Verify badge shows correct status on Pet Details page
- [ ] Save pet and verify vaccination data persists
- [ ] Check compliance API response has lowercase keys
- [ ] Test with different pet types (DOG, CAT)

## Common Pitfalls

### ❌ DON'T
```typescript
// Mixed case keys
vaccinationStatus['Rabies'] = { status: 'CURRENT' };
vaccinationStatus['DHPP'] = { status: 'CURRENT' };

// Direct requirement name lookup without normalization
const status = vaccinationStatus[requirement.name];
```

### ✅ DO
```typescript
// Lowercase keys
vaccinationStatus['rabies'] = { status: 'CURRENT' };
vaccinationStatus['dhpp'] = { status: 'CURRENT' };

// Normalize before lookup
const vaccineName = requirement.name.toLowerCase();
const status = vaccinationStatus[vaccineName];
```

## Utilities

### Available Functions
- `normalizeVaccineName(description: string)` - Convert description to lowercase vaccine name
- `validateVaccineKeys(data: Record<string, any>)` - Validate all keys are lowercase
- `normalizeVaccineKeys(data: Record<string, T>)` - Convert all keys to lowercase
- `normalizeVaccinationStatus(status, expirations)` - Normalize and validate both objects
- `getRequiredVaccines(petType: string)` - Get required vaccines for pet type

### Import Path
```typescript
import { 
  normalizeVaccineName,
  validateVaccineKeys,
  normalizeVaccinationStatus
} from '../utils/vaccine-normalization';
```

## Troubleshooting

### Badge Shows "Missing" Despite Current Vaccinations
1. Check browser console for API response
2. Verify `vaccinationStatus` and `vaccineExpirations` have lowercase keys
3. Check compliance API is normalizing requirement names to lowercase
4. Verify medical records have correct vaccine descriptions

### Vaccination Data Not Persisting
1. Check if frontend is sending lowercase keys in PUT request
2. Verify backend is not converting keys to uppercase
3. Check database JSON fields are storing lowercase keys

## Related Files
- `/services/customer/src/controllers/pet.controller.ts` - Pet data population
- `/services/customer/src/controllers/vaccineRequirement.controller.ts` - Compliance checking
- `/services/customer/src/utils/vaccine-normalization.ts` - Utility functions
- `/frontend/src/pages/pets/PetDetails.tsx` - Frontend vaccine mapping
- `/frontend/src/utils/vaccineUtils.ts` - Frontend vaccine utilities
- `/frontend/src/components/pets/SimpleVaccinationBadge.tsx` - Badge display

## Version History
- **2025-11-18**: Initial standardization - All vaccine keys converted to lowercase across the system
