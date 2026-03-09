/**
 * Loyalty Rewards System Types
 * 
 * Multi-tenant configurable loyalty program with:
 * - Points-based rewards
 * - Tier-based membership
 * - Configurable earning rules
 * - Flexible redemption options
 */

export type PointEarningType = 
  | 'DOLLARS_SPENT'      // Points per dollar spent
  | 'VISIT'              // Points per visit/check-in
  | 'REFERRAL'           // Points for referring new customers
  | 'BIRTHDAY'           // Bonus points on birthday
  | 'ANNIVERSARY'        // Bonus points on membership anniversary
  | 'REVIEW'             // Points for leaving reviews
  | 'SOCIAL_SHARE'       // Points for social media shares
  | 'SERVICE_SPECIFIC';  // Points for specific services

export type RedemptionType =
  | 'DISCOUNT_PERCENTAGE' // Percentage off total
  | 'DISCOUNT_FIXED'      // Fixed dollar amount off
  | 'FREE_SERVICE'        // Free service redemption
  | 'FREE_ADDON'          // Free add-on service
  | 'UPGRADE';            // Free upgrade to better suite

export type TierLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface LoyaltyConfig {
  id: string;
  tenantId: string;
  isEnabled: boolean;
  programName: string; // e.g., "Happy Tails Rewards", "Paws & Perks"
  
  // Point earning configuration
  earningRules: PointEarningRule[];
  
  // Tier configuration
  tiersEnabled: boolean;
  tiers: LoyaltyTier[];
  
  // Point expiration
  pointsExpireEnabled: boolean;
  pointsExpireDays?: number; // e.g., 365 days
  
  // Redemption configuration
  redemptionOptions: RedemptionOption[];
  minimumPointsToRedeem: number;
  
  // Display settings
  showPointsOnReceipts: boolean;
  showTierOnProfile: boolean;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PointEarningRule {
  id: string;
  type: PointEarningType;
  isActive: boolean;
  
  // For DOLLARS_SPENT
  pointsPerDollar?: number; // e.g., 1 point per $1 spent
  
  // For VISIT
  pointsPerVisit?: number; // e.g., 10 points per visit
  
  // For REFERRAL
  pointsForReferrer?: number; // e.g., 500 points for referrer
  pointsForReferee?: number;  // e.g., 100 points for new customer
  
  // For BIRTHDAY/ANNIVERSARY
  bonusPoints?: number; // e.g., 100 bonus points
  
  // For REVIEW
  pointsPerReview?: number; // e.g., 50 points per review
  
  // For SOCIAL_SHARE
  pointsPerShare?: number; // e.g., 25 points per share
  
  // For SERVICE_SPECIFIC
  serviceId?: string;
  pointsForService?: number;
  
  // Tier multipliers (if tiers enabled)
  tierMultipliers?: {
    [key in TierLevel]?: number; // e.g., GOLD: 1.5x points
  };
}

export interface LoyaltyTier {
  level: TierLevel;
  name: string; // Customizable name
  minPoints: number; // Points needed to reach this tier
  color: string; // Hex color for UI
  benefits: string[]; // List of benefits
  pointsMultiplier: number; // e.g., 1.5 = 50% more points
  discountPercentage?: number; // e.g., 5% off all services
}

export interface RedemptionOption {
  id: string;
  type: RedemptionType;
  name: string;
  description: string;
  pointsCost: number;
  isActive: boolean;
  
  // For DISCOUNT_PERCENTAGE
  discountPercentage?: number;
  
  // For DISCOUNT_FIXED
  discountAmount?: number;
  
  // For FREE_SERVICE
  serviceId?: string;
  
  // For FREE_ADDON
  addonId?: string;
  
  // For UPGRADE
  fromSuiteType?: string;
  toSuiteType?: string;
  
  // Restrictions
  minPurchaseAmount?: number;
  maxRedemptionsPerCustomer?: number;
  expiresAfterDays?: number;
}

export interface CustomerLoyalty {
  id: string;
  customerId: string;
  tenantId: string;
  
  // Points
  totalPointsEarned: number;
  currentPoints: number;
  lifetimePoints: number;
  
  // Tier
  currentTier: TierLevel;
  pointsToNextTier: number;
  
  // Membership
  memberSince: Date | string;
  lastActivityDate: Date | string;
  
  // Statistics
  totalVisits: number;
  totalSpent: number;
  referralCount: number;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PointTransaction {
  id: string;
  customerId: string;
  tenantId: string;
  
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED';
  points: number; // Positive for earned, negative for redeemed/expired
  
  earningType?: PointEarningType;
  redemptionId?: string;
  
  description: string;
  referenceId?: string; // e.g., reservationId, invoiceId
  
  balanceBefore: number;
  balanceAfter: number;
  
  expiresAt?: Date | string;
  
  createdAt: Date | string;
}

export interface PointRedemption {
  id: string;
  customerId: string;
  tenantId: string;
  
  redemptionOptionId: string;
  pointsRedeemed: number;
  
  status: 'PENDING' | 'APPLIED' | 'CANCELLED' | 'EXPIRED';
  
  appliedToReservationId?: string;
  appliedToInvoiceId?: string;
  
  discountAmount?: number;
  
  createdAt: Date | string;
  appliedAt?: Date | string;
  expiresAt?: Date | string;
}

export interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number; // Active in last 90 days
  
  pointsIssued: number;
  pointsRedeemed: number;
  pointsExpired: number;
  pointsOutstanding: number;
  
  tierDistribution: {
    [key in TierLevel]: number;
  };
  
  averagePointsPerCustomer: number;
  redemptionRate: number; // Percentage of points redeemed
  
  topEarners: {
    customerId: string;
    customerName: string;
    points: number;
    tier: TierLevel;
  }[];
}

export interface LoyaltyActivity {
  customerId: string;
  customerName: string;
  activityType: 'EARNED' | 'REDEEMED' | 'TIER_UPGRADE';
  points?: number;
  newTier?: TierLevel;
  description: string;
  timestamp: Date | string;
}

// Default configurations (industry best practices)
export const DEFAULT_LOYALTY_CONFIG: Partial<LoyaltyConfig> = {
  isEnabled: true,
  programName: 'Rewards Program',
  pointsExpireEnabled: true,
  pointsExpireDays: 365,
  minimumPointsToRedeem: 100,
  showPointsOnReceipts: true,
  showTierOnProfile: true,
  tiersEnabled: true
};

export const DEFAULT_EARNING_RULES: Partial<PointEarningRule>[] = [
  {
    type: 'DOLLARS_SPENT',
    isActive: true,
    pointsPerDollar: 1 // 1 point per $1 spent (industry standard)
  },
  {
    type: 'VISIT',
    isActive: true,
    pointsPerVisit: 10 // 10 points per visit
  },
  {
    type: 'REFERRAL',
    isActive: true,
    pointsForReferrer: 500, // 500 points for referrer
    pointsForReferee: 100   // 100 points for new customer
  },
  {
    type: 'BIRTHDAY',
    isActive: true,
    bonusPoints: 100 // 100 bonus points on birthday
  },
  {
    type: 'ANNIVERSARY',
    isActive: true,
    bonusPoints: 200 // 200 bonus points on membership anniversary
  },
  {
    type: 'REVIEW',
    isActive: false,
    pointsPerReview: 50 // 50 points per review (optional)
  }
];

export const DEFAULT_TIERS: LoyaltyTier[] = [
  {
    level: 'BRONZE',
    name: 'Bronze Member',
    minPoints: 0,
    color: '#CD7F32',
    benefits: ['Earn 1x points', 'Birthday bonus'],
    pointsMultiplier: 1.0,
    discountPercentage: 0
  },
  {
    level: 'SILVER',
    name: 'Silver Member',
    minPoints: 1000,
    color: '#C0C0C0',
    benefits: ['Earn 1.25x points', 'Birthday bonus', '5% off services'],
    pointsMultiplier: 1.25,
    discountPercentage: 5
  },
  {
    level: 'GOLD',
    name: 'Gold Member',
    minPoints: 2500,
    color: '#FFD700',
    benefits: ['Earn 1.5x points', 'Birthday bonus', '10% off services', 'Priority booking'],
    pointsMultiplier: 1.5,
    discountPercentage: 10
  },
  {
    level: 'PLATINUM',
    name: 'Platinum Member',
    minPoints: 5000,
    color: '#E5E4E2',
    benefits: ['Earn 1.75x points', 'Birthday bonus', '15% off services', 'Priority booking', 'Free upgrades'],
    pointsMultiplier: 1.75,
    discountPercentage: 15
  },
  {
    level: 'DIAMOND',
    name: 'Diamond Member',
    minPoints: 10000,
    color: '#B9F2FF',
    benefits: ['Earn 2x points', 'Birthday bonus', '20% off services', 'Priority booking', 'Free upgrades', 'VIP treatment'],
    pointsMultiplier: 2.0,
    discountPercentage: 20
  }
];

export const DEFAULT_REDEMPTION_OPTIONS: Partial<RedemptionOption>[] = [
  {
    type: 'DISCOUNT_FIXED',
    name: '$5 Off',
    description: 'Get $5 off your next visit',
    pointsCost: 500,
    discountAmount: 5,
    isActive: true
  },
  {
    type: 'DISCOUNT_FIXED',
    name: '$10 Off',
    description: 'Get $10 off your next visit',
    pointsCost: 1000,
    discountAmount: 10,
    isActive: true
  },
  {
    type: 'DISCOUNT_FIXED',
    name: '$25 Off',
    description: 'Get $25 off your next visit',
    pointsCost: 2500,
    discountAmount: 25,
    isActive: true,
    minPurchaseAmount: 50
  },
  {
    type: 'DISCOUNT_PERCENTAGE',
    name: '10% Off',
    description: 'Get 10% off your entire purchase',
    pointsCost: 750,
    discountPercentage: 10,
    isActive: true
  },
  {
    type: 'DISCOUNT_PERCENTAGE',
    name: '20% Off',
    description: 'Get 20% off your entire purchase',
    pointsCost: 1500,
    discountPercentage: 20,
    isActive: true,
    minPurchaseAmount: 50
  }
];
