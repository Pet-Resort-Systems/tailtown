/**
 * Dynamic Pricing Service
 * 
 * Handles peak demand pricing including:
 * - Seasonal pricing
 * - Peak time surcharges
 * - Capacity-based pricing
 * - Special event pricing
 * - Automated adjustments
 */

import { customerApi } from './api';
import {
  AnyPricingRule,
  PriceCalculationRequest,
  PriceCalculationResult,
  PriceAdjustment,
  Holiday,
  PricingCalendar,
  PricingRuleStats,
  AutomatedPriceAdjustment,
  PricingInsights,
  Season,
  DayOfWeek
} from '../types/dynamicPricing';
import { getDayOfWeekName, isWeekend as isWeekendUtil } from '../utils/dateUtils';

export const dynamicPricingService = {
  /**
   * Get all pricing rules
   */
  getAllPricingRules: async (params?: {
    type?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: AnyPricingRule[]; totalPages: number; currentPage: number }> => {
    const response = await customerApi.get('/api/pricing/rules', { params });
    return response.data;
  },

  /**
   * Get a single pricing rule
   */
  getPricingRule: async (id: string): Promise<AnyPricingRule> => {
    const response = await customerApi.get(`/api/pricing/rules/${id}`);
    return response.data;
  },

  /**
   * Create a new pricing rule
   */
  createPricingRule: async (rule: Partial<AnyPricingRule>): Promise<AnyPricingRule> => {
    const response = await customerApi.post('/api/pricing/rules', rule);
    return response.data;
  },

  /**
   * Update a pricing rule
   */
  updatePricingRule: async (id: string, updates: Partial<AnyPricingRule>): Promise<AnyPricingRule> => {
    const response = await customerApi.put(`/api/pricing/rules/${id}`, updates);
    return response.data;
  },

  /**
   * Delete a pricing rule
   */
  deletePricingRule: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/pricing/rules/${id}`);
  },

  /**
   * Calculate price with all applicable rules
   */
  calculatePrice: async (request: PriceCalculationRequest): Promise<PriceCalculationResult> => {
    const response = await customerApi.post('/api/pricing/calculate', request);
    return response.data;
  },

  /**
   * Get pricing calendar for a month
   */
  getPricingCalendar: async (
    year: number,
    month: number,
    serviceId: string
  ): Promise<PricingCalendar> => {
    const response = await customerApi.get('/api/pricing/calendar', {
      params: { year, month, serviceId }
    });
    return response.data;
  },

  /**
   * Get holidays
   */
  getHolidays: async (year?: number): Promise<Holiday[]> => {
    const response = await customerApi.get('/api/pricing/holidays', {
      params: { year }
    });
    return response.data;
  },

  /**
   * Create/update holiday
   */
  saveHoliday: async (holiday: Partial<Holiday>): Promise<Holiday> => {
    if (holiday.id) {
      const response = await customerApi.put(`/api/pricing/holidays/${holiday.id}`, holiday);
      return response.data;
    } else {
      const response = await customerApi.post('/api/pricing/holidays', holiday);
      return response.data;
    }
  },

  /**
   * Delete holiday
   */
  deleteHoliday: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/pricing/holidays/${id}`);
  },

  /**
   * Get pricing rule statistics
   */
  getPricingRuleStats: async (ruleId?: string): Promise<PricingRuleStats[]> => {
    const response = await customerApi.get('/api/pricing/stats', {
      params: { ruleId }
    });
    return response.data;
  },

  /**
   * Get automated pricing adjustment settings
   */
  getAutomatedPricing: async (): Promise<AutomatedPriceAdjustment> => {
    const response = await customerApi.get('/api/pricing/automated');
    return response.data;
  },

  /**
   * Update automated pricing settings
   */
  updateAutomatedPricing: async (
    settings: Partial<AutomatedPriceAdjustment>
  ): Promise<AutomatedPriceAdjustment> => {
    const response = await customerApi.put('/api/pricing/automated', settings);
    return response.data;
  },

  /**
   * Get pricing insights
   */
  getPricingInsights: async (
    startDate: string,
    endDate: string,
    serviceId?: string
  ): Promise<PricingInsights> => {
    const response = await customerApi.get('/api/pricing/insights', {
      params: { startDate, endDate, serviceId }
    });
    return response.data;
  },

  /**
   * CLIENT-SIDE: Get current season
   */
  getCurrentSeason: (date: Date = new Date()): Season => {
    const month = date.getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 5) return 'SPRING';
    if (month >= 6 && month <= 8) return 'SUMMER';
    if (month >= 9 && month <= 11) return 'FALL';
    return 'WINTER';
  },

  /**
   * CLIENT-SIDE: Get day of week (timezone-safe)
   */
  getDayOfWeek: (date: Date | string): DayOfWeek => {
    return getDayOfWeekName(date) as DayOfWeek;
  },

  /**
   * CLIENT-SIDE: Check if date is weekend (timezone-safe)
   */
  isWeekend: (date: Date | string): boolean => {
    return isWeekendUtil(date);
  },

  /**
   * CLIENT-SIDE: Check if date is holiday
   */
  isHoliday: (date: Date | string, holidays: Holiday[]): boolean => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return holidays.some(h => h.date === dateStr);
  },

  /**
   * CLIENT-SIDE: Calculate days in advance
   */
  calculateDaysInAdvance: (checkInDate: string, bookingDate: string = new Date().toISOString()): number => {
    const checkIn = new Date(checkInDate);
    const booking = new Date(bookingDate);
    const diffTime = checkIn.getTime() - booking.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  },

  /**
   * CLIENT-SIDE: Format adjustment for display
   */
  formatAdjustment: (adjustment: PriceAdjustment): string => {
    const sign = adjustment.calculatedAmount >= 0 ? '+' : '';
    return `${sign}$${adjustment.calculatedAmount.toFixed(2)}`;
  },

  /**
   * CLIENT-SIDE: Get adjustment color
   */
  getAdjustmentColor: (amount: number): 'success' | 'error' | 'default' => {
    if (amount > 0) return 'error'; // Surcharge
    if (amount < 0) return 'success'; // Discount
    return 'default';
  },

  /**
   * CLIENT-SIDE: Calculate total adjustment
   */
  calculateTotalAdjustment: (adjustments: PriceAdjustment[]): number => {
    return adjustments.reduce((sum, adj) => sum + adj.calculatedAmount, 0);
  },

  /**
   * CLIENT-SIDE: Apply percentage adjustment
   */
  applyPercentageAdjustment: (basePrice: number, percentage: number): number => {
    return (basePrice * percentage) / 100;
  },

  /**
   * CLIENT-SIDE: Apply fixed adjustment
   */
  applyFixedAdjustment: (basePrice: number, amount: number): number => {
    return amount;
  },

  /**
   * CLIENT-SIDE: Calculate final price
   */
  calculateFinalPrice: (basePrice: number, adjustments: PriceAdjustment[]): number => {
    const totalAdjustment = dynamicPricingService.calculateTotalAdjustment(adjustments);
    return Math.max(0, basePrice + totalAdjustment);
  },

  /**
   * CLIENT-SIDE: Format price change
   */
  formatPriceChange: (oldPrice: number, newPrice: number): string => {
    const diff = newPrice - oldPrice;
    const percentage = ((diff / oldPrice) * 100).toFixed(1);
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${percentage}%`;
  },

  /**
   * CLIENT-SIDE: Get rule type label
   */
  getRuleTypeLabel: (type: string): string => {
    const labels: Record<string, string> = {
      SEASONAL: 'Seasonal',
      PEAK_TIME: 'Peak Time',
      CAPACITY_BASED: 'Capacity-Based',
      SPECIAL_EVENT: 'Special Event',
      DAY_OF_WEEK: 'Day of Week',
      ADVANCE_BOOKING: 'Advance Booking',
      LAST_MINUTE: 'Last Minute'
    };
    return labels[type] || type;
  },

  /**
   * CLIENT-SIDE: Get season label
   */
  getSeasonLabel: (season: Season): string => {
    const labels: Record<Season, string> = {
      SPRING: 'Spring',
      SUMMER: 'Summer',
      FALL: 'Fall',
      WINTER: 'Winter'
    };
    return labels[season];
  },

  /**
   * CLIENT-SIDE: Get season color
   */
  getSeasonColor: (season: Season): string => {
    const colors: Record<Season, string> = {
      SPRING: '#4caf50',
      SUMMER: '#ff9800',
      FALL: '#f57c00',
      WINTER: '#2196f3'
    };
    return colors[season];
  },

  /**
   * CLIENT-SIDE: Validate pricing rule
   */
  validatePricingRule: (rule: Partial<AnyPricingRule>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!rule.type) {
      errors.push('Rule type is required');
    }

    if (rule.adjustmentValue === undefined || rule.adjustmentValue === null) {
      errors.push('Adjustment value is required');
    }

    if (rule.adjustmentType === 'PERCENTAGE' && (rule.adjustmentValue! < -100 || rule.adjustmentValue! > 100)) {
      errors.push('Percentage must be between -100 and 100');
    }

    if (rule.priority !== undefined && rule.priority < 0) {
      errors.push('Priority must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * CLIENT-SIDE: Sort rules by priority
   */
  sortRulesByPriority: (rules: AnyPricingRule[]): AnyPricingRule[] => {
    return [...rules].sort((a, b) => b.priority - a.priority);
  },

  /**
   * CLIENT-SIDE: Filter active rules
   */
  filterActiveRules: (rules: AnyPricingRule[]): AnyPricingRule[] => {
    return rules.filter(rule => rule.isActive);
  },

  /**
   * CLIENT-SIDE: Check if rule applies to date
   */
  ruleAppliesToDate: (rule: AnyPricingRule, date: string): boolean => {
    if (rule.validFrom && date < rule.validFrom.toString().split('T')[0]) {
      return false;
    }
    if (rule.validUntil && date > rule.validUntil.toString().split('T')[0]) {
      return false;
    }
    return true;
  }
};
