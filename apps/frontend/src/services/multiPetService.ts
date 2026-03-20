/**
 * Multi-Pet Suite Service
 *
 * Handles multi-pet bookings, capacity management, and pricing
 */

import { customerApi } from './api';
import {
  SuiteCapacityConfig,
  SuiteCapacity,
  MultiPetReservation,
  SuiteOccupancy,
  MultiPetPricingCalculation,
  CompatibilityCheck,
  SuiteAvailability,
  PetInSuite,
  MultiPetPricingType,
  PricingBreakdown,
} from '../types/multiPet';

export const multiPetService = {
  // ==================== Configuration Management ====================

  /**
   * Get suite capacity configuration
   */
  getConfig: async (): Promise<SuiteCapacityConfig> => {
    const response = await customerApi.get('/api/multi-pet/config');
    return response.data;
  },

  /**
   * Update suite capacity configuration
   */
  updateConfig: async (
    config: Partial<SuiteCapacityConfig>
  ): Promise<SuiteCapacityConfig> => {
    const response = await customerApi.put('/api/multi-pet/config', config);
    return response.data;
  },

  // ==================== Suite Capacity Management ====================

  /**
   * Get all suite capacities
   */
  getSuiteCapacities: async (): Promise<SuiteCapacity[]> => {
    const response = await customerApi.get('/api/multi-pet/capacities');
    return response.data;
  },

  /**
   * Create suite capacity
   */
  createSuiteCapacity: async (
    capacity: Partial<SuiteCapacity>
  ): Promise<SuiteCapacity> => {
    const response = await customerApi.post(
      '/api/multi-pet/capacities',
      capacity
    );
    return response.data;
  },

  /**
   * Update suite capacity
   */
  updateSuiteCapacity: async (
    id: string,
    updates: Partial<SuiteCapacity>
  ): Promise<SuiteCapacity> => {
    const response = await customerApi.put(
      `/api/multi-pet/capacities/${id}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete suite capacity
   */
  deleteSuiteCapacity: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/multi-pet/capacities/${id}`);
  },

  // ==================== Pricing Calculations ====================

  /**
   * Calculate multi-pet pricing
   */
  calculatePricing: async (
    suiteType: string,
    numberOfPets: number
  ): Promise<MultiPetPricingCalculation> => {
    const response = await customerApi.post(
      '/api/multi-pet/calculate-pricing',
      {
        suiteType,
        numberOfPets,
      }
    );
    return response.data;
  },

  /**
   * Calculate pricing locally (client-side)
   */
  calculatePricingLocal: (
    capacity: SuiteCapacity,
    numberOfPets: number,
    pets?: PetInSuite[]
  ): MultiPetPricingCalculation => {
    if (numberOfPets < 1) {
      return {
        suiteType: capacity.suiteType,
        numberOfPets: 0,
        basePrice: 0,
        additionalPetCharges: 0,
        discounts: 0,
        totalPrice: 0,
        perPetCost: 0,
        breakdown: [],
        explanation: 'No pets selected',
      };
    }

    let totalPrice = 0;
    let additionalCharges = 0;
    let discounts = 0;
    const breakdown: PricingBreakdown[] = [];

    if (capacity.pricingType === 'PER_PET') {
      // First pet at base price, additional pets at additional price
      totalPrice = capacity.basePrice;
      breakdown.push({
        description: `First pet (${capacity.suiteType})`,
        amount: capacity.basePrice,
        petId: pets?.[0]?.petId,
        petName: pets?.[0]?.petName,
      });

      if (numberOfPets > 1 && capacity.additionalPetPrice) {
        additionalCharges = (numberOfPets - 1) * capacity.additionalPetPrice;
        totalPrice += additionalCharges;

        for (let i = 1; i < numberOfPets; i++) {
          breakdown.push({
            description: `Additional pet ${i}`,
            amount: capacity.additionalPetPrice,
            petId: pets?.[i]?.petId,
            petName: pets?.[i]?.petName,
          });
        }
      }
    } else if (capacity.pricingType === 'FLAT_RATE') {
      // Flat rate regardless of number of pets
      totalPrice = capacity.basePrice;
      breakdown.push({
        description: `Flat rate for ${numberOfPets} pet(s)`,
        amount: capacity.basePrice,
      });
    } else if (capacity.pricingType === 'TIERED' && capacity.tieredPricing) {
      // Find matching tier
      const tier = capacity.tieredPricing.find(
        (t) => numberOfPets >= t.minPets && numberOfPets <= t.maxPets
      );

      if (tier) {
        totalPrice = tier.price;
        breakdown.push({
          description: tier.description || `${numberOfPets} pet(s)`,
          amount: tier.price,
        });
      } else {
        // Fallback to base price
        totalPrice = capacity.basePrice;
        breakdown.push({
          description: `${numberOfPets} pet(s) (base rate)`,
          amount: capacity.basePrice,
        });
      }
    } else if (capacity.pricingType === 'PERCENTAGE_OFF') {
      // Base price for first pet, percentage off for additional pets
      totalPrice = capacity.basePrice;
      breakdown.push({
        description: `First pet`,
        amount: capacity.basePrice,
        petId: pets?.[0]?.petId,
        petName: pets?.[0]?.petName,
      });

      if (
        numberOfPets > 1 &&
        capacity.additionalPetPrice &&
        capacity.percentageOff
      ) {
        for (let i = 1; i < numberOfPets; i++) {
          const discount =
            capacity.additionalPetPrice * (capacity.percentageOff / 100);
          const discountedPrice = capacity.additionalPetPrice - discount;

          totalPrice += discountedPrice;
          additionalCharges += discountedPrice;
          discounts += discount;

          breakdown.push({
            description: `Additional pet ${i} (${capacity.percentageOff}% off)`,
            amount: discountedPrice,
            petId: pets?.[i]?.petId,
            petName: pets?.[i]?.petName,
          });
        }
      }
    }

    const perPetCost = totalPrice / numberOfPets;

    // Calculate savings compared to individual bookings
    const standardTotal = capacity.basePrice * numberOfPets;
    const savings = standardTotal - totalPrice;
    const savingsPercentage = (savings / standardTotal) * 100;

    return {
      suiteType: capacity.suiteType,
      numberOfPets,
      basePrice: capacity.basePrice,
      additionalPetCharges: additionalCharges,
      discounts,
      totalPrice,
      perPetCost,
      breakdown,
      standardTotal,
      savings: savings > 0 ? savings : undefined,
      savingsPercentage: savings > 0 ? savingsPercentage : undefined,
      explanation: multiPetService.generatePricingExplanation(
        capacity.pricingType,
        numberOfPets,
        totalPrice,
        savings
      ),
    };
  },

  /**
   * Generate pricing explanation
   */
  generatePricingExplanation: (
    pricingType: MultiPetPricingType,
    numberOfPets: number,
    totalPrice: number,
    savings?: number
  ): string => {
    let explanation = '';

    if (pricingType === 'PER_PET') {
      explanation = `${numberOfPets} pet(s) at per-pet rate`;
    } else if (pricingType === 'FLAT_RATE') {
      explanation = `Flat rate for ${numberOfPets} pet(s)`;
    } else if (pricingType === 'TIERED') {
      explanation = `Tiered pricing for ${numberOfPets} pet(s)`;
    } else if (pricingType === 'PERCENTAGE_OFF') {
      explanation = `Multi-pet discount applied`;
    }

    if (savings && savings > 0) {
      explanation += ` - Save $${savings.toFixed(2)}!`;
    }

    return explanation;
  },

  // ==================== Compatibility Checks ====================

  /**
   * Check pet compatibility
   */
  checkCompatibility: async (petIds: string[]): Promise<CompatibilityCheck> => {
    const response = await customerApi.post(
      '/api/multi-pet/check-compatibility',
      {
        petIds,
      }
    );
    return response.data;
  },

  /**
   * Check compatibility locally (client-side)
   */
  checkCompatibilityLocal: (
    pets: PetInSuite[],
    requireSameOwner: boolean = true
  ): CompatibilityCheck => {
    const issues: any[] = [];
    const warnings: any[] = [];
    const recommendations: string[] = [];

    if (pets.length < 2) {
      return {
        isCompatible: true,
        issues: [],
        warnings: [],
        recommendations: [],
      };
    }

    // Check size compatibility
    const sizes = pets.map((p) => p.size).filter(Boolean);
    if (sizes.length > 1) {
      const uniqueSizes = new Set(sizes);
      if (uniqueSizes.size > 2) {
        warnings.push({
          message: 'Pets have significantly different sizes',
          affectedPets: pets.map((p) => p.petName),
        });
        recommendations.push('Consider grouping pets of similar sizes');
      }
    }

    // Check age compatibility
    const ages = pets.map((p) => p.age).filter(Boolean) as number[];
    if (ages.length > 1) {
      const hasYoung = ages.some((age) => age < 12); // Less than 1 year
      const hasSenior = ages.some((age) => age > 84); // Over 7 years

      if (hasYoung && hasSenior) {
        warnings.push({
          message: 'Mix of young and senior pets',
          affectedPets: pets
            .filter((p) => p.age && (p.age < 12 || p.age > 84))
            .map((p) => p.petName),
        });
        recommendations.push(
          'Monitor interaction between young and senior pets'
        );
      }
    }

    // Check special needs
    const petsWithSpecialNeeds = pets.filter(
      (p) => p.specialNeeds && p.specialNeeds.length > 0
    );
    if (petsWithSpecialNeeds.length > 0) {
      warnings.push({
        message: 'Some pets have special needs',
        affectedPets: petsWithSpecialNeeds.map((p) => p.petName),
      });
      recommendations.push('Ensure staff is aware of special needs');
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      warnings,
      recommendations,
    };
  },

  // ==================== Suite Occupancy ====================

  /**
   * Get suite occupancy
   */
  getSuiteOccupancy: async (
    suiteId: string,
    startDate: string,
    endDate: string
  ): Promise<SuiteOccupancy> => {
    const response = await customerApi.get(
      `/api/multi-pet/occupancy/${suiteId}`,
      {
        params: { startDate, endDate },
      }
    );
    return response.data;
  },

  /**
   * Get all suite occupancies
   */
  getAllSuiteOccupancies: async (
    startDate: string,
    endDate: string
  ): Promise<SuiteOccupancy[]> => {
    const response = await customerApi.get('/api/multi-pet/occupancies', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Check suite availability
   */
  checkSuiteAvailability: async (
    suiteId: string,
    startDate: string,
    endDate: string,
    numberOfPets: number
  ): Promise<SuiteAvailability> => {
    const response = await customerApi.post(
      '/api/multi-pet/check-availability',
      {
        suiteId,
        startDate,
        endDate,
        numberOfPets,
      }
    );
    return response.data;
  },

  // ==================== Multi-Pet Reservations ====================

  /**
   * Create multi-pet reservation
   */
  createReservation: async (
    reservation: Partial<MultiPetReservation>
  ): Promise<MultiPetReservation> => {
    const response = await customerApi.post(
      '/api/multi-pet/reservations',
      reservation
    );
    return response.data;
  },

  /**
   * Get multi-pet reservation
   */
  getReservation: async (
    reservationId: string
  ): Promise<MultiPetReservation> => {
    const response = await customerApi.get(
      `/api/multi-pet/reservations/${reservationId}`
    );
    return response.data;
  },

  /**
   * Update multi-pet reservation
   */
  updateReservation: async (
    reservationId: string,
    updates: Partial<MultiPetReservation>
  ): Promise<MultiPetReservation> => {
    const response = await customerApi.put(
      `/api/multi-pet/reservations/${reservationId}`,
      updates
    );
    return response.data;
  },

  // ==================== Client-Side Helpers ====================

  /**
   * Calculate occupancy percentage
   */
  calculateOccupancyPercentage: (
    currentOccupancy: number,
    maxCapacity: number
  ): number => {
    if (maxCapacity === 0) return 0;
    return Math.round((currentOccupancy / maxCapacity) * 100);
  },

  /**
   * Check if suite can accept more pets
   */
  canAcceptMorePets: (
    currentOccupancy: number,
    maxCapacity: number,
    requestedPets: number
  ): boolean => {
    return currentOccupancy + requestedPets <= maxCapacity;
  },

  /**
   * Get occupancy color
   */
  getOccupancyColor: (occupancyPercentage: number): string => {
    if (occupancyPercentage === 0) return '#4caf50'; // Green - empty
    if (occupancyPercentage < 50) return '#8bc34a'; // Light green
    if (occupancyPercentage < 75) return '#ff9800'; // Orange
    if (occupancyPercentage < 100) return '#ff5722'; // Deep orange
    return '#f44336'; // Red - full
  },

  /**
   * Format capacity display
   */
  formatCapacity: (current: number, max: number): string => {
    return `${current}/${max} pets`;
  },

  /**
   * Get capacity status text
   */
  getCapacityStatus: (current: number, max: number): string => {
    const available = max - current;
    if (available === 0) return 'Full';
    if (available === max) return 'Empty';
    return `${available} spot${available === 1 ? '' : 's'} available`;
  },

  /**
   * Validate suite capacity configuration
   */
  validateCapacity: (
    capacity: Partial<SuiteCapacity>
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!capacity.suiteType || capacity.suiteType.trim().length === 0) {
      errors.push('Suite type is required');
    }

    if (!capacity.maxPets || capacity.maxPets < 1) {
      errors.push('Maximum pets must be at least 1');
    }

    if (!capacity.basePrice || capacity.basePrice <= 0) {
      errors.push('Base price must be greater than 0');
    }

    if (capacity.pricingType === 'PER_PET' && !capacity.additionalPetPrice) {
      errors.push('Additional pet price is required for per-pet pricing');
    }

    if (
      capacity.pricingType === 'TIERED' &&
      (!capacity.tieredPricing || capacity.tieredPricing.length === 0)
    ) {
      errors.push('Tiered pricing configuration is required');
    }

    if (
      capacity.pricingType === 'PERCENTAGE_OFF' &&
      (!capacity.percentageOff || capacity.percentageOff <= 0)
    ) {
      errors.push('Percentage off is required for percentage-off pricing');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};
