/**
 * Coupon Service
 *
 * Handles all coupon-related API calls and business logic:
 * - CRUD operations
 * - Coupon validation
 * - Discount calculation
 * - Usage tracking
 * - Bulk generation
 */

import { customerApi } from './api';
import {
  Coupon,
  CouponUsage,
  CouponValidationResult,
  ApplyCouponRequest,
  CreateCouponRequest,
  BulkCouponRequest,
  CouponStats,
} from '../types/coupon';

export const couponService = {
  /**
   * Get all coupons with optional filtering
   */
  getAllCoupons: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Coupon[]; totalPages: number; currentPage: number }> => {
    const response = await customerApi.get('/api/coupons', { params });
    // API returns { status, results, totalPages, currentPage, data }
    // We need to return { data, totalPages, currentPage }
    return {
      data: response.data.data || [],
      totalPages: response.data.totalPages || 1,
      currentPage: response.data.currentPage || 1,
    };
  },

  /**
   * Get a single coupon by ID
   */
  getCouponById: async (id: string): Promise<Coupon> => {
    const response = await customerApi.get(`/api/coupons/${id}`);
    return response.data;
  },

  /**
   * Get a coupon by code (for customer use)
   */
  getCouponByCode: async (code: string): Promise<Coupon> => {
    const response = await customerApi.get(`/api/coupons/code/${code}`);
    // API returns { status, data: coupon }
    return response.data.data || response.data;
  },

  /**
   * Create a new coupon
   */
  createCoupon: async (couponData: CreateCouponRequest): Promise<Coupon> => {
    const response = await customerApi.post('/api/coupons', couponData);
    return response.data;
  },

  /**
   * Update an existing coupon
   */
  updateCoupon: async (
    id: string,
    updates: Partial<Coupon>
  ): Promise<Coupon> => {
    const response = await customerApi.put(`/api/coupons/${id}`, updates);
    return response.data;
  },

  /**
   * Delete a coupon (soft delete - sets to INACTIVE)
   */
  deleteCoupon: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/coupons/${id}`);
  },

  /**
   * Validate a coupon and calculate discount
   *
   * Business Logic:
   * 1. Check if coupon exists and is active
   * 2. Check date validity
   * 3. Check usage limits
   * 4. Check minimum purchase requirement
   * 5. Check service restrictions
   * 6. Check first-time customer restriction
   * 7. Calculate discount amount
   */
  validateCoupon: async (
    request: ApplyCouponRequest
  ): Promise<CouponValidationResult> => {
    try {
      const response = await customerApi.post('/api/coupons/validate', request);
      return response.data;
    } catch (error: any) {
      return {
        isValid: false,
        error: error.response?.data?.message || 'Invalid coupon code',
      };
    }
  },

  /**
   * Apply a coupon to a reservation
   * Records the usage and returns the discount amount
   */
  applyCoupon: async (
    couponCode: string,
    customerId: string,
    reservationId: string,
    subtotal: number
  ): Promise<CouponUsage> => {
    const response = await customerApi.post('/api/coupons/apply', {
      code: couponCode,
      customerId,
      reservationId,
      subtotal,
    });
    return response.data;
  },

  /**
   * Get coupon usage history
   */
  getCouponUsage: async (couponId: string): Promise<CouponUsage[]> => {
    const response = await customerApi.get(`/api/coupons/${couponId}/usage`);
    return response.data;
  },

  /**
   * Get customer's coupon usage history
   */
  getCustomerCouponUsage: async (
    customerId: string
  ): Promise<CouponUsage[]> => {
    const response = await customerApi.get(
      `/api/customers/${customerId}/coupons`
    );
    return response.data;
  },

  /**
   * Generate bulk coupons
   * Creates multiple unique coupon codes with the same settings
   */
  generateBulkCoupons: async (
    request: BulkCouponRequest
  ): Promise<Coupon[]> => {
    const response = await customerApi.post('/api/coupons/bulk', request);
    return response.data;
  },

  /**
   * Get coupon statistics
   */
  getCouponStats: async (): Promise<CouponStats> => {
    const response = await customerApi.get('/api/coupons/stats');
    return response.data;
  },

  /**
   * Check if customer is eligible for first-time customer coupons
   */
  checkFirstTimeCustomer: async (customerId: string): Promise<boolean> => {
    const response = await customerApi.get(
      `/api/customers/${customerId}/first-time`
    );
    return response.data.isFirstTime;
  },

  /**
   * Generate a referral coupon for a customer
   */
  generateReferralCoupon: async (
    customerId: string,
    discountValue: number
  ): Promise<Coupon> => {
    const response = await customerApi.post('/api/coupons/referral', {
      customerId,
      discountValue,
    });
    return response.data;
  },

  /**
   * CLIENT-SIDE: Calculate discount amount
   * Used for preview before applying coupon
   */
  calculateDiscount: (
    coupon: Coupon,
    subtotal: number
  ): { discountAmount: number; finalPrice: number } => {
    let discountAmount = 0;

    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalPrice = Math.max(0, subtotal - discountAmount);

    return {
      discountAmount,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  },

  /**
   * CLIENT-SIDE: Validate coupon code format
   */
  validateCouponCode: (code: string): { isValid: boolean; error?: string } => {
    if (!code || code.trim().length === 0) {
      return { isValid: false, error: 'Coupon code is required' };
    }

    if (code.length < 3) {
      return {
        isValid: false,
        error: 'Coupon code must be at least 3 characters',
      };
    }

    if (code.length > 50) {
      return {
        isValid: false,
        error: 'Coupon code must be less than 50 characters',
      };
    }

    // Only allow alphanumeric and hyphens
    if (!/^[A-Z0-9-]+$/i.test(code)) {
      return {
        isValid: false,
        error: 'Coupon code can only contain letters, numbers, and hyphens',
      };
    }

    return { isValid: true };
  },

  /**
   * CLIENT-SIDE: Check if coupon is expired
   */
  isCouponExpired: (coupon: Coupon): boolean => {
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    return now > validUntil;
  },

  /**
   * CLIENT-SIDE: Check if coupon is not yet valid
   */
  isCouponNotYetValid: (coupon: Coupon): boolean => {
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    return now < validFrom;
  },

  /**
   * CLIENT-SIDE: Check if coupon has reached usage limit
   */
  isCouponDepleted: (coupon: Coupon): boolean => {
    if (!coupon.maxTotalUses) return false;
    return coupon.currentUses >= coupon.maxTotalUses;
  },

  /**
   * CLIENT-SIDE: Format coupon discount for display
   */
  formatCouponDiscount: (coupon: Coupon): string => {
    if (coupon.type === 'PERCENTAGE') {
      return `${coupon.discountValue}% off`;
    } else {
      return `$${coupon.discountValue.toFixed(2)} off`;
    }
  },

  /**
   * Get customer's permanent coupon for checkout auto-apply
   */
  getCustomerPermanentCoupon: async (
    customerId: string
  ): Promise<Coupon | null> => {
    const response = await customerApi.get(
      `/api/coupons/customer/${customerId}/permanent`
    );
    return response.data?.data || null;
  },
};
