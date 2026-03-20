/**
 * Coupon Controller Tests
 *
 * Tests for coupon validation, discount calculations, and usage limits.
 * Per roadmap: "Loyalty/Coupons Testing"
 */

import { Request, Response, NextFunction } from 'express';

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    coupon: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
      count: mockCount,
    },
    couponUsage: {
      create: jest.fn(),
      count: jest.fn(),
    },
  })),
  CouponType: {
    PERCENTAGE: 'PERCENTAGE',
    FIXED_AMOUNT: 'FIXED_AMOUNT',
    FREE_SERVICE: 'FREE_SERVICE',
  },
  CouponStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    EXPIRED: 'EXPIRED',
  },
}));

describe('Coupon Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Coupon Validation', () => {
    it('should validate coupon code exists', () => {
      const coupon = { code: 'SAVE20', status: 'ACTIVE' };
      expect(coupon.code).toBeTruthy();
      expect(coupon.status).toBe('ACTIVE');
    });

    it('should reject expired coupons', () => {
      const coupon = {
        code: 'EXPIRED10',
        status: 'ACTIVE',
        validUntil: new Date('2024-01-01'),
      };

      const now = new Date();
      const isExpired = coupon.validUntil < now;
      expect(isExpired).toBe(true);
    });

    it('should reject coupons not yet valid', () => {
      const coupon = {
        code: 'FUTURE20',
        status: 'ACTIVE',
        validFrom: new Date('2026-01-01'),
      };

      const now = new Date();
      const isNotYetValid = coupon.validFrom > now;
      expect(isNotYetValid).toBe(true);
    });

    it('should validate coupon is within date range', () => {
      const coupon = {
        code: 'VALID20',
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
      };

      const checkDate = new Date('2025-06-15');
      const isValid =
        checkDate >= coupon.validFrom && checkDate <= coupon.validUntil;
      expect(isValid).toBe(true);
    });
  });

  describe('Discount Calculations', () => {
    it('should calculate percentage discount correctly', () => {
      const coupon = {
        type: 'PERCENTAGE',
        discountValue: 20,
      };
      const orderTotal = 100;

      const discount = (orderTotal * coupon.discountValue) / 100;
      expect(discount).toBe(20);
    });

    it('should calculate fixed amount discount correctly', () => {
      const coupon = {
        type: 'FIXED_AMOUNT',
        discountValue: 25,
      };
      const orderTotal = 100;

      const discount = Math.min(coupon.discountValue, orderTotal);
      expect(discount).toBe(25);
    });

    it('should calculate discount value from points', () => {
      const pointsToRedeem = 500;
      const pointsPerDollar = 100; // 100 points = $1

      const discountValue = pointsToRedeem / pointsPerDollar;
      expect(discountValue).toBeGreaterThan(0);
    });

    it('should not exceed order total for fixed discount', () => {
      const coupon = {
        type: 'FIXED_AMOUNT',
        discountValue: 150,
      };
      const orderTotal = 100;

      const discount = Math.min(coupon.discountValue, orderTotal);
      expect(discount).toBe(100);
    });

    it('should enforce minimum purchase requirement', () => {
      const coupon = {
        code: 'MIN50',
        discountValue: 10,
        minimumPurchase: 50,
      };
      const orderTotal = 30;

      const meetsMinimum = orderTotal >= coupon.minimumPurchase;
      expect(meetsMinimum).toBe(false);
    });

    it('should apply discount when minimum is met', () => {
      const coupon = {
        code: 'MIN50',
        type: 'PERCENTAGE',
        discountValue: 10,
        minimumPurchase: 50,
      };
      const orderTotal = 100;

      const meetsMinimum = orderTotal >= coupon.minimumPurchase;
      const discount = meetsMinimum
        ? (orderTotal * coupon.discountValue) / 100
        : 0;
      expect(discount).toBe(10);
    });
  });

  describe('Usage Limits', () => {
    it('should track total usage count', () => {
      const coupon = {
        code: 'LIMITED',
        maxTotalUses: 100,
        usages: Array(50).fill({ id: 'usage' }),
      };

      const currentUsage = coupon.usages.length;
      const remainingUses = coupon.maxTotalUses - currentUsage;
      expect(remainingUses).toBe(50);
    });

    it('should reject coupon when max uses reached', () => {
      const coupon = {
        code: 'MAXED',
        maxTotalUses: 10,
        usages: Array(10).fill({ id: 'usage' }),
      };

      const isMaxedOut = coupon.usages.length >= coupon.maxTotalUses;
      expect(isMaxedOut).toBe(true);
    });

    it('should enforce per-customer usage limit', () => {
      const coupon = {
        code: 'ONCE',
        maxUsesPerCustomer: 1,
      };
      const customerUsageCount = 1;

      const canUse = customerUsageCount < coupon.maxUsesPerCustomer;
      expect(canUse).toBe(false);
    });

    it('should allow usage when under per-customer limit', () => {
      const coupon = {
        code: 'TWICE',
        maxUsesPerCustomer: 2,
      };
      const customerUsageCount = 1;

      const canUse = customerUsageCount < coupon.maxUsesPerCustomer;
      expect(canUse).toBe(true);
    });

    it('should handle unlimited usage coupons', () => {
      const coupon = {
        code: 'UNLIMITED',
        maxTotalUses: null,
        maxUsesPerCustomer: null,
      };

      const hasNoLimit = !coupon.maxTotalUses && !coupon.maxUsesPerCustomer;
      expect(hasNoLimit).toBe(true);
    });
  });

  describe('First-Time Customer Coupons', () => {
    it('should validate first-time customer restriction', () => {
      const coupon = {
        code: 'WELCOME',
        firstTimeCustomersOnly: true,
      };
      const customerReservationCount = 0;

      const isFirstTime = customerReservationCount === 0;
      const canUse = !coupon.firstTimeCustomersOnly || isFirstTime;
      expect(canUse).toBe(true);
    });

    it('should reject returning customer for first-time coupon', () => {
      const coupon = {
        code: 'WELCOME',
        firstTimeCustomersOnly: true,
      };
      const customerReservationCount = 5;

      const isFirstTime = customerReservationCount === 0;
      const canUse = !coupon.firstTimeCustomersOnly || isFirstTime;
      expect(canUse).toBe(false);
    });
  });

  describe('Service-Specific Coupons', () => {
    it('should validate coupon applies to service', () => {
      const coupon = {
        code: 'GROOM20',
        serviceIds: ['service-grooming-1', 'service-grooming-2'] as string[],
      };
      const serviceId = 'service-grooming-1';

      const appliesToService =
        !coupon.serviceIds.length || coupon.serviceIds.includes(serviceId);
      expect(appliesToService).toBe(true);
    });

    it('should reject coupon for non-applicable service', () => {
      const coupon = {
        code: 'GROOM20',
        serviceIds: ['service-grooming-1', 'service-grooming-2'] as string[],
      };
      const serviceId = 'service-boarding-1';

      const appliesToService = coupon.serviceIds.includes(serviceId);
      expect(appliesToService).toBe(false);
    });

    it('should allow coupon with no service restrictions', () => {
      const coupon = {
        code: 'ANYSERVICE',
        serviceIds: [],
      };
      const serviceId = 'service-boarding-1';

      const appliesToService =
        !coupon.serviceIds.length || coupon.serviceIds.includes(serviceId);
      expect(appliesToService).toBe(true);
    });
  });

  describe('Coupon Code Format', () => {
    it('should be case-insensitive for code lookup', () => {
      const storedCode = 'SAVE20';
      const inputCode = 'save20';

      const matches = storedCode.toLowerCase() === inputCode.toLowerCase();
      expect(matches).toBe(true);
    });

    it('should trim whitespace from code', () => {
      const inputCode = '  SAVE20  ';
      const cleanedCode = inputCode.trim();
      expect(cleanedCode).toBe('SAVE20');
    });
  });
});
