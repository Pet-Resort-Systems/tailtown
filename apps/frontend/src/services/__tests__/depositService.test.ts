/**
 * Deposit Service Tests
 */

import { depositService } from '../depositService';
import {
  DepositRule,
  DepositRuleConditions
} from '../../types/deposit';

describe('Deposit Service', () => {
  describe('evaluateRuleConditions', () => {
    it('should match cost threshold conditions', () => {
      const conditions: DepositRuleConditions = {
        minCost: 500
      };

      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 600,
        startDate: '2025-12-01',
        endDate: '2025-12-05'
      })).toBe(true);

      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 400,
        startDate: '2025-12-01',
        endDate: '2025-12-05'
      })).toBe(false);
    });

    it('should match date range conditions', () => {
      const conditions: DepositRuleConditions = {
        dateRanges: [
          { startDate: '2025-12-20', endDate: '2026-01-05', name: 'Holiday' }
        ]
      };

      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 100,
        startDate: '2025-12-25',
        endDate: '2025-12-30'
      })).toBe(true);

      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 100,
        startDate: '2025-11-15',
        endDate: '2025-11-20'
      })).toBe(false);
    });

    it('should match day of week conditions', () => {
      const conditions: DepositRuleConditions = {
        daysOfWeek: [5, 6] // Friday, Saturday
      };

      // Friday
      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 100,
        startDate: '2025-10-31', // Friday
        endDate: '2025-11-02'
      })).toBe(true);

      // Monday
      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 100,
        startDate: '2025-11-03', // Monday
        endDate: '2025-11-05'
      })).toBe(false);
    });

    it('should match duration conditions', () => {
      const conditions: DepositRuleConditions = {
        minNights: 7
      };

      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 100,
        startDate: '2025-12-01',
        endDate: '2025-12-10' // 9 nights
      })).toBe(true);

      expect(depositService.evaluateRuleConditions(conditions, {
        totalCost: 100,
        startDate: '2025-12-01',
        endDate: '2025-12-05' // 4 nights
      })).toBe(false);
    });
  });

  describe('calculateDepositAmount', () => {
    it('should calculate percentage deposit', () => {
      expect(depositService.calculateDepositAmount(1000, 'PERCENTAGE', 50)).toBe(500);
      expect(depositService.calculateDepositAmount(750, 'PERCENTAGE', 25)).toBe(187.5);
    });

    it('should calculate fixed deposit', () => {
      expect(depositService.calculateDepositAmount(1000, 'FIXED', undefined, 100)).toBe(100);
      expect(depositService.calculateDepositAmount(50, 'FIXED', undefined, 100)).toBe(50); // Min of fixed and total
    });

    it('should calculate full payment', () => {
      expect(depositService.calculateDepositAmount(1000, 'FULL')).toBe(1000);
      expect(depositService.calculateDepositAmount(500, 'FULL')).toBe(500);
    });

    it('should return 0 for invalid inputs', () => {
      expect(depositService.calculateDepositAmount(1000, 'PERCENTAGE')).toBe(0);
      expect(depositService.calculateDepositAmount(1000, 'FIXED')).toBe(0);
    });
  });

  describe('calculateRefundAmount', () => {
    const refundTiers = [
      { daysBeforeStart: 14, refundPercentage: 100, description: '100% if 14+ days' },
      { daysBeforeStart: 7, refundPercentage: 50, description: '50% if 7-13 days' },
      { daysBeforeStart: 0, refundPercentage: 0, description: 'No refund if <7 days' }
    ];

    it('should return 0 for non-refundable', () => {
      expect(depositService.calculateRefundAmount(
        500,
        'NON_REFUNDABLE',
        undefined,
        '2025-12-01',
        '2025-11-20'
      )).toBe(0);
    });

    it('should return full amount for full refund', () => {
      expect(depositService.calculateRefundAmount(
        500,
        'FULL_REFUND',
        undefined,
        '2025-12-01',
        '2025-11-20'
      )).toBe(500);
    });

    it('should calculate tiered refund - 100%', () => {
      expect(depositService.calculateRefundAmount(
        500,
        'TIERED_REFUND',
        refundTiers,
        '2025-12-01',
        '2025-11-10' // 21 days before
      )).toBe(500);
    });

    it('should calculate tiered refund - 50%', () => {
      expect(depositService.calculateRefundAmount(
        500,
        'TIERED_REFUND',
        refundTiers,
        '2025-12-01',
        '2025-11-22' // 9 days before
      )).toBe(250);
    });

    it('should calculate tiered refund - 0%', () => {
      expect(depositService.calculateRefundAmount(
        500,
        'TIERED_REFUND',
        refundTiers,
        '2025-12-01',
        '2025-11-28' // 3 days before
      )).toBe(0);
    });
  });

  describe('formatDepositAmount', () => {
    it('should format full payment', () => {
      expect(depositService.formatDepositAmount(1000, 1000)).toBe('Full payment required');
    });

    it('should format partial payment with percentage', () => {
      expect(depositService.formatDepositAmount(500, 1000)).toBe('$500.00 (50%)');
      expect(depositService.formatDepositAmount(250, 1000)).toBe('$250.00 (25%)');
    });
  });

  describe('getRefundPolicyText', () => {
    it('should return correct text for each policy', () => {
      expect(depositService.getRefundPolicyText('FULL_REFUND')).toBe('Fully refundable');
      expect(depositService.getRefundPolicyText('PARTIAL_REFUND')).toBe('Partially refundable');
      expect(depositService.getRefundPolicyText('NON_REFUNDABLE')).toBe('Non-refundable');
      expect(depositService.getRefundPolicyText('TIERED_REFUND')).toBe('Refund based on cancellation timing');
    });
  });

  describe('isDepositOverdue', () => {
    it('should detect overdue deposits', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      expect(depositService.isDepositOverdue(yesterdayStr)).toBe(true);
    });

    it('should not mark future dates as overdue', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      expect(depositService.isDepositOverdue(tomorrowStr)).toBe(false);
    });
  });

  describe('validateRule', () => {
    it('should validate complete rule', () => {
      const validRule: Partial<DepositRule> = {
        name: 'Test Rule',
        type: 'COST_THRESHOLD',
        depositAmountType: 'PERCENTAGE',
        depositPercentage: 50,
        refundPolicy: 'FULL_REFUND',
        conditions: {}
      };

      const result = depositService.validateRule(validRule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require name', () => {
      const invalidRule: Partial<DepositRule> = {
        type: 'COST_THRESHOLD',
        depositAmountType: 'PERCENTAGE',
        depositPercentage: 50,
        refundPolicy: 'FULL_REFUND'
      };

      const result = depositService.validateRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should require deposit percentage for PERCENTAGE type', () => {
      const invalidRule: Partial<DepositRule> = {
        name: 'Test',
        type: 'COST_THRESHOLD',
        depositAmountType: 'PERCENTAGE',
        refundPolicy: 'FULL_REFUND'
      };

      const result = depositService.validateRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deposit percentage must be greater than 0');
    });

    it('should require deposit amount for FIXED type', () => {
      const invalidRule: Partial<DepositRule> = {
        name: 'Test',
        type: 'COST_THRESHOLD',
        depositAmountType: 'FIXED',
        refundPolicy: 'FULL_REFUND'
      };

      const result = depositService.validateRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deposit fixed amount must be greater than 0');
    });

    it('should require refund tiers for TIERED_REFUND', () => {
      const invalidRule: Partial<DepositRule> = {
        name: 'Test',
        type: 'COST_THRESHOLD',
        depositAmountType: 'PERCENTAGE',
        depositPercentage: 50,
        refundPolicy: 'TIERED_REFUND'
      };

      const result = depositService.validateRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Refund tiers are required for tiered refund policy');
    });
  });

  describe('calculateDueDate', () => {
    it('should calculate due date correctly', () => {
      const dueDate = depositService.calculateDueDate('2025-12-10', 3);
      expect(dueDate).toBe('2025-12-07');
    });

    it('should handle month boundaries', () => {
      const dueDate = depositService.calculateDueDate('2025-12-02', 5);
      expect(dueDate).toBe('2025-11-27');
    });
  });
});
