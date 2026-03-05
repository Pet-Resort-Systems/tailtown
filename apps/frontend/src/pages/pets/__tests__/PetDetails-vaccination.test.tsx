import { 
  mapVaccinationData, 
  mapVaccinationExpirations 
} from '../PetDetails';

describe('Vaccination Data Mapping', () => {
  describe('mapVaccinationData', () => {
    it('maps lowercase vaccine keys to capitalized keys', () => {
      const input = {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        dhpp: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
        bordetella: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      };

      const result = mapVaccinationData(input);

      expect(result).toEqual({
        Rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        DHPP: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
        Bordetella: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      });
    });

    it('maps cat-specific vaccines correctly', () => {
      const input = {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        fvrcp: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        feline_leukemia: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      };

      const result = mapVaccinationData(input);

      expect(result).toEqual({
        Rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        FVRCP: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        Lepto: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' } // feline_leukemia maps to Lepto
      });
    });

    it('maps canine_influenza to Influenza', () => {
      const input = {
        canine_influenza: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      };

      const result = mapVaccinationData(input);

      expect(result).toEqual({
        Influenza: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      });
    });

    it('handles empty input gracefully', () => {
      const result = mapVaccinationData({});
      expect(result).toEqual({});
    });

    it('handles null/undefined input gracefully', () => {
      expect(mapVaccinationData(null)).toEqual({});
      expect(mapVaccinationData(undefined)).toEqual({});
    });

    it('preserves unknown keys as-is', () => {
      const input = {
        unknown_vaccine: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      };

      const result = mapVaccinationData(input);

      expect(result).toEqual({
        unknown_vaccine: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        Rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      });
    });

    it('handles vaccination records without expiration dates', () => {
      const input = {
        rabies: { status: 'CURRENT', lastGiven: '2024-01-01T00:00:00.000Z' },
        dhpp: { status: 'EXPIRED', lastGiven: '2023-01-01T00:00:00.000Z' }
      };

      const result = mapVaccinationData(input);

      expect(result).toEqual({
        Rabies: { status: 'CURRENT', lastGiven: '2024-01-01T00:00:00.000Z' },
        DHPP: { status: 'EXPIRED', lastGiven: '2023-01-01T00:00:00.000Z' }
      });
    });
  });

  describe('mapVaccinationExpirations', () => {
    it('maps lowercase expiration keys to capitalized keys', () => {
      const input = {
        rabies: '2025-12-01T00:00:00.000Z',
        dhpp: '2024-01-01T00:00:00.000Z',
        bordetella: '2025-12-01T00:00:00.000Z'
      };

      const result = mapVaccinationExpirations(input);

      expect(result).toEqual({
        Rabies: '2025-12-01T00:00:00.000Z',
        DHPP: '2024-01-01T00:00:00.000Z',
        Bordetella: '2025-12-01T00:00:00.000Z'
      });
    });

    it('maps cat-specific expiration keys correctly', () => {
      const input = {
        rabies: '2025-12-01T00:00:00.000Z',
        fvrcp: '2025-12-01T00:00:00.000Z',
        feline_leukemia: '2025-12-01T00:00:00.000Z'
      };

      const result = mapVaccinationExpirations(input);

      expect(result).toEqual({
        Rabies: '2025-12-01T00:00:00.000Z',
        FVRCP: '2025-12-01T00:00:00.000Z',
        Lepto: '2025-12-01T00:00:00.000Z' // feline_leukemia maps to Lepto
      });
    });

    it('handles empty input gracefully', () => {
      const result = mapVaccinationExpirations({});
      expect(result).toEqual({});
    });

    it('handles null/undefined input gracefully', () => {
      expect(mapVaccinationExpirations(null)).toEqual({});
      expect(mapVaccinationExpirations(undefined)).toEqual({});
    });

    it('preserves unknown keys as-is', () => {
      const input = {
        unknown_vaccine: '2025-12-01T00:00:00.000Z',
        rabies: '2025-12-01T00:00:00.000Z'
      };

      const result = mapVaccinationExpirations(input);

      expect(result).toEqual({
        unknown_vaccine: '2025-12-01T00:00:00.000Z',
        Rabies: '2025-12-01T00:00:00.000Z'
      });
    });
  });

  describe('integration tests', () => {
    it('correctly maps complete dog vaccination data', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        dhpp: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        bordetella: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
        canine_influenza: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      };

      const vaccineExpirations = {
        rabies: '2025-12-01T00:00:00.000Z',
        dhpp: '2025-12-01T00:00:00.000Z',
        bordetella: '2024-01-01T00:00:00.000Z',
        canine_influenza: '2025-12-01T00:00:00.000Z'
      };

      const mappedStatus = mapVaccinationData(vaccinationStatus);
      const mappedExpirations = mapVaccinationExpirations(vaccineExpirations);

      expect(mappedStatus).toEqual({
        Rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        DHPP: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        Bordetella: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' },
        Influenza: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' }
      });

      expect(mappedExpirations).toEqual({
        Rabies: '2025-12-01T00:00:00.000Z',
        DHPP: '2025-12-01T00:00:00.000Z',
        Bordetella: '2024-01-01T00:00:00.000Z',
        Influenza: '2025-12-01T00:00:00.000Z'
      });
    });

    it('correctly maps complete cat vaccination data', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        fvrcp: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        feline_leukemia: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' }
      };

      const vaccineExpirations = {
        rabies: '2025-12-01T00:00:00.000Z',
        fvrcp: '2025-12-01T00:00:00.000Z',
        feline_leukemia: '2024-01-01T00:00:00.000Z'
      };

      const mappedStatus = mapVaccinationData(vaccinationStatus);
      const mappedExpirations = mapVaccinationExpirations(vaccineExpirations);

      expect(mappedStatus).toEqual({
        Rabies: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        FVRCP: { status: 'CURRENT', expiration: '2025-12-01T00:00:00.000Z' },
        Lepto: { status: 'EXPIRED', expiration: '2024-01-01T00:00:00.000Z' }
      });

      expect(mappedExpirations).toEqual({
        Rabies: '2025-12-01T00:00:00.000Z',
        FVRCP: '2025-12-01T00:00:00.000Z',
        Lepto: '2024-01-01T00:00:00.000Z'
      });
    });
  });
});
