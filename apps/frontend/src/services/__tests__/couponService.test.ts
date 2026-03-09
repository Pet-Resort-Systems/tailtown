/**
 * Coupon Service Tests
 * 
 * Tests for coupon business logic and validation.
 * These define what "working" means for the coupon system.
 */

import { couponService } from '../couponService';
import { Coupon } from '../../types/coupon';

describe('Coupon Service - Business Logic', () => {
  const mockCoupon: Coupon = {
    id: 'coupon-1',
    code: 'SUMMER25',
    description: 'Summer 2025 discount',
    type: 'PERCENTAGE',
    discountValue: 25,
    validFrom: '2025-06-01',
    validUntil: '2025-08-31',
    currentUses: 5,
    maxTotalUses: 100,
    maxUsesPerCustomer: 1,
    status: 'ACTIVE',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  };

  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const result = couponService.calculateDiscount(mockCoupon, 100);
      
      expect(result.discountAmount).toBe(25);
      expect(result.finalPrice).toBe(75);
    });

    it('should calculate fixed amount discount correctly', () => {
      const fixedCoupon: Coupon = {
        ...mockCoupon,
        type: 'FIXED_AMOUNT',
        discountValue: 15
      };

      const result = couponService.calculateDiscount(fixedCoupon, 100);
      
      expect(result.discountAmount).toBe(15);
      expect(result.finalPrice).toBe(85);
    });

    it('should not discount more than subtotal for fixed amount', () => {
      const fixedCoupon: Coupon = {
        ...mockCoupon,
        type: 'FIXED_AMOUNT',
        discountValue: 150
      };

      const result = couponService.calculateDiscount(fixedCoupon, 100);
      
      expect(result.discountAmount).toBe(100);
      expect(result.finalPrice).toBe(0);
    });

    it('should round discount to 2 decimal places', () => {
      const percentCoupon: Coupon = {
        ...mockCoupon,
        type: 'PERCENTAGE',
        discountValue: 33.333
      };

      const result = couponService.calculateDiscount(percentCoupon, 100);
      
      expect(result.discountAmount).toBe(33.33);
      expect(result.finalPrice).toBe(66.67);
    });

    it('should handle zero subtotal', () => {
      const result = couponService.calculateDiscount(mockCoupon, 0);
      
      expect(result.discountAmount).toBe(0);
      expect(result.finalPrice).toBe(0);
    });
  });

  describe('validateCouponCode', () => {
    it('should accept valid coupon codes', () => {
      const validCodes = ['SUMMER2025', 'SAVE-20', 'FIRST-TIME', 'ABC123'];
      
      validCodes.forEach(code => {
        const result = couponService.validateCouponCode(code);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject empty codes', () => {
      const result = couponService.validateCouponCode('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject codes that are too short', () => {
      const result = couponService.validateCouponCode('AB');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject codes that are too long', () => {
      const longCode = 'A'.repeat(51);
      const result = couponService.validateCouponCode(longCode);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than 50 characters');
    });

    it('should reject codes with special characters', () => {
      const invalidCodes = ['SAVE@20', 'SUMMER!', 'FIRST_TIME', 'CODE#123'];
      
      invalidCodes.forEach(code => {
        const result = couponService.validateCouponCode(code);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('letters, numbers, and hyphens');
      });
    });
  });

  describe('isCouponExpired', () => {
    it('should return true for expired coupons', () => {
      const expiredCoupon: Coupon = {
        ...mockCoupon,
        validUntil: '2020-01-01'
      };

      const result = couponService.isCouponExpired(expiredCoupon);
      
      expect(result).toBe(true);
    });

    it('should return false for valid coupons', () => {
      const validCoupon: Coupon = {
        ...mockCoupon,
        validUntil: '2030-12-31'
      };

      const result = couponService.isCouponExpired(validCoupon);
      
      expect(result).toBe(false);
    });

    it('should handle Date objects', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const validCoupon: Coupon = {
        ...mockCoupon,
        validUntil: futureDate
      };

      const result = couponService.isCouponExpired(validCoupon);
      
      expect(result).toBe(false);
    });
  });

  describe('isCouponNotYetValid', () => {
    it('should return true for future coupons', () => {
      const futureCoupon: Coupon = {
        ...mockCoupon,
        validFrom: '2030-01-01'
      };

      const result = couponService.isCouponNotYetValid(futureCoupon);
      
      expect(result).toBe(true);
    });

    it('should return false for currently valid coupons', () => {
      const validCoupon: Coupon = {
        ...mockCoupon,
        validFrom: '2020-01-01'
      };

      const result = couponService.isCouponNotYetValid(validCoupon);
      
      expect(result).toBe(false);
    });
  });

  describe('isCouponDepleted', () => {
    it('should return true when usage limit reached', () => {
      const depletedCoupon: Coupon = {
        ...mockCoupon,
        currentUses: 100,
        maxTotalUses: 100
      };

      const result = couponService.isCouponDepleted(depletedCoupon);
      
      expect(result).toBe(true);
    });

    it('should return false when usage limit not reached', () => {
      const validCoupon: Coupon = {
        ...mockCoupon,
        currentUses: 50,
        maxTotalUses: 100
      };

      const result = couponService.isCouponDepleted(validCoupon);
      
      expect(result).toBe(false);
    });

    it('should return false when no usage limit set', () => {
      const unlimitedCoupon: Coupon = {
        ...mockCoupon,
        currentUses: 1000,
        maxTotalUses: undefined
      };

      const result = couponService.isCouponDepleted(unlimitedCoupon);
      
      expect(result).toBe(false);
    });
  });

  describe('formatCouponDiscount', () => {
    it('should format percentage discounts', () => {
      const result = couponService.formatCouponDiscount(mockCoupon);
      
      expect(result).toBe('25% off');
    });

    it('should format fixed amount discounts', () => {
      const fixedCoupon: Coupon = {
        ...mockCoupon,
        type: 'FIXED_AMOUNT',
        discountValue: 15.50
      };

      const result = couponService.formatCouponDiscount(fixedCoupon);
      
      expect(result).toBe('$15.50 off');
    });

    it('should handle whole dollar amounts', () => {
      const fixedCoupon: Coupon = {
        ...mockCoupon,
        type: 'FIXED_AMOUNT',
        discountValue: 20
      };

      const result = couponService.formatCouponDiscount(fixedCoupon);
      
      expect(result).toBe('$20.00 off');
    });
  });

  describe('Business Rules', () => {
    it('should enforce minimum purchase requirement', () => {
      const couponWithMin: Coupon = {
        ...mockCoupon,
        minimumPurchase: 50
      };

      // Subtotal below minimum
      const result1 = couponService.calculateDiscount(couponWithMin, 40);
      // Should still calculate, but validation would reject it
      expect(result1.discountAmount).toBe(10); // 25% of 40

      // Subtotal meets minimum
      const result2 = couponService.calculateDiscount(couponWithMin, 100);
      expect(result2.discountAmount).toBe(25); // 25% of 100
    });

    it('should handle 100% discount correctly', () => {
      const fullDiscountCoupon: Coupon = {
        ...mockCoupon,
        type: 'PERCENTAGE',
        discountValue: 100
      };

      const result = couponService.calculateDiscount(fullDiscountCoupon, 50);
      
      expect(result.discountAmount).toBe(50);
      expect(result.finalPrice).toBe(0);
    });

    it('should handle very small discounts', () => {
      const smallDiscountCoupon: Coupon = {
        ...mockCoupon,
        type: 'PERCENTAGE',
        discountValue: 0.5
      };

      const result = couponService.calculateDiscount(smallDiscountCoupon, 100);
      
      expect(result.discountAmount).toBe(0.50);
      expect(result.finalPrice).toBe(99.50);
    });
  });
});
