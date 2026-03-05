import {
  VACCINATION_TYPES,
  getVaccinationTypesByPetType,
  calculateVaccinationStatus,
  getNextDueDate,
  isPetCompliant,
  getComplianceStatus,
  formatVaccinationStatus,
  getVaccinationStatusColor
} from '../vaccinationService';

describe('Vaccination Service', () => {
  describe('getVaccinationTypesByPetType', () => {
    it('returns dog-specific vaccines for DOG type', () => {
      const dogVaccines = getVaccinationTypesByPetType('DOG');
      
      expect(dogVaccines).toHaveLength(4);
      expect(dogVaccines.map(v => v.id)).toEqual(['rabies', 'dhpp', 'bordetella', 'canine_influenza']);
      expect(dogVaccines.filter(v => v.required)).toHaveLength(3); // rabies, dhpp, bordetella are required
    });

    it('returns cat-specific vaccines for CAT type', () => {
      const catVaccines = getVaccinationTypesByPetType('CAT');
      
      expect(catVaccines).toHaveLength(3);
      expect(catVaccines.map(v => v.id)).toEqual(['rabies', 'fvrcp', 'feline_leukemia']);
      expect(catVaccines.filter(v => v.required)).toHaveLength(2); // rabies, fvrcp are required
    });

    it('returns required vaccines for OTHER type', () => {
      const otherVaccines = getVaccinationTypesByPetType('OTHER');
      
      expect(otherVaccines).toHaveLength(4); // All required vaccines
      expect(otherVaccines.every(v => v.required)).toBe(true);
    });
  });

  describe('calculateVaccinationStatus', () => {
    it('returns CURRENT for future expiration date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const status = calculateVaccinationStatus(futureDate.toISOString());
      expect(status).toBe('CURRENT');
    });

    it('returns EXPIRED for past expiration date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      const status = calculateVaccinationStatus(pastDate.toISOString());
      expect(status).toBe('EXPIRED');
    });

    it('returns PENDING for null/undefined expiration date', () => {
      expect(calculateVaccinationStatus(null)).toBe('PENDING');
      expect(calculateVaccinationStatus(undefined)).toBe('PENDING');
    });
  });

  describe('getNextDueDate', () => {
    it('calculates next due date correctly', () => {
      const lastGiven = '2024-01-01T00:00:00.000Z';
      const frequencyMonths = 12;
      
      const nextDue = getNextDueDate(lastGiven, frequencyMonths);
      expect(nextDue).toBe('2025-01-01T00:00:00.000Z');
    });

    it('returns undefined for missing parameters', () => {
      expect(getNextDueDate(undefined, 12)).toBeUndefined();
      expect(getNextDueDate('2024-01-01T00:00:00.000Z', undefined)).toBeUndefined();
    });
  });

  describe('isPetCompliant', () => {
    it('returns true for compliant dog', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT' },
        dhpp: { status: 'CURRENT' },
        bordetella: { status: 'CURRENT' }
      };
      
      const isCompliant = isPetCompliant(vaccinationStatus, 'DOG');
      expect(isCompliant).toBe(true);
    });

    it('returns false for dog with expired rabies', () => {
      const vaccinationStatus = {
        rabies: { status: 'EXPIRED' },
        dhpp: { status: 'CURRENT' },
        bordetella: { status: 'CURRENT' }
      };
      
      const isCompliant = isPetCompliant(vaccinationStatus, 'DOG');
      expect(isCompliant).toBe(false);
    });

    it('returns false for dog missing required vaccine', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT' },
        dhpp: { status: 'CURRENT' }
        // Missing bordetella
      };
      
      const isCompliant = isPetCompliant(vaccinationStatus, 'DOG');
      expect(isCompliant).toBe(false);
    });

    it('returns true for compliant cat', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT' },
        fvrcp: { status: 'CURRENT' }
      };
      
      const isCompliant = isPetCompliant(vaccinationStatus, 'CAT');
      expect(isCompliant).toBe(true);
    });
  });

  describe('getComplianceStatus', () => {
    it('returns compliant status for fully compliant pet', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT' },
        dhpp: { status: 'CURRENT' },
        bordetella: { status: 'CURRENT' }
      };
      
      const status = getComplianceStatus(vaccinationStatus, 'DOG');
      
      expect(status).toEqual({
        compliant: true,
        expiredCount: 0,
        missingCount: 0,
        totalCount: 3
      });
    });

    it('counts expired vaccines correctly', () => {
      const vaccinationStatus = {
        rabies: { status: 'EXPIRED' },
        dhpp: { status: 'CURRENT' },
        bordetella: { status: 'EXPIRED' }
      };
      
      const status = getComplianceStatus(vaccinationStatus, 'DOG');
      
      expect(status).toEqual({
        compliant: false,
        expiredCount: 2,
        missingCount: 0,
        totalCount: 3
      });
    });

    it('counts missing vaccines correctly', () => {
      const vaccinationStatus = {
        rabies: { status: 'CURRENT' }
        // Missing dhpp and bordetella
      };
      
      const status = getComplianceStatus(vaccinationStatus, 'DOG');
      
      expect(status).toEqual({
        compliant: false,
        expiredCount: 0,
        missingCount: 2,
        totalCount: 3
      });
    });

    it('handles mixed expired and missing vaccines', () => {
      const vaccinationStatus = {
        rabies: { status: 'EXPIRED' }
        // Missing dhpp and bordetella
      };
      
      const status = getComplianceStatus(vaccinationStatus, 'DOG');
      
      expect(status).toEqual({
        compliant: false,
        expiredCount: 1,
        missingCount: 2,
        totalCount: 3
      });
    });
  });

  describe('formatVaccinationStatus', () => {
    it('formats status strings correctly', () => {
      expect(formatVaccinationStatus('CURRENT')).toBe('Current');
      expect(formatVaccinationStatus('EXPIRED')).toBe('Expired');
      expect(formatVaccinationStatus('PENDING')).toBe('Due');
      expect(formatVaccinationStatus('NOT_REQUIRED')).toBe('Not Required');
      expect(formatVaccinationStatus('UNKNOWN')).toBe('Unknown');
    });
  });

  describe('getVaccinationStatusColor', () => {
    it('returns correct colors for each status', () => {
      expect(getVaccinationStatusColor('CURRENT')).toBe('success');
      expect(getVaccinationStatusColor('EXPIRED')).toBe('error');
      expect(getVaccinationStatusColor('PENDING')).toBe('warning');
      expect(getVaccinationStatusColor('NOT_REQUIRED')).toBe('default');
      expect(getVaccinationStatusColor('UNKNOWN')).toBe('default');
    });
  });

  describe('VACCINATION_TYPES constant', () => {
    it('contains expected vaccine types', () => {
      expect(VACCINATION_TYPES).toHaveLength(6);
      
      const vaccineIds = VACCINATION_TYPES.map(v => v.id);
      expect(vaccineIds).toContain('rabies');
      expect(vaccineIds).toContain('dhpp');
      expect(vaccineIds).toContain('bordetella');
      expect(vaccineIds).toContain('canine_influenza');
      expect(vaccineIds).toContain('fvrcp');
      expect(vaccineIds).toContain('feline_leukemia');
    });

    it('has required vaccines marked correctly', () => {
      const requiredVaccines = VACCINATION_TYPES.filter(v => v.required);
      expect(requiredVaccines).toHaveLength(4); // All except canine_influenza and feline_leukemia
      
      const requiredIds = requiredVaccines.map(v => v.id);
      expect(requiredIds).toContain('rabies');
      expect(requiredIds).toContain('dhpp');
      expect(requiredIds).toContain('bordetella');
      expect(requiredIds).toContain('fvrcp');
    });

    it('has appropriate validity periods', () => {
      const rabies = VACCINATION_TYPES.find(v => v.id === 'rabies');
      expect(rabies?.typicalDuration).toBe(36); // 3 years
      
      const dhpp = VACCINATION_TYPES.find(v => v.id === 'dhpp');
      expect(dhpp?.typicalDuration).toBe(12); // 1 year
      
      const bordetella = VACCINATION_TYPES.find(v => v.id === 'bordetella');
      expect(bordetella?.typicalDuration).toBe(6); // 6 months
    });
  });
});
