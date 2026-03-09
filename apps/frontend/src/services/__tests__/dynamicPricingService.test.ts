/**
 * Dynamic Pricing Service Tests
 * 
 * Tests for peak demand pricing business logic.
 * These define what "working" means for dynamic pricing.
 */

import { dynamicPricingService } from '../dynamicPricingService';
import { AnyPricingRule, PriceAdjustment, Holiday } from '../../types/dynamicPricing';

describe('Dynamic Pricing Service - Business Logic', () => {
  describe('getCurrentSeason', () => {
    it('should return SPRING for March-May', () => {
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-03-15'))).toBe('SPRING');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-04-15'))).toBe('SPRING');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-05-15'))).toBe('SPRING');
    });

    it('should return SUMMER for June-August', () => {
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-06-15'))).toBe('SUMMER');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-07-15'))).toBe('SUMMER');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-08-15'))).toBe('SUMMER');
    });

    it('should return FALL for September-November', () => {
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-09-15'))).toBe('FALL');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-10-15'))).toBe('FALL');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-11-15'))).toBe('FALL');
    });

    it('should return WINTER for December-February', () => {
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-12-15'))).toBe('WINTER');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-01-15'))).toBe('WINTER');
      expect(dynamicPricingService.getCurrentSeason(new Date('2025-02-15'))).toBe('WINTER');
    });
  });

  describe('getDayOfWeek', () => {
    it('should return correct day of week for string dates (timezone-safe)', () => {
      // Using string dates which are now timezone-safe
      expect(dynamicPricingService.getDayOfWeek('2025-10-27')).toBe('MONDAY');
      expect(dynamicPricingService.getDayOfWeek('2025-10-28')).toBe('TUESDAY');
      expect(dynamicPricingService.getDayOfWeek('2025-11-01')).toBe('SATURDAY');
      expect(dynamicPricingService.getDayOfWeek('2025-11-02')).toBe('SUNDAY');
    });

    it('should handle various days of the week', () => {
      expect(dynamicPricingService.getDayOfWeek('2025-11-03')).toBe('MONDAY');
      expect(dynamicPricingService.getDayOfWeek('2025-11-04')).toBe('TUESDAY');
      expect(dynamicPricingService.getDayOfWeek('2025-11-05')).toBe('WEDNESDAY');
      expect(dynamicPricingService.getDayOfWeek('2025-11-06')).toBe('THURSDAY');
      expect(dynamicPricingService.getDayOfWeek('2025-11-07')).toBe('FRIDAY');
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday and Sunday (timezone-safe)', () => {
      // Using string dates which are now timezone-safe
      expect(dynamicPricingService.isWeekend('2025-11-01')).toBe(true); // Saturday
      expect(dynamicPricingService.isWeekend('2025-11-02')).toBe(true); // Sunday
      expect(dynamicPricingService.isWeekend('2025-11-08')).toBe(true); // Saturday
      expect(dynamicPricingService.isWeekend('2025-11-09')).toBe(true); // Sunday
    });

    it('should return false for weekdays (timezone-safe)', () => {
      // Using string dates which are now timezone-safe
      expect(dynamicPricingService.isWeekend('2025-10-27')).toBe(false); // Monday
      expect(dynamicPricingService.isWeekend('2025-10-28')).toBe(false); // Tuesday
      expect(dynamicPricingService.isWeekend('2025-10-29')).toBe(false); // Wednesday
      expect(dynamicPricingService.isWeekend('2025-10-30')).toBe(false); // Thursday
      expect(dynamicPricingService.isWeekend('2025-10-31')).toBe(false); // Friday
    });
  });

  describe('isHoliday', () => {
    const holidays: Holiday[] = [
      { id: '1', name: 'Christmas', date: '2025-12-25', year: 2025, isRecurring: true, month: 12, day: 25 },
      { id: '2', name: 'New Year', date: '2025-01-01', year: 2025, isRecurring: true, month: 1, day: 1 }
    ];

    it('should return true for holiday dates', () => {
      expect(dynamicPricingService.isHoliday('2025-12-25', holidays)).toBe(true);
      expect(dynamicPricingService.isHoliday('2025-01-01', holidays)).toBe(true);
    });

    it('should return false for non-holiday dates', () => {
      expect(dynamicPricingService.isHoliday('2025-11-15', holidays)).toBe(false);
    });
  });

  describe('calculateDaysInAdvance', () => {
    it('should calculate days in advance correctly', () => {
      const days = dynamicPricingService.calculateDaysInAdvance('2025-11-15', '2025-11-01');
      expect(days).toBe(14);
    });

    it('should return 0 for same day', () => {
      const days = dynamicPricingService.calculateDaysInAdvance('2025-11-01', '2025-11-01');
      expect(days).toBe(0);
    });

    it('should return 0 for past dates', () => {
      const days = dynamicPricingService.calculateDaysInAdvance('2025-11-01', '2025-11-15');
      expect(days).toBe(0);
    });
  });

  describe('applyPercentageAdjustment', () => {
    it('should calculate percentage adjustment correctly', () => {
      expect(dynamicPricingService.applyPercentageAdjustment(100, 10)).toBe(10);
      expect(dynamicPricingService.applyPercentageAdjustment(100, -10)).toBe(-10);
      expect(dynamicPricingService.applyPercentageAdjustment(200, 25)).toBe(50);
    });

    it('should handle zero percentage', () => {
      expect(dynamicPricingService.applyPercentageAdjustment(100, 0)).toBe(0);
    });
  });

  describe('applyFixedAdjustment', () => {
    it('should return the fixed amount', () => {
      expect(dynamicPricingService.applyFixedAdjustment(100, 10)).toBe(10);
      expect(dynamicPricingService.applyFixedAdjustment(100, -10)).toBe(-10);
    });
  });

  describe('calculateTotalAdjustment', () => {
    const adjustments: PriceAdjustment[] = [
      {
        ruleId: '1',
        ruleName: 'Summer Surcharge',
        ruleType: 'SEASONAL',
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 20,
        calculatedAmount: 20,
        reason: 'Summer peak season'
      },
      {
        ruleId: '2',
        ruleName: 'Weekend Surcharge',
        ruleType: 'PEAK_TIME',
        adjustmentType: 'FIXED_AMOUNT',
        adjustmentValue: 10,
        calculatedAmount: 10,
        reason: 'Weekend booking'
      }
    ];

    it('should sum all adjustments', () => {
      const total = dynamicPricingService.calculateTotalAdjustment(adjustments);
      expect(total).toBe(30);
    });

    it('should handle empty adjustments', () => {
      const total = dynamicPricingService.calculateTotalAdjustment([]);
      expect(total).toBe(0);
    });

    it('should handle negative adjustments (discounts)', () => {
      const discountAdjustments: PriceAdjustment[] = [
        { ...adjustments[0], calculatedAmount: -10 },
        { ...adjustments[1], calculatedAmount: -5 }
      ];
      const total = dynamicPricingService.calculateTotalAdjustment(discountAdjustments);
      expect(total).toBe(-15);
    });
  });

  describe('calculateFinalPrice', () => {
    const adjustments: PriceAdjustment[] = [
      {
        ruleId: '1',
        ruleName: 'Test',
        ruleType: 'SEASONAL',
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10,
        calculatedAmount: 10,
        reason: 'Test'
      }
    ];

    it('should calculate final price correctly', () => {
      const finalPrice = dynamicPricingService.calculateFinalPrice(100, adjustments);
      expect(finalPrice).toBe(110);
    });

    it('should not go below zero', () => {
      const largeDiscount: PriceAdjustment[] = [
        { ...adjustments[0], calculatedAmount: -150 }
      ];
      const finalPrice = dynamicPricingService.calculateFinalPrice(100, largeDiscount);
      expect(finalPrice).toBe(0);
    });
  });

  describe('formatPriceChange', () => {
    it('should format price increase', () => {
      const formatted = dynamicPricingService.formatPriceChange(100, 120);
      expect(formatted).toBe('+20.0%');
    });

    it('should format price decrease', () => {
      const formatted = dynamicPricingService.formatPriceChange(100, 80);
      expect(formatted).toBe('-20.0%');
    });

    it('should handle no change', () => {
      const formatted = dynamicPricingService.formatPriceChange(100, 100);
      expect(formatted).toBe('+0.0%');
    });
  });

  describe('validatePricingRule', () => {
    it('should validate valid rule', () => {
      const rule: Partial<AnyPricingRule> = {
        name: 'Test Rule',
        type: 'SEASONAL',
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10,
        priority: 1
      };

      const result = dynamicPricingService.validatePricingRule(rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule without name', () => {
      const rule: Partial<AnyPricingRule> = {
        type: 'SEASONAL',
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10
      };

      const result = dynamicPricingService.validatePricingRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should reject rule without type', () => {
      const rule: Partial<AnyPricingRule> = {
        name: 'Test',
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10
      } as any;

      const result = dynamicPricingService.validatePricingRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rule type is required');
    });

    it('should reject invalid percentage', () => {
      const rule: Partial<AnyPricingRule> = {
        name: 'Test',
        type: 'SEASONAL',
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 150,
        priority: 1
      };

      const result = dynamicPricingService.validatePricingRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Percentage must be between -100 and 100');
    });
  });

  describe('sortRulesByPriority', () => {
    const rules: AnyPricingRule[] = [
      { id: '1', name: 'Low', priority: 1, type: 'SEASONAL' } as AnyPricingRule,
      { id: '2', name: 'High', priority: 10, type: 'PEAK_TIME' } as AnyPricingRule,
      { id: '3', name: 'Medium', priority: 5, type: 'CAPACITY_BASED' } as AnyPricingRule
    ];

    it('should sort rules by priority descending', () => {
      const sorted = dynamicPricingService.sortRulesByPriority(rules);
      expect(sorted[0].priority).toBe(10);
      expect(sorted[1].priority).toBe(5);
      expect(sorted[2].priority).toBe(1);
    });

    it('should not mutate original array', () => {
      const original = [...rules];
      dynamicPricingService.sortRulesByPriority(rules);
      expect(rules).toEqual(original);
    });
  });

  describe('filterActiveRules', () => {
    const rules: AnyPricingRule[] = [
      { id: '1', name: 'Active', isActive: true, type: 'SEASONAL' } as AnyPricingRule,
      { id: '2', name: 'Inactive', isActive: false, type: 'PEAK_TIME' } as AnyPricingRule,
      { id: '3', name: 'Active 2', isActive: true, type: 'CAPACITY_BASED' } as AnyPricingRule
    ];

    it('should filter only active rules', () => {
      const active = dynamicPricingService.filterActiveRules(rules);
      expect(active).toHaveLength(2);
      expect(active.every(r => r.isActive)).toBe(true);
    });
  });

  describe('getAdjustmentColor', () => {
    it('should return error for surcharges', () => {
      expect(dynamicPricingService.getAdjustmentColor(10)).toBe('error');
    });

    it('should return success for discounts', () => {
      expect(dynamicPricingService.getAdjustmentColor(-10)).toBe('success');
    });

    it('should return default for zero', () => {
      expect(dynamicPricingService.getAdjustmentColor(0)).toBe('default');
    });
  });

  describe('Business Rules', () => {
    it('should correctly identify peak season', () => {
      const summer = dynamicPricingService.getCurrentSeason(new Date('2025-07-04'));
      expect(summer).toBe('SUMMER');
    });

    it('should correctly identify weekends (timezone-safe)', () => {
      // Using string dates which are now timezone-safe
      expect(dynamicPricingService.isWeekend('2025-07-05')).toBe(true); // Saturday
      expect(dynamicPricingService.isWeekend('2025-07-06')).toBe(true); // Sunday
      expect(dynamicPricingService.isWeekend('2025-07-04')).toBe(false); // Friday
    });

    it('should calculate advance booking discount eligibility', () => {
      const days = dynamicPricingService.calculateDaysInAdvance('2025-12-25', '2025-11-01');
      expect(days).toBeGreaterThan(30); // Eligible for advance booking discount
    });

    it('should enforce minimum price of zero', () => {
      const adjustments: PriceAdjustment[] = [
        {
          ruleId: '1',
          ruleName: 'Huge Discount',
          ruleType: 'LAST_MINUTE',
          adjustmentType: 'FIXED_AMOUNT',
          adjustmentValue: -200,
          calculatedAmount: -200,
          reason: 'Fill capacity'
        }
      ];
      const finalPrice = dynamicPricingService.calculateFinalPrice(100, adjustments);
      expect(finalPrice).toBe(0);
      expect(finalPrice).toBeGreaterThanOrEqual(0);
    });
  });
});
