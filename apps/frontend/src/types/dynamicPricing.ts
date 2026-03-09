/**
 * Dynamic Pricing Types
 * 
 * Types for peak demand pricing including:
 * - Seasonal pricing rules
 * - Peak time surcharges
 * - Capacity-based pricing
 * - Special event pricing
 * - Automated price adjustments
 */

export type PricingRuleType = 
  | 'SEASONAL'
  | 'PEAK_TIME'
  | 'CAPACITY_BASED'
  | 'SPECIAL_EVENT'
  | 'DAY_OF_WEEK'
  | 'ADVANCE_BOOKING'
  | 'LAST_MINUTE';

export type PricingAdjustmentType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type Season = 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: PricingRuleType;
  isActive: boolean;
  priority: number; // Higher priority rules apply first
  
  // Adjustment
  adjustmentType: PricingAdjustmentType;
  adjustmentValue: number; // Percentage (0-100) or dollar amount
  
  // Applicability
  serviceIds?: string[]; // If specified, only applies to these services
  suiteTypes?: string[]; // If specified, only applies to these suite types
  
  // Date/Time restrictions
  validFrom?: Date | string;
  validUntil?: Date | string;
  
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
}

export interface SeasonalPricingRule extends PricingRule {
  type: 'SEASONAL';
  season: Season;
  startMonth: number; // 1-12
  startDay: number; // 1-31
  endMonth: number;
  endDay: number;
}

export interface PeakTimePricingRule extends PricingRule {
  type: 'PEAK_TIME';
  daysOfWeek?: DayOfWeek[]; // If specified, only applies on these days
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isHoliday?: boolean; // Apply on holidays
  isWeekend?: boolean; // Apply on weekends
}

export interface CapacityBasedPricingRule extends PricingRule {
  type: 'CAPACITY_BASED';
  minOccupancyPercentage: number; // 0-100
  maxOccupancyPercentage: number; // 0-100
}

export interface SpecialEventPricingRule extends PricingRule {
  type: 'SPECIAL_EVENT';
  eventName: string;
  eventDates: string[]; // Array of YYYY-MM-DD dates
  applyDaysBefore?: number; // Apply X days before event
  applyDaysAfter?: number; // Apply X days after event
}

export interface AdvanceBookingPricingRule extends PricingRule {
  type: 'ADVANCE_BOOKING';
  minDaysInAdvance: number;
  maxDaysInAdvance?: number;
  isDiscount: boolean; // true = discount, false = surcharge
}

export interface LastMinutePricingRule extends PricingRule {
  type: 'LAST_MINUTE';
  maxDaysInAdvance: number; // e.g., 3 days or less
  isDiscount: boolean; // Usually a discount to fill capacity
}

export type AnyPricingRule = 
  | SeasonalPricingRule
  | PeakTimePricingRule
  | CapacityBasedPricingRule
  | SpecialEventPricingRule
  | AdvanceBookingPricingRule
  | LastMinutePricingRule;

export interface PriceCalculationRequest {
  basePrice: number;
  serviceId: string;
  suiteType?: string;
  checkInDate: string;
  checkOutDate: string;
  bookingDate?: string; // When the booking is being made
  numberOfNights: number;
  currentOccupancy?: number; // For capacity-based pricing
}

export interface PriceCalculationResult {
  basePrice: number;
  adjustments: PriceAdjustment[];
  totalAdjustment: number;
  finalPrice: number;
  breakdown: {
    basePrice: number;
    seasonalAdjustment: number;
    peakTimeAdjustment: number;
    capacityAdjustment: number;
    specialEventAdjustment: number;
    otherAdjustments: number;
  };
}

export interface PriceAdjustment {
  ruleId: string;
  ruleName: string;
  ruleType: PricingRuleType;
  adjustmentType: PricingAdjustmentType;
  adjustmentValue: number;
  calculatedAmount: number; // Actual dollar amount
  reason: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  year: number;
  isRecurring: boolean; // e.g., Christmas is always Dec 25
  month?: number; // For recurring holidays
  day?: number;
}

export interface PricingCalendar {
  month: number;
  year: number;
  dates: DatePricing[];
}

export interface DatePricing {
  date: string;
  basePrice: number;
  adjustedPrice: number;
  adjustments: PriceAdjustment[];
  isHoliday: boolean;
  isPeakTime: boolean;
  occupancyPercentage?: number;
}

export interface PricingRuleStats {
  ruleId: string;
  ruleName: string;
  timesApplied: number;
  totalRevenue: number;
  averageAdjustment: number;
  lastApplied?: Date | string;
}

export interface AutomatedPriceAdjustment {
  id: string;
  enabled: boolean;
  adjustmentFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  lastRun?: Date | string;
  nextRun?: Date | string;
  rules: {
    increaseWhenOccupancyAbove: number; // Percentage
    decreaseWhenOccupancyBelow: number; // Percentage
    maxIncreasePercentage: number;
    maxDecreasePercentage: number;
    minPrice: number; // Never go below this
    maxPrice: number; // Never go above this
  };
}

export interface PricingInsights {
  averagePrice: number;
  peakPrice: number;
  lowPrice: number;
  mostExpensiveDates: DatePricing[];
  leastExpensiveDates: DatePricing[];
  revenueImpact: {
    seasonal: number;
    peakTime: number;
    capacity: number;
    specialEvent: number;
    total: number;
  };
}
