/**
 * Deposit Service
 * 
 * Multi-tenant configurable deposit rules and calculations
 */

import { customerApi } from './api';
import {
  DepositConfig,
  DepositRule,
  DepositCalculation,
  DepositPayment,
  DepositStats,
  DepositRuleConditions,
  RefundTier,
  DepositAmountType,
  RefundPolicyType
} from '../types/deposit';
import { parseLocalDate, daysBetween, getDayOfWeek } from '../utils/dateUtils';

export const depositService = {
  // ==================== Configuration Management ====================
  
  /**
   * Get deposit configuration for tenant
   */
  getConfig: async (): Promise<DepositConfig> => {
    const response = await customerApi.get('/api/deposits/config');
    return response.data;
  },

  /**
   * Update deposit configuration
   */
  updateConfig: async (config: Partial<DepositConfig>): Promise<DepositConfig> => {
    const response = await customerApi.put('/api/deposits/config', config);
    return response.data;
  },

  /**
   * Enable/disable deposit system
   */
  toggleSystem: async (enabled: boolean): Promise<DepositConfig> => {
    const response = await customerApi.patch('/api/deposits/config/toggle', { isEnabled: enabled });
    return response.data;
  },

  // ==================== Deposit Rules Management ====================
  
  /**
   * Get all deposit rules
   */
  getRules: async (): Promise<DepositRule[]> => {
    const response = await customerApi.get('/api/deposits/rules');
    return response.data;
  },

  /**
   * Create deposit rule
   */
  createRule: async (rule: Partial<DepositRule>): Promise<DepositRule> => {
    const response = await customerApi.post('/api/deposits/rules', rule);
    return response.data;
  },

  /**
   * Update deposit rule
   */
  updateRule: async (id: string, updates: Partial<DepositRule>): Promise<DepositRule> => {
    const response = await customerApi.put(`/api/deposits/rules/${id}`, updates);
    return response.data;
  },

  /**
   * Delete deposit rule
   */
  deleteRule: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/deposits/rules/${id}`);
  },

  /**
   * Reorder rules (update priorities)
   */
  reorderRules: async (ruleIds: string[]): Promise<DepositRule[]> => {
    const response = await customerApi.post('/api/deposits/rules/reorder', { ruleIds });
    return response.data;
  },

  // ==================== Deposit Calculation ====================
  
  /**
   * Calculate deposit for reservation
   */
  calculateDeposit: async (params: {
    totalCost: number;
    startDate: string;
    endDate: string;
    serviceId?: string;
    customerId?: string;
  }): Promise<DepositCalculation> => {
    const response = await customerApi.post('/api/deposits/calculate', params);
    return response.data;
  },

  /**
   * Calculate deposit locally (client-side)
   */
  calculateDepositLocal: (
    totalCost: number,
    startDate: string,
    endDate: string,
    rules: DepositRule[],
    config: DepositConfig,
    options?: {
      serviceId?: string;
      isFirstTimeCustomer?: boolean;
    }
  ): DepositCalculation => {
    // Sort rules by priority
    const sortedRules = [...rules]
      .filter(r => r.isActive)
      .sort((a, b) => a.priority - b.priority);

    // Find first matching rule
    const matchedRule = sortedRules.find(rule => 
      depositService.evaluateRuleConditions(rule.conditions, {
        totalCost,
        startDate,
        endDate,
        serviceId: options?.serviceId,
        isFirstTimeCustomer: options?.isFirstTimeCustomer
      })
    );

    if (matchedRule) {
      const depositAmount = depositService.calculateDepositAmount(
        totalCost,
        matchedRule.depositAmountType,
        matchedRule.depositPercentage,
        matchedRule.depositFixedAmount
      );

      const dueDate = matchedRule.depositDueDays
        ? depositService.calculateDueDate(startDate, matchedRule.depositDueDays)
        : undefined;

      return {
        totalCost,
        matchedRule,
        matchedRuleName: matchedRule.name,
        depositRequired: true,
        depositAmount,
        depositPercentage: matchedRule.depositAmountType === 'PERCENTAGE' 
          ? matchedRule.depositPercentage 
          : undefined,
        depositDueDate: dueDate,
        refundPolicy: matchedRule.refundPolicy,
        refundTiers: matchedRule.refundTiers,
        explanation: depositService.generateExplanation(matchedRule, depositAmount, totalCost)
      };
    }

    // No rule matched - use default
    if (config.defaultDepositRequired && config.defaultDepositAmount && config.defaultDepositType) {
      const depositAmount = depositService.calculateDepositAmount(
        totalCost,
        config.defaultDepositType,
        config.defaultDepositType === 'PERCENTAGE' ? config.defaultDepositAmount : undefined,
        config.defaultDepositType === 'FIXED' ? config.defaultDepositAmount : undefined
      );

      return {
        totalCost,
        depositRequired: true,
        depositAmount,
        refundPolicy: 'FULL_REFUND',
        explanation: `Default deposit: ${depositService.formatDepositAmount(depositAmount, totalCost)}`
      };
    }

    // No deposit required
    return {
      totalCost,
      depositRequired: false,
      depositAmount: 0,
      refundPolicy: 'FULL_REFUND',
      explanation: 'No deposit required'
    };
  },

  /**
   * Evaluate if rule conditions match
   */
  evaluateRuleConditions: (
    conditions: DepositRuleConditions,
    params: {
      totalCost: number;
      startDate: string;
      endDate: string;
      serviceId?: string;
      isFirstTimeCustomer?: boolean;
    }
  ): boolean => {
    // Cost threshold
    if (conditions.minCost !== undefined && params.totalCost < conditions.minCost) {
      return false;
    }
    if (conditions.maxCost !== undefined && params.totalCost > conditions.maxCost) {
      return false;
    }

    // Service type
    if (conditions.serviceIds && conditions.serviceIds.length > 0) {
      if (!params.serviceId || !conditions.serviceIds.includes(params.serviceId)) {
        return false;
      }
    }

    // Advance booking
    const daysInAdvance = daysBetween(new Date().toISOString().split('T')[0], params.startDate);
    if (conditions.minDaysInAdvance !== undefined && daysInAdvance < conditions.minDaysInAdvance) {
      return false;
    }
    if (conditions.maxDaysInAdvance !== undefined && daysInAdvance > conditions.maxDaysInAdvance) {
      return false;
    }

    // Date ranges (holidays, peak seasons)
    if (conditions.dateRanges && conditions.dateRanges.length > 0) {
      const isInRange = conditions.dateRanges.some(range => {
        return params.startDate >= range.startDate && params.startDate <= range.endDate;
      });
      if (!isInRange) {
        return false;
      }
    }

    // Days of week
    if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
      const dayOfWeek = getDayOfWeek(params.startDate);
      if (!conditions.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    // Duration
    const nights = daysBetween(params.startDate, params.endDate);
    if (conditions.minNights !== undefined && nights < conditions.minNights) {
      return false;
    }
    if (conditions.maxNights !== undefined && nights > conditions.maxNights) {
      return false;
    }

    // First-time customer
    if (conditions.firstTimeCustomerOnly && !params.isFirstTimeCustomer) {
      return false;
    }

    return true;
  },

  /**
   * Calculate deposit amount
   */
  calculateDepositAmount: (
    totalCost: number,
    amountType: DepositAmountType,
    percentage?: number,
    fixedAmount?: number
  ): number => {
    if (amountType === 'FULL') {
      return totalCost;
    }
    if (amountType === 'PERCENTAGE' && percentage) {
      return Math.round((totalCost * percentage / 100) * 100) / 100;
    }
    if (amountType === 'FIXED' && fixedAmount) {
      return Math.min(fixedAmount, totalCost);
    }
    return 0;
  },

  /**
   * Calculate due date
   */
  calculateDueDate: (startDate: string, daysBefore: number): string => {
    const start = parseLocalDate(startDate);
    start.setDate(start.getDate() - daysBefore);
    return start.toISOString().split('T')[0];
  },

  /**
   * Generate explanation text
   */
  generateExplanation: (rule: DepositRule, depositAmount: number, totalCost: number): string => {
    let explanation = `${rule.name}: `;
    
    if (rule.depositAmountType === 'FULL') {
      explanation += 'Full payment required';
    } else if (rule.depositAmountType === 'PERCENTAGE') {
      explanation += `${rule.depositPercentage}% deposit ($${depositAmount.toFixed(2)})`;
    } else if (rule.depositAmountType === 'FIXED') {
      explanation += `$${depositAmount.toFixed(2)} deposit`;
    }

    if (rule.depositDueDays) {
      explanation += ` due ${rule.depositDueDays} days before arrival`;
    }

    return explanation;
  },

  // ==================== Deposit Payments ====================
  
  /**
   * Get deposit payment for reservation
   */
  getDepositPayment: async (reservationId: string): Promise<DepositPayment> => {
    const response = await customerApi.get(`/api/deposits/payments/${reservationId}`);
    return response.data;
  },

  /**
   * Record deposit payment
   */
  recordPayment: async (
    reservationId: string,
    amount: number,
    paymentMethod: string,
    transactionId?: string
  ): Promise<DepositPayment> => {
    const response = await customerApi.post(`/api/deposits/payments/${reservationId}/pay`, {
      amount,
      paymentMethod,
      transactionId
    });
    return response.data;
  },

  /**
   * Process refund
   */
  processRefund: async (
    reservationId: string,
    reason: string,
    cancelDate?: string
  ): Promise<DepositPayment> => {
    const response = await customerApi.post(`/api/deposits/payments/${reservationId}/refund`, {
      reason,
      cancelDate
    });
    return response.data;
  },

  /**
   * Calculate refund amount based on policy
   */
  calculateRefundAmount: (
    depositAmount: number,
    refundPolicy: RefundPolicyType,
    refundTiers: RefundTier[] | undefined,
    startDate: string,
    cancelDate: string
  ): number => {
    if (refundPolicy === 'NON_REFUNDABLE') {
      return 0;
    }

    if (refundPolicy === 'FULL_REFUND') {
      return depositAmount;
    }

    if (refundPolicy === 'TIERED_REFUND' && refundTiers) {
      const daysBeforeStart = daysBetween(cancelDate, startDate);
      
      // Find applicable tier (sorted by daysBeforeStart descending)
      const sortedTiers = [...refundTiers].sort((a, b) => b.daysBeforeStart - a.daysBeforeStart);
      const tier = sortedTiers.find(t => daysBeforeStart >= t.daysBeforeStart);
      
      if (tier) {
        return Math.round((depositAmount * tier.refundPercentage / 100) * 100) / 100;
      }
    }

    return 0;
  },

  // ==================== Analytics & Reporting ====================
  
  /**
   * Get deposit statistics
   */
  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DepositStats> => {
    const response = await customerApi.get('/api/deposits/stats', { params });
    return response.data;
  },

  /**
   * Get upcoming deposits
   */
  getUpcomingDeposits: async (params?: {
    daysAhead?: number;
  }): Promise<DepositPayment[]> => {
    const response = await customerApi.get('/api/deposits/upcoming', { params });
    return response.data;
  },

  /**
   * Get overdue deposits
   */
  getOverdueDeposits: async (): Promise<DepositPayment[]> => {
    const response = await customerApi.get('/api/deposits/overdue');
    return response.data;
  },

  // ==================== Client-Side Helpers ====================
  
  /**
   * Format deposit amount for display
   */
  formatDepositAmount: (amount: number, totalCost: number): string => {
    const percentage = Math.round((amount / totalCost) * 100);
    if (amount === totalCost) {
      return 'Full payment required';
    }
    return `$${amount.toFixed(2)} (${percentage}%)`;
  },

  /**
   * Get refund policy display text
   */
  getRefundPolicyText: (policy: RefundPolicyType): string => {
    const texts: Record<RefundPolicyType, string> = {
      FULL_REFUND: 'Fully refundable',
      PARTIAL_REFUND: 'Partially refundable',
      NON_REFUNDABLE: 'Non-refundable',
      TIERED_REFUND: 'Refund based on cancellation timing'
    };
    return texts[policy];
  },

  /**
   * Check if deposit is overdue
   */
  isDepositOverdue: (dueDate: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  },

  /**
   * Get deposit status color
   */
  getDepositStatusColor: (status: string): string => {
    const colors: Record<string, string> = {
      PENDING: '#ff9800',
      PARTIAL: '#2196f3',
      PAID: '#4caf50',
      REFUNDED: '#9e9e9e',
      FORFEITED: '#f44336'
    };
    return colors[status] || '#9e9e9e';
  },

  /**
   * Validate deposit rule
   */
  validateRule: (rule: Partial<DepositRule>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!rule.type) {
      errors.push('Rule type is required');
    }

    if (!rule.depositAmountType) {
      errors.push('Deposit amount type is required');
    }

    if (rule.depositAmountType === 'PERCENTAGE' && (!rule.depositPercentage || rule.depositPercentage <= 0)) {
      errors.push('Deposit percentage must be greater than 0');
    }

    if (rule.depositAmountType === 'FIXED' && (!rule.depositFixedAmount || rule.depositFixedAmount <= 0)) {
      errors.push('Deposit fixed amount must be greater than 0');
    }

    if (rule.refundPolicy === 'TIERED_REFUND' && (!rule.refundTiers || rule.refundTiers.length === 0)) {
      errors.push('Refund tiers are required for tiered refund policy');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
