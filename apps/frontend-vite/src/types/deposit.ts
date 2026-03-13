/**
 * Flexible Deposit Rules System Types
 * 
 * Multi-tenant configurable deposit requirements with:
 * - Cost threshold-based deposits
 * - Service type-based deposits
 * - Date-based deposits (advance booking, holidays)
 * - Refund policies
 * - Partial payment tracking
 */

export type DepositRuleType =
  | 'COST_THRESHOLD'      // Deposit based on total cost
  | 'SERVICE_TYPE'        // Deposit based on service type
  | 'ADVANCE_BOOKING'     // Deposit based on days in advance
  | 'HOLIDAY_PEAK'        // Deposit for holidays/peak seasons
  | 'DAY_OF_WEEK'         // Deposit for specific days
  | 'DURATION'            // Deposit based on stay duration
  | 'FIRST_TIME_CUSTOMER' // Deposit for new customers
  | 'CUSTOM';             // Custom rule

export type DepositAmountType =
  | 'PERCENTAGE'  // Percentage of total cost
  | 'FIXED'       // Fixed dollar amount
  | 'FULL';       // Full payment required

export type RefundPolicyType =
  | 'FULL_REFUND'           // 100% refundable
  | 'PARTIAL_REFUND'        // Partial refund based on timing
  | 'NON_REFUNDABLE'        // No refund
  | 'TIERED_REFUND';        // Tiered based on cancellation timing

export interface DepositConfig {
  id: string;
  tenantId: string;
  isEnabled: boolean;
  
  // Rules (evaluated in priority order)
  rules: DepositRule[];
  
  // Default deposit (if no rules match)
  defaultDepositRequired: boolean;
  defaultDepositAmount?: number;
  defaultDepositType?: DepositAmountType;
  
  // Payment settings
  allowPartialPayments: boolean;
  minimumPartialPaymentAmount?: number;
  
  // Reminder settings
  sendDepositReminders: boolean;
  reminderDaysBefore?: number[];
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DepositRule {
  id: string;
  name: string;
  description: string;
  type: DepositRuleType;
  isActive: boolean;
  priority: number; // Lower number = higher priority
  
  // Conditions (when this rule applies)
  conditions: DepositRuleConditions;
  
  // Deposit amount
  depositAmountType: DepositAmountType;
  depositPercentage?: number; // For PERCENTAGE type
  depositFixedAmount?: number; // For FIXED type
  
  // Refund policy
  refundPolicy: RefundPolicyType;
  refundTiers?: RefundTier[];
  
  // Due date
  depositDueDays?: number; // Days before reservation start
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DepositRuleConditions {
  // Cost threshold
  minCost?: number;
  maxCost?: number;
  
  // Service types
  serviceIds?: string[];
  serviceCategories?: string[];
  
  // Advance booking
  minDaysInAdvance?: number;
  maxDaysInAdvance?: number;
  
  // Date ranges (holidays, peak seasons)
  dateRanges?: DateRange[];
  
  // Days of week (0 = Sunday, 6 = Saturday)
  daysOfWeek?: number[];
  
  // Duration
  minNights?: number;
  maxNights?: number;
  
  // Customer type
  firstTimeCustomerOnly?: boolean;
  
  // Custom conditions
  customConditions?: Record<string, any>;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  name?: string;     // e.g., "Christmas Holiday", "Summer Peak"
}

export interface RefundTier {
  daysBeforeStart: number; // Cancel X days before
  refundPercentage: number; // Get Y% back
  description: string;
}

export interface DepositCalculation {
  reservationId?: string;
  totalCost: number;
  
  // Matched rule
  matchedRule?: DepositRule;
  matchedRuleName?: string;
  
  // Deposit amount
  depositRequired: boolean;
  depositAmount: number;
  depositPercentage?: number;
  depositDueDate?: Date | string;
  
  // Refund policy
  refundPolicy: RefundPolicyType;
  refundTiers?: RefundTier[];
  
  // Explanation
  explanation: string;
}

export interface DepositPayment {
  id: string;
  reservationId: string;
  customerId: string;
  tenantId: string;
  
  // Amounts
  depositAmount: number;
  amountPaid: number;
  amountRemaining: number;
  
  // Status
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'FORFEITED';
  
  // Due date
  dueDate: Date | string;
  
  // Payments
  payments: DepositPaymentTransaction[];
  
  // Refund
  refundPolicy: RefundPolicyType;
  refundAmount?: number;
  refundDate?: Date | string;
  refundReason?: string;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DepositPaymentTransaction {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  paidAt: Date | string;
  notes?: string;
}

export interface DepositStats {
  totalDepositsCollected: number;
  totalDepositsOutstanding: number;
  totalDepositsRefunded: number;
  totalDepositsForfeited: number;
  
  averageDepositAmount: number;
  depositCollectionRate: number; // Percentage
  
  depositsByRule: {
    ruleName: string;
    count: number;
    totalAmount: number;
  }[];
  
  upcomingDeposits: {
    dueToday: number;
    dueThisWeek: number;
    dueThisMonth: number;
  };
}

// Default configurations (industry best practices)
export const DEFAULT_DEPOSIT_CONFIG: Partial<DepositConfig> = {
  isEnabled: true,
  defaultDepositRequired: false,
  allowPartialPayments: true,
  sendDepositReminders: true,
  reminderDaysBefore: [7, 3, 1]
};

export const DEFAULT_DEPOSIT_RULES: Partial<DepositRule>[] = [
  // High-value reservations
  {
    name: 'High-Value Reservation',
    description: 'Require 50% deposit for reservations over $500',
    type: 'COST_THRESHOLD',
    isActive: true,
    priority: 1,
    conditions: {
      minCost: 500
    },
    depositAmountType: 'PERCENTAGE',
    depositPercentage: 50,
    refundPolicy: 'TIERED_REFUND',
    refundTiers: [
      { daysBeforeStart: 14, refundPercentage: 100, description: '100% refund if cancelled 14+ days before' },
      { daysBeforeStart: 7, refundPercentage: 50, description: '50% refund if cancelled 7-13 days before' },
      { daysBeforeStart: 0, refundPercentage: 0, description: 'No refund if cancelled less than 7 days before' }
    ],
    depositDueDays: 3
  },
  
  // Holiday/Peak season
  {
    name: 'Holiday Peak Season',
    description: 'Require full payment for holiday reservations',
    type: 'HOLIDAY_PEAK',
    isActive: true,
    priority: 2,
    conditions: {
      dateRanges: [
        { startDate: '2025-12-20', endDate: '2026-01-05', name: 'Christmas/New Year' },
        { startDate: '2026-07-01', endDate: '2026-07-07', name: 'July 4th Week' },
        { startDate: '2026-11-25', endDate: '2026-11-30', name: 'Thanksgiving' }
      ]
    },
    depositAmountType: 'FULL',
    refundPolicy: 'TIERED_REFUND',
    refundTiers: [
      { daysBeforeStart: 30, refundPercentage: 100, description: '100% refund if cancelled 30+ days before' },
      { daysBeforeStart: 14, refundPercentage: 50, description: '50% refund if cancelled 14-29 days before' },
      { daysBeforeStart: 0, refundPercentage: 0, description: 'No refund if cancelled less than 14 days before' }
    ],
    depositDueDays: 7
  },
  
  // Weekend reservations
  {
    name: 'Weekend Reservation',
    description: 'Require 25% deposit for weekend stays',
    type: 'DAY_OF_WEEK',
    isActive: true,
    priority: 3,
    conditions: {
      daysOfWeek: [5, 6] // Friday, Saturday
    },
    depositAmountType: 'PERCENTAGE',
    depositPercentage: 25,
    refundPolicy: 'TIERED_REFUND',
    refundTiers: [
      { daysBeforeStart: 7, refundPercentage: 100, description: '100% refund if cancelled 7+ days before' },
      { daysBeforeStart: 3, refundPercentage: 50, description: '50% refund if cancelled 3-6 days before' },
      { daysBeforeStart: 0, refundPercentage: 0, description: 'No refund if cancelled less than 3 days before' }
    ],
    depositDueDays: 2
  },
  
  // Long stays
  {
    name: 'Extended Stay',
    description: 'Require $100 deposit for stays 7+ nights',
    type: 'DURATION',
    isActive: true,
    priority: 4,
    conditions: {
      minNights: 7
    },
    depositAmountType: 'FIXED',
    depositFixedAmount: 100,
    refundPolicy: 'FULL_REFUND',
    depositDueDays: 5
  },
  
  // First-time customers
  {
    name: 'First-Time Customer',
    description: 'Require 50% deposit for first-time customers',
    type: 'FIRST_TIME_CUSTOMER',
    isActive: false, // Optional - can be enabled
    priority: 5,
    conditions: {
      firstTimeCustomerOnly: true
    },
    depositAmountType: 'PERCENTAGE',
    depositPercentage: 50,
    refundPolicy: 'FULL_REFUND',
    depositDueDays: 1
  }
];

export const DEFAULT_REFUND_TIERS: RefundTier[] = [
  { daysBeforeStart: 14, refundPercentage: 100, description: '100% refund if cancelled 14+ days before' },
  { daysBeforeStart: 7, refundPercentage: 50, description: '50% refund if cancelled 7-13 days before' },
  { daysBeforeStart: 3, refundPercentage: 25, description: '25% refund if cancelled 3-6 days before' },
  { daysBeforeStart: 0, refundPercentage: 0, description: 'No refund if cancelled less than 3 days before' }
];
