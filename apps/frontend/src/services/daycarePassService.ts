/**
 * Daycare Pass Service
 *
 * Handles all daycare pass-related API calls:
 * - Package management (admin settings)
 * - Customer pass purchases
 * - Pass redemption
 * - Balance checking
 */

import { customerApi } from "./api";

// Types
export interface DaycarePassPackage {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  passCount: number;
  price: number;
  regularPricePerDay: number;
  discountPercent: number;
  validityDays: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDaycarePass {
  id: string;
  tenantId: string;
  customerId: string;
  packageId: string;
  package: DaycarePassPackage;
  passesPurchased: number;
  passesRemaining: number;
  passesUsed: number;
  purchasePrice: number;
  pricePerPass: number;
  purchasedAt: string;
  expiresAt: string;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "CANCELLED";
  invoiceId?: string;
  paymentId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  redemptions?: DaycarePassRedemption[];
}

export interface DaycarePassRedemption {
  id: string;
  tenantId: string;
  customerPassId: string;
  petId: string;
  reservationId?: string;
  checkInId?: string;
  passesBeforeUse: number;
  passesAfterUse: number;
  redeemedAt: string;
  redeemedBy?: string;
  notes?: string;
  isReversed: boolean;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
}

export interface CreatePackageRequest {
  name: string;
  description?: string;
  passCount: number;
  price: number;
  regularPricePerDay: number;
  discountPercent?: number;
  validityDays: number;
  sortOrder?: number;
}

export interface PurchasePassRequest {
  customerId: string;
  packageId: string;
  invoiceId?: string;
  paymentId?: string;
  notes?: string;
}

export interface RedeemPassRequest {
  petId: string;
  reservationId?: string;
  checkInId?: string;
  notes?: string;
}

export interface AutoRedeemRequest {
  customerId: string;
  petId: string;
  reservationId?: string;
  checkInId?: string;
  notes?: string;
}

export interface AvailablePassesResponse {
  hasAvailablePasses: boolean;
  totalPassesRemaining: number;
  passes: {
    id: string;
    packageName: string;
    remaining: number;
    expiresAt: string;
  }[];
}

export interface CustomerPassesSummary {
  totalPassesRemaining: number;
  activePasses: number;
  expiringSoon: number;
}

export const daycarePassService = {
  // ============================================
  // PACKAGE MANAGEMENT (Admin/Settings)
  // ============================================

  /**
   * Get all pass packages for the tenant
   */
  getPackages: async (
    includeInactive = false
  ): Promise<DaycarePassPackage[]> => {
    const response = await customerApi.get("/api/daycare-passes/packages", {
      params: { includeInactive },
    });
    return response.data.data || [];
  },

  /**
   * Create a new pass package
   */
  createPackage: async (
    data: CreatePackageRequest
  ): Promise<DaycarePassPackage> => {
    const response = await customerApi.post(
      "/api/daycare-passes/packages",
      data
    );
    return response.data.data;
  },

  /**
   * Update a pass package
   */
  updatePackage: async (
    id: string,
    data: Partial<CreatePackageRequest & { isActive: boolean }>
  ): Promise<DaycarePassPackage> => {
    const response = await customerApi.patch(
      `/api/daycare-passes/packages/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Deactivate a pass package (soft delete)
   */
  deletePackage: async (id: string): Promise<void> => {
    await customerApi.delete(`/api/daycare-passes/packages/${id}`);
  },

  // ============================================
  // CUSTOMER PASS MANAGEMENT
  // ============================================

  /**
   * Get all passes for a customer
   */
  getCustomerPasses: async (
    customerId: string,
    activeOnly = true
  ): Promise<{
    summary: CustomerPassesSummary;
    data: CustomerDaycarePass[];
  }> => {
    const response = await customerApi.get(
      `/api/daycare-passes/customer/${customerId}`,
      {
        params: { activeOnly },
      }
    );
    return {
      summary: response.data.summary,
      data: response.data.data || [],
    };
  },

  /**
   * Check if customer has available passes (for check-in flow)
   */
  checkAvailablePasses: async (
    customerId: string
  ): Promise<AvailablePassesResponse> => {
    const response = await customerApi.get(
      `/api/daycare-passes/check/${customerId}`
    );
    return response.data;
  },

  /**
   * Purchase a pass package for a customer
   */
  purchasePass: async (
    data: PurchasePassRequest
  ): Promise<CustomerDaycarePass> => {
    const response = await customerApi.post(
      "/api/daycare-passes/purchase",
      data
    );
    return response.data.data;
  },

  /**
   * Redeem a specific pass
   */
  redeemPass: async (
    passId: string,
    data: RedeemPassRequest
  ): Promise<{
    pass: CustomerDaycarePass;
    redemption: DaycarePassRedemption;
  }> => {
    const response = await customerApi.post(
      `/api/daycare-passes/${passId}/redeem`,
      data
    );
    return response.data.data;
  },

  /**
   * Auto-select and redeem the best available pass for a customer
   * (Uses pass expiring soonest first)
   */
  autoRedeemPass: async (
    data: AutoRedeemRequest
  ): Promise<{
    redeemed: boolean;
    message: string;
    data: {
      pass: CustomerDaycarePass;
      redemption: DaycarePassRedemption;
    } | null;
  }> => {
    const response = await customerApi.post(
      "/api/daycare-passes/auto-redeem",
      data
    );
    return response.data;
  },

  /**
   * Reverse a redemption (refund the pass)
   */
  reverseRedemption: async (
    redemptionId: string,
    reason: string
  ): Promise<{
    pass: CustomerDaycarePass;
    redemption: DaycarePassRedemption;
  }> => {
    const response = await customerApi.post(
      `/api/daycare-passes/redemptions/${redemptionId}/reverse`,
      { reason }
    );
    return response.data.data;
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Calculate savings for a package
   */
  calculateSavings: (
    pkg: DaycarePassPackage
  ): { amount: number; percentage: number } => {
    const regularTotal = pkg.regularPricePerDay * pkg.passCount;
    const savings = regularTotal - pkg.price;
    return {
      amount: Math.round(savings * 100) / 100,
      percentage: Math.round((savings / regularTotal) * 100),
    };
  },

  /**
   * Format pass status for display
   */
  formatStatus: (
    status: CustomerDaycarePass["status"]
  ): { label: string; color: "success" | "warning" | "error" | "default" } => {
    switch (status) {
      case "ACTIVE":
        return { label: "Active", color: "success" };
      case "EXHAUSTED":
        return { label: "Used Up", color: "default" };
      case "EXPIRED":
        return { label: "Expired", color: "error" };
      case "CANCELLED":
        return { label: "Cancelled", color: "warning" };
      default:
        return { label: status, color: "default" };
    }
  },

  /**
   * Check if a pass is expiring soon (within 30 days)
   */
  isExpiringSoon: (pass: CustomerDaycarePass): boolean => {
    const daysUntilExpiry = Math.ceil(
      (new Date(pass.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  },

  /**
   * Get days until expiration
   */
  getDaysUntilExpiry: (pass: CustomerDaycarePass): number => {
    return Math.ceil(
      (new Date(pass.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  },
};
