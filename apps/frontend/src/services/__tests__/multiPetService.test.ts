/**
 * Multi-Pet Service Tests
 */

import { multiPetService } from '../multiPetService';
import { SuiteCapacity, PetInSuite } from '../../types/multiPet';

describe('Multi-Pet Service', () => {
  describe('calculatePricingLocal - PER_PET', () => {
    const capacity: SuiteCapacity = {
      id: '1',
      suiteType: 'STANDARD',
      capacityType: 'DOUBLE',
      maxPets: 2,
      pricingType: 'PER_PET',
      basePrice: 50,
      additionalPetPrice: 40,
      isActive: true
    };

    it('should calculate price for 1 pet', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 1);
      
      expect(result.totalPrice).toBe(50);
      expect(result.basePrice).toBe(50);
      expect(result.additionalPetCharges).toBe(0);
      expect(result.perPetCost).toBe(50);
    });

    it('should calculate price for 2 pets', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 2);
      
      expect(result.totalPrice).toBe(90); // 50 + 40
      expect(result.additionalPetCharges).toBe(40);
      expect(result.perPetCost).toBe(45);
    });

    it('should include breakdown', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 2);
      
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].description).toContain('First pet');
      expect(result.breakdown[1].description).toContain('Additional pet');
    });
  });

  describe('calculatePricingLocal - FLAT_RATE', () => {
    const capacity: SuiteCapacity = {
      id: '1',
      suiteType: 'STANDARD',
      capacityType: 'FAMILY',
      maxPets: 4,
      pricingType: 'FLAT_RATE',
      basePrice: 150,
      isActive: true
    };

    it('should charge flat rate for any number of pets', () => {
      expect(multiPetService.calculatePricingLocal(capacity, 1).totalPrice).toBe(150);
      expect(multiPetService.calculatePricingLocal(capacity, 2).totalPrice).toBe(150);
      expect(multiPetService.calculatePricingLocal(capacity, 4).totalPrice).toBe(150);
    });

    it('should calculate per-pet cost correctly', () => {
      expect(multiPetService.calculatePricingLocal(capacity, 2).perPetCost).toBe(75);
      expect(multiPetService.calculatePricingLocal(capacity, 4).perPetCost).toBe(37.5);
    });
  });

  describe('calculatePricingLocal - TIERED', () => {
    const capacity: SuiteCapacity = {
      id: '1',
      suiteType: 'DELUXE',
      capacityType: 'FAMILY',
      maxPets: 4,
      pricingType: 'TIERED',
      basePrice: 80,
      tieredPricing: [
        { minPets: 1, maxPets: 1, price: 80, description: 'Single pet' },
        { minPets: 2, maxPets: 2, price: 140, description: 'Two pets' },
        { minPets: 3, maxPets: 3, price: 190, description: 'Three pets' },
        { minPets: 4, maxPets: 4, price: 230, description: 'Four pets' }
      ],
      isActive: true
    };

    it('should use correct tier for 1 pet', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 1);
      expect(result.totalPrice).toBe(80);
    });

    it('should use correct tier for 2 pets', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 2);
      expect(result.totalPrice).toBe(140);
    });

    it('should use correct tier for 3 pets', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 3);
      expect(result.totalPrice).toBe(190);
    });

    it('should use correct tier for 4 pets', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 4);
      expect(result.totalPrice).toBe(230);
    });
  });

  describe('calculatePricingLocal - PERCENTAGE_OFF', () => {
    const capacity: SuiteCapacity = {
      id: '1',
      suiteType: 'LUXURY',
      capacityType: 'GROUP',
      maxPets: 6,
      pricingType: 'PERCENTAGE_OFF',
      basePrice: 120,
      additionalPetPrice: 100,
      percentageOff: 10,
      isActive: true
    };

    it('should apply percentage off to additional pets', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 2);
      
      // First pet: 120, Second pet: 100 - 10% = 90
      expect(result.totalPrice).toBe(210);
      expect(result.discounts).toBe(10);
    });

    it('should calculate savings correctly', () => {
      const result = multiPetService.calculatePricingLocal(capacity, 3);
      
      // First: 120, Second: 90, Third: 90 = 300
      // Standard would be: 120 * 3 = 360
      // Savings: 60
      expect(result.totalPrice).toBe(300);
      expect(result.savings).toBe(60);
      expect(result.savingsPercentage).toBeCloseTo(16.67, 1);
    });
  });

  describe('checkCompatibilityLocal', () => {
    it('should pass for single pet', () => {
      const pets: PetInSuite[] = [
        { petId: '1', petName: 'Max', size: 'MEDIUM' }
      ];

      const result = multiPetService.checkCompatibilityLocal(pets);
      
      expect(result.isCompatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should warn about size differences', () => {
      const pets: PetInSuite[] = [
        { petId: '1', petName: 'Max', size: 'SMALL' },
        { petId: '2', petName: 'Buddy', size: 'MEDIUM' },
        { petId: '3', petName: 'Rex', size: 'LARGE' }
      ];

      const result = multiPetService.checkCompatibilityLocal(pets);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('different sizes');
    });

    it('should warn about young and senior mix', () => {
      const pets: PetInSuite[] = [
        { petId: '1', petName: 'Puppy', age: 6 },  // 6 months
        { petId: '2', petName: 'Senior', age: 96 }  // 8 years
      ];

      const result = multiPetService.checkCompatibilityLocal(pets);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('young and senior');
    });

    it('should warn about special needs', () => {
      const pets: PetInSuite[] = [
        { petId: '1', petName: 'Max', specialNeeds: ['medication'] },
        { petId: '2', petName: 'Buddy', specialNeeds: [] }
      ];

      const result = multiPetService.checkCompatibilityLocal(pets);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('special needs');
    });
  });

  describe('calculateOccupancyPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(multiPetService.calculateOccupancyPercentage(0, 4)).toBe(0);
      expect(multiPetService.calculateOccupancyPercentage(1, 4)).toBe(25);
      expect(multiPetService.calculateOccupancyPercentage(2, 4)).toBe(50);
      expect(multiPetService.calculateOccupancyPercentage(3, 4)).toBe(75);
      expect(multiPetService.calculateOccupancyPercentage(4, 4)).toBe(100);
    });

    it('should handle zero capacity', () => {
      expect(multiPetService.calculateOccupancyPercentage(0, 0)).toBe(0);
    });
  });

  describe('canAcceptMorePets', () => {
    it('should return true when capacity available', () => {
      expect(multiPetService.canAcceptMorePets(2, 4, 1)).toBe(true);
      expect(multiPetService.canAcceptMorePets(2, 4, 2)).toBe(true);
    });

    it('should return false when capacity exceeded', () => {
      expect(multiPetService.canAcceptMorePets(3, 4, 2)).toBe(false);
      expect(multiPetService.canAcceptMorePets(4, 4, 1)).toBe(false);
    });

    it('should return true when exactly at capacity', () => {
      expect(multiPetService.canAcceptMorePets(2, 4, 2)).toBe(true);
    });
  });

  describe('getOccupancyColor', () => {
    it('should return green for empty', () => {
      expect(multiPetService.getOccupancyColor(0)).toBe('#4caf50');
    });

    it('should return light green for low occupancy', () => {
      expect(multiPetService.getOccupancyColor(25)).toBe('#8bc34a');
    });

    it('should return orange for medium occupancy', () => {
      expect(multiPetService.getOccupancyColor(60)).toBe('#ff9800');
    });

    it('should return deep orange for high occupancy', () => {
      expect(multiPetService.getOccupancyColor(85)).toBe('#ff5722');
    });

    it('should return red for full', () => {
      expect(multiPetService.getOccupancyColor(100)).toBe('#f44336');
    });
  });

  describe('formatCapacity', () => {
    it('should format capacity correctly', () => {
      expect(multiPetService.formatCapacity(0, 4)).toBe('0/4 pets');
      expect(multiPetService.formatCapacity(2, 4)).toBe('2/4 pets');
      expect(multiPetService.formatCapacity(4, 4)).toBe('4/4 pets');
    });
  });

  describe('getCapacityStatus', () => {
    it('should return "Full" when at capacity', () => {
      expect(multiPetService.getCapacityStatus(4, 4)).toBe('Full');
    });

    it('should return "Empty" when no occupancy', () => {
      expect(multiPetService.getCapacityStatus(0, 4)).toBe('Empty');
    });

    it('should return available spots', () => {
      expect(multiPetService.getCapacityStatus(1, 4)).toBe('3 spots available');
      expect(multiPetService.getCapacityStatus(3, 4)).toBe('1 spot available');
    });
  });

  describe('validateCapacity', () => {
    it('should validate complete capacity', () => {
      const capacity: Partial<SuiteCapacity> = {
        suiteType: 'STANDARD',
        maxPets: 2,
        basePrice: 50,
        pricingType: 'PER_PET',
        additionalPetPrice: 40
      };

      const result = multiPetService.validateCapacity(capacity);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require suite type', () => {
      const capacity: Partial<SuiteCapacity> = {
        maxPets: 2,
        basePrice: 50,
        pricingType: 'PER_PET'
      };

      const result = multiPetService.validateCapacity(capacity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Suite type is required');
    });

    it('should require max pets', () => {
      const capacity: Partial<SuiteCapacity> = {
        suiteType: 'STANDARD',
        basePrice: 50,
        pricingType: 'PER_PET'
      };

      const result = multiPetService.validateCapacity(capacity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum pets must be at least 1');
    });

    it('should require base price', () => {
      const capacity: Partial<SuiteCapacity> = {
        suiteType: 'STANDARD',
        maxPets: 2,
        pricingType: 'PER_PET'
      };

      const result = multiPetService.validateCapacity(capacity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base price must be greater than 0');
    });

    it('should require additional pet price for PER_PET', () => {
      const capacity: Partial<SuiteCapacity> = {
        suiteType: 'STANDARD',
        maxPets: 2,
        basePrice: 50,
        pricingType: 'PER_PET'
      };

      const result = multiPetService.validateCapacity(capacity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Additional pet price is required for per-pet pricing');
    });
  });
});
