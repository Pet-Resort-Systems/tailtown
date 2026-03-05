/**
 * Loyalty Service Tests
 */

import { loyaltyService } from '../loyaltyService';
import {
  LoyaltyTier,
  PointEarningRule,
  RedemptionOption,
  DEFAULT_TIERS
} from '../../types/loyalty';

describe('Loyalty Service', () => {
  describe('calculatePointsForPurchase', () => {
    it('should calculate points for purchase amount', () => {
      expect(loyaltyService.calculatePointsForPurchase(100, 1, 1)).toBe(100);
      expect(loyaltyService.calculatePointsForPurchase(50, 2, 1)).toBe(100);
      expect(loyaltyService.calculatePointsForPurchase(75.50, 1, 1)).toBe(75);
    });

    it('should apply tier multiplier', () => {
      expect(loyaltyService.calculatePointsForPurchase(100, 1, 1.5)).toBe(150);
      expect(loyaltyService.calculatePointsForPurchase(100, 1, 2.0)).toBe(200);
    });

    it('should round down to whole points', () => {
      expect(loyaltyService.calculatePointsForPurchase(99.99, 1, 1)).toBe(99);
      expect(loyaltyService.calculatePointsForPurchase(50.75, 1, 1.5)).toBe(76);
    });
  });

  describe('calculateTier', () => {
    const tiers: LoyaltyTier[] = DEFAULT_TIERS;

    it('should return Bronze for 0-999 points', () => {
      expect(loyaltyService.calculateTier(0, tiers).level).toBe('BRONZE');
      expect(loyaltyService.calculateTier(500, tiers).level).toBe('BRONZE');
      expect(loyaltyService.calculateTier(999, tiers).level).toBe('BRONZE');
    });

    it('should return Silver for 1000-2499 points', () => {
      expect(loyaltyService.calculateTier(1000, tiers).level).toBe('SILVER');
      expect(loyaltyService.calculateTier(1500, tiers).level).toBe('SILVER');
      expect(loyaltyService.calculateTier(2499, tiers).level).toBe('SILVER');
    });

    it('should return Gold for 2500-4999 points', () => {
      expect(loyaltyService.calculateTier(2500, tiers).level).toBe('GOLD');
      expect(loyaltyService.calculateTier(3000, tiers).level).toBe('GOLD');
      expect(loyaltyService.calculateTier(4999, tiers).level).toBe('GOLD');
    });

    it('should return Platinum for 5000-9999 points', () => {
      expect(loyaltyService.calculateTier(5000, tiers).level).toBe('PLATINUM');
      expect(loyaltyService.calculateTier(7500, tiers).level).toBe('PLATINUM');
      expect(loyaltyService.calculateTier(9999, tiers).level).toBe('PLATINUM');
    });

    it('should return Diamond for 10000+ points', () => {
      expect(loyaltyService.calculateTier(10000, tiers).level).toBe('DIAMOND');
      expect(loyaltyService.calculateTier(15000, tiers).level).toBe('DIAMOND');
      expect(loyaltyService.calculateTier(100000, tiers).level).toBe('DIAMOND');
    });
  });

  describe('calculatePointsToNextTier', () => {
    const tiers: LoyaltyTier[] = DEFAULT_TIERS;

    it('should calculate points needed for next tier', () => {
      expect(loyaltyService.calculatePointsToNextTier(0, tiers)).toBe(1000); // Bronze to Silver
      expect(loyaltyService.calculatePointsToNextTier(500, tiers)).toBe(500); // Bronze to Silver
      expect(loyaltyService.calculatePointsToNextTier(1000, tiers)).toBe(1500); // Silver to Gold
      expect(loyaltyService.calculatePointsToNextTier(2500, tiers)).toBe(2500); // Gold to Platinum
    });

    it('should return 0 for max tier', () => {
      expect(loyaltyService.calculatePointsToNextTier(10000, tiers)).toBe(0);
      expect(loyaltyService.calculatePointsToNextTier(50000, tiers)).toBe(0);
    });
  });

  describe('formatPoints', () => {
    it('should format points with commas', () => {
      expect(loyaltyService.formatPoints(100)).toBe('100');
      expect(loyaltyService.formatPoints(1000)).toBe('1,000');
      expect(loyaltyService.formatPoints(10000)).toBe('10,000');
      expect(loyaltyService.formatPoints(1000000)).toBe('1,000,000');
    });
  });

  describe('getTierColor', () => {
    it('should return correct color for each tier', () => {
      expect(loyaltyService.getTierColor('BRONZE')).toBe('#CD7F32');
      expect(loyaltyService.getTierColor('SILVER')).toBe('#C0C0C0');
      expect(loyaltyService.getTierColor('GOLD')).toBe('#FFD700');
      expect(loyaltyService.getTierColor('PLATINUM')).toBe('#E5E4E2');
      expect(loyaltyService.getTierColor('DIAMOND')).toBe('#B9F2FF');
    });
  });

  describe('getTierDisplayName', () => {
    it('should return correct display name for each tier', () => {
      expect(loyaltyService.getTierDisplayName('BRONZE')).toBe('Bronze');
      expect(loyaltyService.getTierDisplayName('SILVER')).toBe('Silver');
      expect(loyaltyService.getTierDisplayName('GOLD')).toBe('Gold');
      expect(loyaltyService.getTierDisplayName('PLATINUM')).toBe('Platinum');
      expect(loyaltyService.getTierDisplayName('DIAMOND')).toBe('Diamond');
    });
  });

  describe('canRedeem', () => {
    it('should return true if customer has enough points', () => {
      expect(loyaltyService.canRedeem(1000, 500, 100)).toBe(true);
      expect(loyaltyService.canRedeem(500, 500, 100)).toBe(true);
    });

    it('should return false if customer does not have enough points', () => {
      expect(loyaltyService.canRedeem(400, 500, 100)).toBe(false);
      expect(loyaltyService.canRedeem(50, 500, 100)).toBe(false);
    });

    it('should respect minimum points threshold', () => {
      expect(loyaltyService.canRedeem(150, 100, 200)).toBe(false);
      expect(loyaltyService.canRedeem(200, 100, 200)).toBe(true);
    });
  });

  describe('calculateRedemptionValue', () => {
    it('should calculate fixed discount value', () => {
      const option: RedemptionOption = {
        id: '1',
        type: 'DISCOUNT_FIXED',
        name: '$10 Off',
        description: 'Get $10 off',
        pointsCost: 1000,
        discountAmount: 10,
        isActive: true
      };

      expect(loyaltyService.calculateRedemptionValue(option)).toBe(10);
    });

    it('should calculate percentage discount value', () => {
      const option: RedemptionOption = {
        id: '1',
        type: 'DISCOUNT_PERCENTAGE',
        name: '10% Off',
        description: 'Get 10% off',
        pointsCost: 750,
        discountPercentage: 10,
        isActive: true
      };

      expect(loyaltyService.calculateRedemptionValue(option, 100)).toBe(10);
      expect(loyaltyService.calculateRedemptionValue(option, 50)).toBe(5);
    });

    it('should return 0 for percentage discount without purchase amount', () => {
      const option: RedemptionOption = {
        id: '1',
        type: 'DISCOUNT_PERCENTAGE',
        name: '10% Off',
        description: 'Get 10% off',
        pointsCost: 750,
        discountPercentage: 10,
        isActive: true
      };

      expect(loyaltyService.calculateRedemptionValue(option)).toBe(0);
    });

    it('should return 0 for non-discount redemptions', () => {
      const option: RedemptionOption = {
        id: '1',
        type: 'FREE_SERVICE',
        name: 'Free Grooming',
        description: 'Get free grooming',
        pointsCost: 2000,
        isActive: true
      };

      expect(loyaltyService.calculateRedemptionValue(option)).toBe(0);
    });
  });

  describe('validateEarningRule', () => {
    it('should validate DOLLARS_SPENT rule', () => {
      const validRule: Partial<PointEarningRule> = {
        type: 'DOLLARS_SPENT',
        pointsPerDollar: 1,
        isActive: true
      };

      const result = loyaltyService.validateEarningRule(validRule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require pointsPerDollar for DOLLARS_SPENT', () => {
      const invalidRule: Partial<PointEarningRule> = {
        type: 'DOLLARS_SPENT',
        isActive: true
      };

      const result = loyaltyService.validateEarningRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Points per dollar is required');
    });

    it('should validate VISIT rule', () => {
      const validRule: Partial<PointEarningRule> = {
        type: 'VISIT',
        pointsPerVisit: 10,
        isActive: true
      };

      const result = loyaltyService.validateEarningRule(validRule);
      expect(result.isValid).toBe(true);
    });

    it('should require pointsPerVisit for VISIT', () => {
      const invalidRule: Partial<PointEarningRule> = {
        type: 'VISIT',
        isActive: true
      };

      const result = loyaltyService.validateEarningRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Points per visit is required');
    });

    it('should validate REFERRAL rule', () => {
      const validRule: Partial<PointEarningRule> = {
        type: 'REFERRAL',
        pointsForReferrer: 500,
        pointsForReferee: 100,
        isActive: true
      };

      const result = loyaltyService.validateEarningRule(validRule);
      expect(result.isValid).toBe(true);
    });

    it('should require both referral points', () => {
      const invalidRule: Partial<PointEarningRule> = {
        type: 'REFERRAL',
        pointsForReferrer: 500,
        isActive: true
      };

      const result = loyaltyService.validateEarningRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referral points are required');
    });
  });

  describe('validateRedemptionOption', () => {
    it('should validate complete redemption option', () => {
      const validOption: Partial<RedemptionOption> = {
        name: '$10 Off',
        description: 'Get $10 off',
        type: 'DISCOUNT_FIXED',
        pointsCost: 1000,
        discountAmount: 10,
        isActive: true
      };

      const result = loyaltyService.validateRedemptionOption(validOption);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require name', () => {
      const invalidOption: Partial<RedemptionOption> = {
        type: 'DISCOUNT_FIXED',
        pointsCost: 1000,
        discountAmount: 10
      };

      const result = loyaltyService.validateRedemptionOption(invalidOption);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should require points cost', () => {
      const invalidOption: Partial<RedemptionOption> = {
        name: '$10 Off',
        type: 'DISCOUNT_FIXED',
        discountAmount: 10
      };

      const result = loyaltyService.validateRedemptionOption(invalidOption);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Points cost must be greater than 0');
    });

    it('should require discount percentage for DISCOUNT_PERCENTAGE', () => {
      const invalidOption: Partial<RedemptionOption> = {
        name: '10% Off',
        type: 'DISCOUNT_PERCENTAGE',
        pointsCost: 750
      };

      const result = loyaltyService.validateRedemptionOption(invalidOption);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Discount percentage is required');
    });

    it('should require discount amount for DISCOUNT_FIXED', () => {
      const invalidOption: Partial<RedemptionOption> = {
        name: '$10 Off',
        type: 'DISCOUNT_FIXED',
        pointsCost: 1000
      };

      const result = loyaltyService.validateRedemptionOption(invalidOption);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Discount amount is required');
    });
  });
});
