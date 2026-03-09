/**
 * Coupon System Types
 * 
 * Defines types for the coupon/discount system including:
 * - Percentage and fixed amount coupons
 * - Service-specific restrictions
 * - Date range restrictions
 * - Usage limits
 * - Minimum purchase requirements
 */

export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DEPLETED';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  
  // Discount value
  discountValue: number; // Percentage (0-100) or fixed amount in dollars
  
  // Restrictions
  minimumPurchase?: number; // Minimum purchase amount required
  serviceIds?: string[]; // If specified, only applies to these services
  firstTimeCustomersOnly?: boolean;
  
  // Date restrictions
  validFrom: Date | string;
  validUntil: Date | string;
  
  // Usage limits
  maxTotalUses?: number; // Total number of times coupon can be used
  maxUsesPerCustomer?: number; // Max uses per customer (default: 1)
  currentUses: number; // Current number of times used
  
  // Metadata
  status: CouponStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string; // Staff member who created it
  
  // Tracking
  isReferralCoupon?: boolean;
  referralCustomerId?: string; // If this is a referral coupon
  notes?: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  coupon?: Coupon;
  customerId: string;
  reservationId: string;
  discountAmount: number; // Actual dollar amount discounted
  usedAt: Date | string;
}

export interface CouponValidationResult {
  isValid: boolean;
  error?: string;
  discountAmount?: number;
  finalPrice?: number;
}

export interface ApplyCouponRequest {
  code: string;
  customerId: string;
  subtotal: number;
  serviceIds?: string[];
}

export interface CreateCouponRequest {
  code: string;
  description: string;
  type: CouponType;
  discountValue: number;
  minimumPurchase?: number;
  serviceIds?: string[];
  firstTimeCustomersOnly?: boolean;
  validFrom: Date | string;
  validUntil: Date | string;
  maxTotalUses?: number;
  maxUsesPerCustomer?: number;
  isReferralCoupon?: boolean;
  referralCustomerId?: string;
  notes?: string;
}

export interface BulkCouponRequest {
  prefix: string; // e.g., "SUMMER2025"
  count: number; // Number of coupons to generate
  type: CouponType;
  discountValue: number;
  description: string;
  validFrom: Date | string;
  validUntil: Date | string;
  maxUsesPerCustomer?: number;
  minimumPurchase?: number;
  serviceIds?: string[];
}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalRedemptions: number;
  totalDiscountAmount: number;
  averageDiscountAmount: number;
  topCoupons: Array<{
    code: string;
    uses: number;
    totalDiscount: number;
  }>;
}
