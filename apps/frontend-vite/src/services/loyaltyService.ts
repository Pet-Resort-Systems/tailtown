/**
 * Loyalty Rewards Service
 * 
 * Multi-tenant configurable loyalty program service
 */

import { customerApi } from './api';
import {
  LoyaltyConfig,
  CustomerLoyalty,
  PointTransaction,
  PointRedemption,
  LoyaltyStats,
  LoyaltyActivity,
  PointEarningRule,
  RedemptionOption,
  LoyaltyTier,
  TierLevel
} from '../types/loyalty';

export const loyaltyService = {
  // ==================== Configuration Management ====================
  
  /**
   * Get loyalty program configuration for tenant
   */
  getConfig: async (): Promise<LoyaltyConfig> => {
    const response = await customerApi.get('/api/loyalty/config');
    return response.data;
  },

  /**
   * Update loyalty program configuration
   */
  updateConfig: async (config: Partial<LoyaltyConfig>): Promise<LoyaltyConfig> => {
    const response = await customerApi.put('/api/loyalty/config', config);
    return response.data;
  },

  /**
   * Enable/disable loyalty program
   */
  toggleProgram: async (enabled: boolean): Promise<LoyaltyConfig> => {
    const response = await customerApi.patch('/api/loyalty/config/toggle', { isEnabled: enabled });
    return response.data;
  },

  // ==================== Earning Rules Management ====================
  
  /**
   * Get all earning rules
   */
  getEarningRules: async (): Promise<PointEarningRule[]> => {
    const response = await customerApi.get('/api/loyalty/earning-rules');
    return response.data;
  },

  /**
   * Create earning rule
   */
  createEarningRule: async (rule: Partial<PointEarningRule>): Promise<PointEarningRule> => {
    const response = await customerApi.post('/api/loyalty/earning-rules', rule);
    return response.data;
  },

  /**
   * Update earning rule
   */
  updateEarningRule: async (id: string, updates: Partial<PointEarningRule>): Promise<PointEarningRule> => {
    const response = await customerApi.put(`/api/loyalty/earning-rules/${id}`, updates);
    return response.data;
  },

  /**
   * Delete earning rule
   */
  deleteEarningRule: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/loyalty/earning-rules/${id}`);
  },

  // ==================== Tier Management ====================
  
  /**
   * Get all tiers
   */
  getTiers: async (): Promise<LoyaltyTier[]> => {
    const response = await customerApi.get('/api/loyalty/tiers');
    return response.data;
  },

  /**
   * Update tier configuration
   */
  updateTier: async (level: TierLevel, updates: Partial<LoyaltyTier>): Promise<LoyaltyTier> => {
    const response = await customerApi.put(`/api/loyalty/tiers/${level}`, updates);
    return response.data;
  },

  // ==================== Redemption Options Management ====================
  
  /**
   * Get all redemption options
   */
  getRedemptionOptions: async (): Promise<RedemptionOption[]> => {
    const response = await customerApi.get('/api/loyalty/redemption-options');
    return response.data;
  },

  /**
   * Create redemption option
   */
  createRedemptionOption: async (option: Partial<RedemptionOption>): Promise<RedemptionOption> => {
    const response = await customerApi.post('/api/loyalty/redemption-options', option);
    return response.data;
  },

  /**
   * Update redemption option
   */
  updateRedemptionOption: async (id: string, updates: Partial<RedemptionOption>): Promise<RedemptionOption> => {
    const response = await customerApi.put(`/api/loyalty/redemption-options/${id}`, updates);
    return response.data;
  },

  /**
   * Delete redemption option
   */
  deleteRedemptionOption: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/loyalty/redemption-options/${id}`);
  },

  // ==================== Customer Loyalty ====================
  
  /**
   * Get customer loyalty account
   */
  getCustomerLoyalty: async (customerId: string): Promise<CustomerLoyalty> => {
    const response = await customerApi.get(`/api/loyalty/customers/${customerId}`);
    return response.data;
  },

  /**
   * Get all customer loyalty accounts
   */
  getAllCustomerLoyalty: async (params?: {
    tier?: TierLevel;
    minPoints?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: CustomerLoyalty[]; totalPages: number; currentPage: number }> => {
    const response = await customerApi.get('/api/loyalty/customers', { params });
    return response.data;
  },

  /**
   * Award points to customer
   */
  awardPoints: async (
    customerId: string,
    points: number,
    earningType: string,
    description: string,
    referenceId?: string
  ): Promise<PointTransaction> => {
    const response = await customerApi.post(`/api/loyalty/customers/${customerId}/award`, {
      points,
      earningType,
      description,
      referenceId
    });
    return response.data;
  },

  /**
   * Manually adjust points (admin only)
   */
  adjustPoints: async (
    customerId: string,
    points: number,
    reason: string
  ): Promise<PointTransaction> => {
    const response = await customerApi.post(`/api/loyalty/customers/${customerId}/adjust`, {
      points,
      reason
    });
    return response.data;
  },

  // ==================== Point Transactions ====================
  
  /**
   * Get customer point transaction history
   */
  getPointTransactions: async (
    customerId: string,
    params?: {
      type?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: PointTransaction[]; totalPages: number; currentPage: number }> => {
    const response = await customerApi.get(`/api/loyalty/customers/${customerId}/transactions`, { params });
    return response.data;
  },

  // ==================== Redemptions ====================
  
  /**
   * Redeem points
   */
  redeemPoints: async (
    customerId: string,
    redemptionOptionId: string
  ): Promise<PointRedemption> => {
    const response = await customerApi.post(`/api/loyalty/customers/${customerId}/redeem`, {
      redemptionOptionId
    });
    return response.data;
  },

  /**
   * Apply redemption to reservation/invoice
   */
  applyRedemption: async (
    redemptionId: string,
    referenceId: string,
    referenceType: 'RESERVATION' | 'INVOICE'
  ): Promise<PointRedemption> => {
    const response = await customerApi.post(`/api/loyalty/redemptions/${redemptionId}/apply`, {
      referenceId,
      referenceType
    });
    return response.data;
  },

  /**
   * Cancel redemption
   */
  cancelRedemption: async (redemptionId: string): Promise<PointRedemption> => {
    const response = await customerApi.post(`/api/loyalty/redemptions/${redemptionId}/cancel`);
    return response.data;
  },

  /**
   * Get customer redemptions
   */
  getCustomerRedemptions: async (
    customerId: string,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: PointRedemption[]; totalPages: number; currentPage: number }> => {
    const response = await customerApi.get(`/api/loyalty/customers/${customerId}/redemptions`, { params });
    return response.data;
  },

  // ==================== Analytics & Reporting ====================
  
  /**
   * Get loyalty program statistics
   */
  getStats: async (): Promise<LoyaltyStats> => {
    const response = await customerApi.get('/api/loyalty/stats');
    return response.data;
  },

  /**
   * Get recent loyalty activity
   */
  getRecentActivity: async (limit: number = 20): Promise<LoyaltyActivity[]> => {
    const response = await customerApi.get('/api/loyalty/activity', {
      params: { limit }
    });
    return response.data;
  },

  // ==================== Client-Side Helpers ====================
  
  /**
   * Calculate points for dollar amount
   */
  calculatePointsForPurchase: (amount: number, pointsPerDollar: number, tierMultiplier: number = 1): number => {
    return Math.floor(amount * pointsPerDollar * tierMultiplier);
  },

  /**
   * Calculate tier from points
   */
  calculateTier: (points: number, tiers: LoyaltyTier[]): LoyaltyTier => {
    const sortedTiers = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
    return sortedTiers.find(tier => points >= tier.minPoints) || tiers[0];
  },

  /**
   * Calculate points to next tier
   */
  calculatePointsToNextTier: (currentPoints: number, tiers: LoyaltyTier[]): number => {
    const sortedTiers = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    const nextTier = sortedTiers.find(tier => currentPoints < tier.minPoints);
    return nextTier ? nextTier.minPoints - currentPoints : 0;
  },

  /**
   * Format points display
   */
  formatPoints: (points: number): string => {
    return points.toLocaleString();
  },

  /**
   * Get tier color
   */
  getTierColor: (tier: TierLevel): string => {
    const colors: Record<TierLevel, string> = {
      BRONZE: '#CD7F32',
      SILVER: '#C0C0C0',
      GOLD: '#FFD700',
      PLATINUM: '#E5E4E2',
      DIAMOND: '#B9F2FF'
    };
    return colors[tier];
  },

  /**
   * Get tier display name
   */
  getTierDisplayName: (tier: TierLevel): string => {
    const names: Record<TierLevel, string> = {
      BRONZE: 'Bronze',
      SILVER: 'Silver',
      GOLD: 'Gold',
      PLATINUM: 'Platinum',
      DIAMOND: 'Diamond'
    };
    return names[tier];
  },

  /**
   * Check if customer can redeem
   */
  canRedeem: (currentPoints: number, redemptionCost: number, minimumPoints: number): boolean => {
    return currentPoints >= redemptionCost && currentPoints >= minimumPoints;
  },

  /**
   * Calculate redemption value
   */
  calculateRedemptionValue: (option: RedemptionOption, purchaseAmount?: number): number => {
    if (option.type === 'DISCOUNT_FIXED') {
      return option.discountAmount || 0;
    }
    if (option.type === 'DISCOUNT_PERCENTAGE' && purchaseAmount) {
      return (purchaseAmount * (option.discountPercentage || 0)) / 100;
    }
    return 0;
  },

  /**
   * Validate earning rule
   */
  validateEarningRule: (rule: Partial<PointEarningRule>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rule.type) {
      errors.push('Earning type is required');
    }

    if (rule.type === 'DOLLARS_SPENT' && !rule.pointsPerDollar) {
      errors.push('Points per dollar is required');
    }

    if (rule.type === 'VISIT' && !rule.pointsPerVisit) {
      errors.push('Points per visit is required');
    }

    if (rule.type === 'REFERRAL' && (!rule.pointsForReferrer || !rule.pointsForReferee)) {
      errors.push('Referral points are required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate redemption option
   */
  validateRedemptionOption: (option: Partial<RedemptionOption>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!option.name || option.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!option.pointsCost || option.pointsCost <= 0) {
      errors.push('Points cost must be greater than 0');
    }

    if (option.type === 'DISCOUNT_PERCENTAGE' && (!option.discountPercentage || option.discountPercentage <= 0)) {
      errors.push('Discount percentage is required');
    }

    if (option.type === 'DISCOUNT_FIXED' && (!option.discountAmount || option.discountAmount <= 0)) {
      errors.push('Discount amount is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
