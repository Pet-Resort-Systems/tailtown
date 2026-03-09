/**
 * Tests for vaccine utility functions
 */

import {
  recalculateVaccineStatus,
  getRequiredVaccines,
  countVaccineStatuses,
} from '../vaccineUtils';

describe('vaccineUtils', () => {
  describe('getRequiredVaccines', () => {
    it('should return correct vaccines for dogs', () => {
      expect(getRequiredVaccines('DOG')).toEqual(['rabies', 'dhpp', 'bordetella']);
      expect(getRequiredVaccines('dog')).toEqual(['rabies', 'dhpp', 'bordetella']);
    });

    it('should return correct vaccines for cats', () => {
      expect(getRequiredVaccines('CAT')).toEqual(['rabies', 'fvrcp']);
      expect(getRequiredVaccines('cat')).toEqual(['rabies', 'fvrcp']);
    });

    it('should return rabies only for other pet types', () => {
      expect(getRequiredVaccines('BIRD')).toEqual(['rabies']);
      expect(getRequiredVaccines('RABBIT')).toEqual(['rabies']);
      expect(getRequiredVaccines('unknown')).toEqual(['rabies']);
    });
  });

  describe('recalculateVaccineStatus', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 30);

    it('should mark vaccines as CURRENT if expiration is in the future', () => {
      const vaccineExpirations = {
        rabies: futureDate.toISOString().split('T')[0],
        dhpp: futureDate.toISOString().split('T')[0],
      };

      const result = recalculateVaccineStatus(null, vaccineExpirations);

      expect(result.rabies.status).toBe('CURRENT');
      expect(result.dhpp.status).toBe('CURRENT');
    });

    it('should mark vaccines as EXPIRED if expiration is in the past', () => {
      const vaccineExpirations = {
        rabies: pastDate.toISOString().split('T')[0],
        dhpp: pastDate.toISOString().split('T')[0],
      };

      const result = recalculateVaccineStatus(null, vaccineExpirations);

      expect(result.rabies.status).toBe('EXPIRED');
      expect(result.dhpp.status).toBe('EXPIRED');
    });

    it('should mark vaccines as CURRENT if expiration is today', () => {
      const vaccineExpirations = {
        rabies: today.toISOString().split('T')[0],
      };

      const result = recalculateVaccineStatus(null, vaccineExpirations);

      expect(result.rabies.status).toBe('CURRENT');
    });

    it('should handle mixed current and expired vaccines', () => {
      const vaccineExpirations = {
        rabies: futureDate.toISOString().split('T')[0],
        dhpp: pastDate.toISOString().split('T')[0],
        bordetella: futureDate.toISOString().split('T')[0],
      };

      const result = recalculateVaccineStatus(null, vaccineExpirations);

      expect(result.rabies.status).toBe('CURRENT');
      expect(result.dhpp.status).toBe('EXPIRED');
      expect(result.bordetella.status).toBe('CURRENT');
    });

    it('should use vaccineExpirations over vaccinationStatus', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT', expiration: pastDate.toISOString() },
      };

      const vaccineExpirations = {
        rabies: pastDate.toISOString().split('T')[0],
      };

      const result = recalculateVaccineStatus(vaccinationStatus, vaccineExpirations);

      // Should recalculate based on date, not trust stored status
      expect(result.rabies.status).toBe('EXPIRED');
    });

    it('should handle vaccinationStatus when vaccineExpirations is missing', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT', expiration: futureDate.toISOString() },
        dhpp: { status: 'EXPIRED', expiration: pastDate.toISOString() },
      };

      const result = recalculateVaccineStatus(vaccinationStatus, null);

      expect(result.rabies.status).toBe('CURRENT');
      expect(result.dhpp.status).toBe('EXPIRED');
    });

    it('should normalize vaccine names to lowercase', () => {
      const vaccineExpirations = {
        Rabies: futureDate.toISOString().split('T')[0],
        DHPP: futureDate.toISOString().split('T')[0],
      };

      const result = recalculateVaccineStatus(null, vaccineExpirations);

      expect(result.rabies).toBeDefined();
      expect(result.dhpp).toBeDefined();
      expect(result.rabies.status).toBe('CURRENT');
    });

    it('should return empty object if no data provided', () => {
      const result = recalculateVaccineStatus(null, null);
      expect(result).toEqual({});
    });

    it('should preserve lastAdministered date if present', () => {
      const vaccinationStatus = {
        rabies: {
          status: 'CURRENT',
          expiration: futureDate.toISOString(),
          lastAdministered: '2024-01-01',
        },
      };

      const result = recalculateVaccineStatus(vaccinationStatus, null);

      expect(result.rabies.lastAdministered).toBe('2024-01-01');
    });
  });

  describe('countVaccineStatuses', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 30);

    it('should count all vaccines as current for a dog with all vaccines up to date', () => {
      const pet = {
        type: 'DOG',
        vaccineExpirations: {
          rabies: futureDate.toISOString().split('T')[0],
          dhpp: futureDate.toISOString().split('T')[0],
          bordetella: futureDate.toISOString().split('T')[0],
        },
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(3);
      expect(counts.expired).toBe(0);
      expect(counts.missing).toBe(0);
    });

    it('should count expired vaccines correctly', () => {
      const pet = {
        type: 'DOG',
        vaccineExpirations: {
          rabies: pastDate.toISOString().split('T')[0],
          dhpp: pastDate.toISOString().split('T')[0],
          bordetella: futureDate.toISOString().split('T')[0],
        },
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(1);
      expect(counts.expired).toBe(2);
      expect(counts.missing).toBe(0);
    });

    it('should count missing vaccines correctly', () => {
      const pet = {
        type: 'DOG',
        vaccineExpirations: {
          rabies: futureDate.toISOString().split('T')[0],
          // dhpp and bordetella missing
        },
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(1);
      expect(counts.expired).toBe(0);
      expect(counts.missing).toBe(2);
    });

    it('should handle mixed statuses', () => {
      const pet = {
        type: 'DOG',
        vaccineExpirations: {
          rabies: futureDate.toISOString().split('T')[0], // current
          dhpp: pastDate.toISOString().split('T')[0], // expired
          // bordetella missing
        },
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(1);
      expect(counts.expired).toBe(1);
      expect(counts.missing).toBe(1);
    });

    it('should work with cat vaccines', () => {
      const pet = {
        type: 'CAT',
        vaccineExpirations: {
          rabies: futureDate.toISOString().split('T')[0],
          fvrcp: pastDate.toISOString().split('T')[0],
        },
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(1);
      expect(counts.expired).toBe(1);
      expect(counts.missing).toBe(0);
    });

    it('should handle pet with no vaccination data', () => {
      const pet = {
        type: 'DOG',
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(0);
      expect(counts.expired).toBe(0);
      expect(counts.missing).toBe(3); // All 3 dog vaccines missing
    });

    it('should handle vaccines that expire today as current', () => {
      const pet = {
        type: 'DOG',
        vaccineExpirations: {
          rabies: today.toISOString().split('T')[0],
          dhpp: today.toISOString().split('T')[0],
          bordetella: today.toISOString().split('T')[0],
        },
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(3);
      expect(counts.expired).toBe(0);
      expect(counts.missing).toBe(0);
    });

    it('should handle vaccines that expired yesterday', () => {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const pet = {
        type: 'DOG',
        vaccineExpirations: {
          rabies: yesterday.toISOString().split('T')[0],
          dhpp: yesterday.toISOString().split('T')[0],
          bordetella: yesterday.toISOString().split('T')[0],
        },
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(0);
      expect(counts.expired).toBe(3);
      expect(counts.missing).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined pet type', () => {
      const pet = {
        vaccineExpirations: {
          rabies: new Date().toISOString().split('T')[0],
        },
      };

      const counts = countVaccineStatuses(pet);

      // Should default to rabies only
      expect(counts.current).toBe(1);
      expect(counts.expired).toBe(0);
      expect(counts.missing).toBe(0);
    });

    it('should handle malformed date strings gracefully', () => {
      const pet = {
        type: 'DOG',
        vaccineExpirations: {
          rabies: 'invalid-date',
          dhpp: '2024-13-45', // Invalid date
        },
      };

      // Should not throw error
      expect(() => countVaccineStatuses(pet)).not.toThrow();
    });

    it('should handle empty vaccineExpirations object', () => {
      const pet = {
        type: 'DOG',
        vaccineExpirations: {},
      };

      const counts = countVaccineStatuses(pet);

      expect(counts.current).toBe(0);
      expect(counts.expired).toBe(0);
      expect(counts.missing).toBe(3);
    });
  });
});
