/**
 * Multi-Pet Suite Bookings Types
 * 
 * Allows multiple pets in the same suite with:
 * - Configurable capacity per suite type
 * - Family/household pet grouping
 * - Multi-pet pricing rules
 * - Compatibility checks
 * - Visual indicators
 */

export type SuiteCapacityType = 
  | 'SINGLE'      // One pet only
  | 'DOUBLE'      // Two pets
  | 'FAMILY'      // 3-4 pets (same family)
  | 'GROUP'       // 5+ pets (same family)
  | 'CUSTOM';     // Custom capacity

export type MultiPetPricingType =
  | 'PER_PET'           // Charge per pet
  | 'FLAT_RATE'         // Flat rate regardless of count
  | 'TIERED'            // Tiered pricing (1 pet, 2 pets, 3+ pets)
  | 'PERCENTAGE_OFF';   // Percentage off for additional pets

export interface SuiteCapacityConfig {
  id: string;
  tenantId: string;
  
  // Suite type configurations
  suiteCapacities: SuiteCapacity[];
  
  // Multi-pet settings
  allowMultiplePets: boolean;
  requireSameOwner: boolean;
  requireSameHousehold: boolean;
  
  // Compatibility checks
  enableCompatibilityChecks: boolean;
  compatibilityRules: CompatibilityRule[];
  
  // Visual indicators
  showOccupancyIndicators: boolean;
  showPetNamesInSuite: boolean;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SuiteCapacity {
  id: string;
  suiteType: string;           // e.g., 'STANDARD', 'DELUXE', 'LUXURY'
  capacityType: SuiteCapacityType;
  maxPets: number;
  
  // Size/space requirements
  minSquareFeet?: number;
  maxSquareFeet?: number;
  
  // Pricing
  pricingType: MultiPetPricingType;
  basePrice: number;
  additionalPetPrice?: number;
  tieredPricing?: TieredPricing[];
  percentageOff?: number;
  
  // Restrictions
  maxPetsPerBreed?: number;
  maxLargeDogs?: number;
  requireSeparateBedding?: boolean;
  
  isActive: boolean;
}

export interface TieredPricing {
  minPets: number;
  maxPets: number;
  price: number;
  description?: string;
}

export interface CompatibilityRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  
  // Size compatibility
  allowMixedSizes?: boolean;
  maxSizeDifference?: 'SMALL' | 'MEDIUM' | 'LARGE';
  
  // Age compatibility
  allowPuppies?: boolean;
  allowSeniors?: boolean;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  
  // Temperament compatibility
  requireFriendlyTemperament?: boolean;
  excludeAggressivePets?: boolean;
  
  // Health compatibility
  requireVaccinations?: boolean;
  excludeSickPets?: boolean;
  
  // Breed compatibility
  excludedBreeds?: string[];
  allowedBreeds?: string[];
}

export interface MultiPetReservation {
  id: string;
  reservationId: string;
  suiteId: string;
  customerId: string;
  tenantId: string;
  
  // Pets in suite
  pets: PetInSuite[];
  totalPets: number;
  
  // Capacity
  suiteCapacity: number;
  occupancyPercentage: number;
  
  // Pricing
  basePrice: number;
  additionalPetCharges: number;
  totalPrice: number;
  pricingBreakdown: PricingBreakdown[];
  
  // Compatibility
  compatibilityChecked: boolean;
  compatibilityIssues?: string[];
  
  // Status
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT';
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PetInSuite {
  petId: string;
  petName: string;
  breed?: string;
  size?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
  age?: number;
  weight?: number;
  temperament?: string;
  specialNeeds?: string[];
  beddingLocation?: string;
  feedingSchedule?: string;
}

export interface PricingBreakdown {
  description: string;
  amount: number;
  petId?: string;
  petName?: string;
}

export interface SuiteOccupancy {
  suiteId: string;
  suiteName: string;
  suiteType: string;
  
  // Capacity
  maxCapacity: number;
  currentOccupancy: number;
  availableSpots: number;
  occupancyPercentage: number;
  
  // Current pets
  pets: PetInSuite[];
  
  // Reservation info
  reservationId?: string;
  customerId?: string;
  customerName?: string;
  
  // Dates
  checkInDate: Date | string;
  checkOutDate: Date | string;
  
  // Status
  isFullyOccupied: boolean;
  canAcceptMorePets: boolean;
}

export interface MultiPetPricingCalculation {
  suiteType: string;
  numberOfPets: number;
  
  // Pricing breakdown
  basePrice: number;
  additionalPetCharges: number;
  discounts: number;
  totalPrice: number;
  
  // Per-pet breakdown
  perPetCost: number;
  breakdown: PricingBreakdown[];
  
  // Savings
  standardTotal?: number;
  savings?: number;
  savingsPercentage?: number;
  
  explanation: string;
}

export interface CompatibilityCheck {
  isCompatible: boolean;
  issues: CompatibilityIssue[];
  warnings: CompatibilityWarning[];
  recommendations: string[];
}

export interface CompatibilityIssue {
  severity: 'ERROR' | 'WARNING';
  rule: string;
  description: string;
  affectedPets: string[];
}

export interface CompatibilityWarning {
  message: string;
  affectedPets: string[];
}

export interface SuiteAvailability {
  suiteId: string;
  suiteName: string;
  suiteType: string;
  maxCapacity: number;
  
  // Availability by date
  availabilityByDate: {
    date: string;
    availableSpots: number;
    currentOccupancy: number;
    isAvailable: boolean;
  }[];
  
  // Overall availability
  hasAvailability: boolean;
  firstAvailableDate?: string;
  consecutiveAvailableDays?: number;
}

// Default configurations
export const DEFAULT_SUITE_CAPACITIES: Partial<SuiteCapacity>[] = [
  {
    suiteType: 'STANDARD',
    capacityType: 'DOUBLE',
    maxPets: 2,
    pricingType: 'PER_PET',
    basePrice: 50,
    additionalPetPrice: 40,
    isActive: true
  },
  {
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
  },
  {
    suiteType: 'LUXURY',
    capacityType: 'GROUP',
    maxPets: 6,
    pricingType: 'PERCENTAGE_OFF',
    basePrice: 120,
    additionalPetPrice: 100,
    percentageOff: 10, // 10% off per additional pet
    isActive: true
  }
];

export const DEFAULT_COMPATIBILITY_RULES: Partial<CompatibilityRule>[] = [
  {
    name: 'Same Owner Required',
    description: 'All pets must belong to the same owner',
    isActive: true,
    requireFriendlyTemperament: true
  },
  {
    name: 'Size Compatibility',
    description: 'Pets should be similar in size',
    isActive: true,
    allowMixedSizes: true,
    maxSizeDifference: 'MEDIUM'
  },
  {
    name: 'Age Compatibility',
    description: 'Puppies and seniors may need special consideration',
    isActive: true,
    allowPuppies: true,
    allowSeniors: true,
    minAgeMonths: 4
  },
  {
    name: 'Health Requirements',
    description: 'All pets must be healthy and vaccinated',
    isActive: true,
    requireVaccinations: true,
    excludeSickPets: true
  },
  {
    name: 'Temperament Check',
    description: 'Pets must be friendly and non-aggressive',
    isActive: true,
    requireFriendlyTemperament: true,
    excludeAggressivePets: true
  }
];
