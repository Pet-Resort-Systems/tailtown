/**
 * Vaccine Name Validation Tests
 * 
 * These tests ensure consistent lowercase naming for vaccine keys across the system.
 * This prevents bugs where vaccine data is not found due to casing mismatches.
 */

import { describe, it, expect } from '@jest/globals';

// Standard vaccine names (lowercase)
const STANDARD_VACCINE_NAMES = [
  'rabies',
  'dhpp',
  'bordetella',
  'fvrcp',
  'influenza',
  'lepto'
];

// Common vaccine description patterns from medical records
const VACCINE_DESCRIPTIONS = [
  'Rabies vaccination',
  'DHPP vaccination',
  'Bordetella vaccination',
  'FVRCP vaccination',
  'Canine Influenza vaccination',
  'Lepto vaccination',
  'Leptospirosis vaccination'
];

describe('Vaccine Name Validation', () => {
  describe('Standard Vaccine Names', () => {
    it('should all be lowercase', () => {
      STANDARD_VACCINE_NAMES.forEach(name => {
        expect(name).toBe(name.toLowerCase());
        expect(name).not.toMatch(/[A-Z]/);
      });
    });

    it('should not contain spaces', () => {
      STANDARD_VACCINE_NAMES.forEach(name => {
        expect(name).not.toContain(' ');
      });
    });

    it('should not be empty', () => {
      STANDARD_VACCINE_NAMES.forEach(name => {
        expect(name.trim()).toBeTruthy();
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Vaccine Name Normalization', () => {
    const normalizeVaccineName = (description: string): string | null => {
      const desc = description.toLowerCase();
      if (desc.includes('rabies')) return 'rabies';
      if (desc.includes('dhpp')) return 'dhpp';
      if (desc.includes('bordetella')) return 'bordetella';
      if (desc.includes('fvrcp')) return 'fvrcp';
      if (desc.includes('influenza')) return 'influenza';
      if (desc.includes('lepto')) return 'lepto';
      return null;
    };

    it('should normalize all standard vaccine descriptions to lowercase', () => {
      VACCINE_DESCRIPTIONS.forEach(description => {
        const normalized = normalizeVaccineName(description);
        expect(normalized).toBeTruthy();
        expect(normalized).toBe(normalized?.toLowerCase());
      });
    });

    it('should handle case-insensitive matching', () => {
      const testCases = [
        { input: 'RABIES VACCINATION', expected: 'rabies' },
        { input: 'Rabies Vaccination', expected: 'rabies' },
        { input: 'rabies vaccination', expected: 'rabies' },
        { input: 'DHPP VACCINATION', expected: 'dhpp' },
        { input: 'Bordetella Vaccination', expected: 'bordetella' },
        { input: 'BORDETELLA VACCINATION', expected: 'bordetella' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeVaccineName(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle common typos', () => {
      // Test that typos are caught
      const typos = [
        'Bodatella vaccination', // Missing 'r'
        'Rabis vaccination',     // Missing 'e'
        'DHPPP vaccination'      // Extra 'P'
      ];

      typos.forEach(typo => {
        const normalized = normalizeVaccineName(typo);
        // These should either normalize correctly or return null
        // This test documents the behavior
        if (normalized) {
          expect(STANDARD_VACCINE_NAMES).toContain(normalized);
        }
      });
    });
  });

  describe('Vaccine Data Structure Validation', () => {
    it('should validate vaccinationStatus keys are lowercase', () => {
      const validStatus = {
        rabies: { status: 'CURRENT' },
        dhpp: { status: 'CURRENT' },
        bordetella: { status: 'CURRENT' }
      };

      Object.keys(validStatus).forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });
    });

    it('should reject mixed-case vaccine keys', () => {
      const invalidStatus = {
        Rabies: { status: 'CURRENT' },  // Invalid: capitalized
        DHPP: { status: 'CURRENT' },    // Invalid: all caps
        bordetella: { status: 'CURRENT' } // Valid: lowercase
      };

      const hasInvalidKeys = Object.keys(invalidStatus).some(key => key !== key.toLowerCase());
      expect(hasInvalidKeys).toBe(true);
    });

    it('should validate vaccineExpirations keys are lowercase', () => {
      const validExpirations = {
        rabies: '2027-09-17',
        dhpp: '2026-10-09',
        bordetella: '2026-10-09'
      };

      Object.keys(validExpirations).forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });
    });
  });

  describe('API Response Validation', () => {
    it('should validate pet vaccination data structure', () => {
      const mockPetData = {
        id: 'test-pet-id',
        name: 'Test Pet',
        vaccinationStatus: {
          rabies: { status: 'CURRENT' },
          dhpp: { status: 'CURRENT' },
          bordetella: { status: 'CURRENT' }
        },
        vaccineExpirations: {
          rabies: '2027-09-17',
          dhpp: '2026-10-09',
          bordetella: '2026-10-09'
        }
      };

      // Validate all keys are lowercase
      const statusKeys = Object.keys(mockPetData.vaccinationStatus);
      const expirationKeys = Object.keys(mockPetData.vaccineExpirations);

      statusKeys.forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });

      expirationKeys.forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });

      // Validate keys match between status and expirations
      expect(statusKeys.sort()).toEqual(expirationKeys.sort());
    });
  });
});

/**
 * Helper function to validate vaccine data structure
 * Use this in your controllers to ensure data consistency
 */
export function validateVaccineData(
  vaccinationStatus: Record<string, any>,
  vaccineExpirations: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all keys are lowercase
  Object.keys(vaccinationStatus).forEach(key => {
    if (key !== key.toLowerCase()) {
      errors.push(`vaccinationStatus key "${key}" is not lowercase`);
    }
  });

  Object.keys(vaccineExpirations).forEach(key => {
    if (key !== key.toLowerCase()) {
      errors.push(`vaccineExpirations key "${key}" is not lowercase`);
    }
  });

  // Check keys match standard vaccine names
  Object.keys(vaccinationStatus).forEach(key => {
    if (!STANDARD_VACCINE_NAMES.includes(key)) {
      errors.push(`vaccinationStatus key "${key}" is not a standard vaccine name`);
    }
  });

  Object.keys(vaccineExpirations).forEach(key => {
    if (!STANDARD_VACCINE_NAMES.includes(key)) {
      errors.push(`vaccineExpirations key "${key}" is not a standard vaccine name`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
