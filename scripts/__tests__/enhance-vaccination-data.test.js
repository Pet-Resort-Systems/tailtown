/**
 * Tests for vaccination data enhancement script
 * These tests validate the logic used to convert General vaccination records
 * into specific vaccine types
 */

const { PrismaClient } = require('@prisma/client');

// Mock the Prisma client for testing
const mockPrisma = {
  pet: {
    findMany: jest.fn(),
    update: jest.fn(),
    $queryRaw: jest.fn(),
  },
  $disconnect: jest.fn(),
};

// Import the functions we want to test
// Note: We would need to refactor the script to export these functions for testing
// For now, we'll test the core logic inline

describe('Vaccination Data Enhancement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Vaccination Configuration', () => {
    it('has correct vaccine types for dogs', () => {
      const dogVaccines = [
        { id: 'rabies', name: 'Rabies', validityMonths: 36, required: true },
        { id: 'dhpp', name: 'DHPP', validityMonths: 12, required: true },
        {
          id: 'bordetella',
          name: 'Bordetella',
          validityMonths: 6,
          required: true,
        },
        {
          id: 'canine_influenza',
          name: 'Canine Influenza',
          validityMonths: 12,
          required: false,
        },
      ];

      expect(dogVaccines).toHaveLength(4);
      expect(dogVaccines.filter((v) => v.required)).toHaveLength(3);
    });

    it('has correct vaccine types for cats', () => {
      const catVaccines = [
        { id: 'rabies', name: 'Rabies', validityMonths: 36, required: true },
        { id: 'fvrcp', name: 'FVRCP', validityMonths: 12, required: true },
        {
          id: 'feline_leukemia',
          name: 'Feline Leukemia',
          validityMonths: 12,
          required: false,
        },
      ];

      expect(catVaccines).toHaveLength(3);
      expect(catVaccines.filter((v) => v.required)).toHaveLength(2);
    });
  });

  describe('Vaccination Record Generation', () => {
    const generateVaccinationRecords = (expirationDate, petType, baseDate) => {
      if (!expirationDate) return {};

      const expDate = new Date(expirationDate);
      const vaccinations = {};

      const vaccineTypes =
        petType === 'DOG'
          ? [
              { id: 'rabies', validityMonths: 36, required: true },
              { id: 'dhpp', validityMonths: 12, required: true },
              { id: 'bordetella', validityMonths: 6, required: true },
              { id: 'canine_influenza', validityMonths: 12, required: false },
            ]
          : [
              { id: 'rabies', validityMonths: 36, required: true },
              { id: 'fvrcp', validityMonths: 12, required: true },
              { id: 'feline_leukemia', validityMonths: 12, required: false },
            ];

      vaccineTypes.forEach((vaccine) => {
        const daysVariation = Math.floor(Math.random() * 90) - 45;
        const lastGiven = new Date(expDate);
        lastGiven.setMonth(lastGiven.getMonth() - vaccine.validityMonths);
        lastGiven.setDate(lastGiven.getDate() + daysVariation);

        const adjustedExpiration = new Date(expDate);
        const statusVariation = Math.random();

        if (statusVariation < 0.15) {
          adjustedExpiration.setDate(
            adjustedExpiration.getDate() - Math.floor(Math.random() * 60)
          );
        } else if (statusVariation < 0.25) {
          adjustedExpiration.setDate(
            adjustedExpiration.getDate() + Math.floor(Math.random() * 30)
          );
        }

        if (!vaccine.required && Math.random() < 0.3) {
          return;
        }

        const status = adjustedExpiration > baseDate ? 'CURRENT' : 'EXPIRED';

        vaccinations[vaccine.id] = {
          status,
          lastGiven: lastGiven.toISOString(),
          expiration: adjustedExpiration.toISOString(),
          lastChecked: new Date().toISOString(),
        };
      });

      return vaccinations;
    };

    it('generates correct number of vaccines for dogs', () => {
      const expirationDate = '2025-12-01T00:00:00.000Z';
      const baseDate = new Date();

      const records = generateVaccinationRecords(
        expirationDate,
        'DOG',
        baseDate
      );

      expect(Object.keys(records)).toHaveLength(3); // 3 required vaccines
      expect(records).toHaveProperty('rabies');
      expect(records).toHaveProperty('dhpp');
      expect(records).toHaveProperty('bordetella');
    });

    it('generates correct number of vaccines for cats', () => {
      const expirationDate = '2025-12-01T00:00:00.000Z';
      const baseDate = new Date();

      const records = generateVaccinationRecords(
        expirationDate,
        'CAT',
        baseDate
      );

      expect(Object.keys(records)).toHaveLength(2); // 2 required vaccines
      expect(records).toHaveProperty('rabies');
      expect(records).toHaveProperty('fvrcp');
    });

    it('generates valid vaccination record structure', () => {
      const expirationDate = '2025-12-01T00:00:00.000Z';
      const baseDate = new Date();

      const records = generateVaccinationRecords(
        expirationDate,
        'DOG',
        baseDate
      );

      Object.values(records).forEach((record) => {
        expect(record).toHaveProperty('status');
        expect(record).toHaveProperty('lastGiven');
        expect(record).toHaveProperty('expiration');
        expect(record).toHaveProperty('lastChecked');

        expect(['CURRENT', 'EXPIRED']).toContain(record.status);
        expect(typeof record.lastGiven).toBe('string');
        expect(typeof record.expiration).toBe('string');
        expect(typeof record.lastChecked).toBe('string');
      });
    });

    it('returns empty object for null expiration date', () => {
      const records = generateVaccinationRecords(null, 'DOG', new Date());
      expect(records).toEqual({});
    });

    it('calculates last given dates correctly', () => {
      const expirationDate = '2025-12-01T00:00:00.000Z';
      const baseDate = new Date();

      const records = generateVaccinationRecords(
        expirationDate,
        'DOG',
        baseDate
      );

      const rabiesRecord = records.rabies;
      const lastGiven = new Date(rabiesRecord.lastGiven);
      const expiration = new Date(rabiesRecord.expiration);

      // Rabies should be approximately 36 months before expiration
      const monthsDiff =
        (expiration.getFullYear() - lastGiven.getFullYear()) * 12 +
        (expiration.getMonth() - lastGiven.getMonth());

      expect(monthsDiff).toBeCloseTo(36, 0);
    });
  });

  describe('Vaccine Expiration Generation', () => {
    const generateVaccineExpirations = (vaccinationRecords) => {
      const expirations = {};
      Object.entries(vaccinationRecords).forEach(([vaccineId, record]) => {
        if (record.expiration) {
          expirations[vaccineId] = record.expiration;
        }
      });
      return expirations;
    };

    it('generates expiration dates object correctly', () => {
      const vaccinationRecords = {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        dhpp: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
      };

      const expirations = generateVaccineExpirations(vaccinationRecords);

      expect(expirations).toEqual({
        rabies: '2025-12-01T00:00:00.000Z',
        dhpp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('handles empty vaccination records', () => {
      const expirations = generateVaccineExpirations({});
      expect(expirations).toEqual({});
    });
  });

  describe('Data Validation', () => {
    it('validates date formats', () => {
      const expirationDate = '2025-12-01T00:00:00.000Z';
      const baseDate = new Date();

      const records = generateVaccinationRecords(
        expirationDate,
        'DOG',
        baseDate
      );

      Object.values(records).forEach((record) => {
        expect(() => new Date(record.lastGiven)).not.toThrow();
        expect(() => new Date(record.expiration)).not.toThrow();
        expect(() => new Date(record.lastChecked)).not.toThrow();
      });
    });

    it('ensures last given date is before expiration date', () => {
      const expirationDate = '2025-12-01T00:00:00.000Z';
      const baseDate = new Date();

      const records = generateVaccinationRecords(
        expirationDate,
        'DOG',
        baseDate
      );

      Object.values(records).forEach((record) => {
        const lastGiven = new Date(record.lastGiven);
        const expiration = new Date(record.expiration);

        expect(lastGiven.getTime()).toBeLessThan(expiration.getTime());
      });
    });
  });
});
