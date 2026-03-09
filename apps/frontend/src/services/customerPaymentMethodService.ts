/**
 * Customer Payment Method Service
 * Handles API calls for saved cards on file
 */

const API_BASE = "/api/customers";

export interface SavedPaymentMethod {
  id: string;
  cardBrand: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName?: string;
  isDefault: boolean;
  nickname?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface CreatePaymentMethodData {
  token: string;
  cardBrand: string;
  lastFour: string;
  expiryMonth: number | string;
  expiryYear: number | string;
  cardholderName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  nickname?: string;
  setAsDefault?: boolean;
}

export interface ChargePaymentMethodData {
  amount: number;
  invoiceId?: string;
  orderId?: string;
  description?: string;
}

const getHeaders = () => ({
  "Content-Type": "application/json",
  "x-tenant-id": localStorage.getItem("tailtown_tenant_id") || "dev",
});

export const customerPaymentMethodService = {
  /**
   * Get all saved payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<SavedPaymentMethod[]> {
    const response = await fetch(`${API_BASE}/${customerId}/payment-methods`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch payment methods");
    }

    const data = await response.json();
    return data.data || [];
  },

  /**
   * Get the default payment method for a customer
   */
  async getDefaultPaymentMethod(
    customerId: string
  ): Promise<SavedPaymentMethod | null> {
    const response = await fetch(
      `${API_BASE}/${customerId}/payment-methods/default`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch default payment method");
    }

    const data = await response.json();
    return data.data || null;
  },

  /**
   * Save a new payment method (card on file)
   */
  async createPaymentMethod(
    customerId: string,
    paymentData: CreatePaymentMethodData
  ): Promise<SavedPaymentMethod> {
    const response = await fetch(`${API_BASE}/${customerId}/payment-methods`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save payment method");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Update a saved payment method (nickname, default status)
   */
  async updatePaymentMethod(
    customerId: string,
    methodId: string,
    updates: { nickname?: string; setAsDefault?: boolean }
  ): Promise<SavedPaymentMethod> {
    const response = await fetch(
      `${API_BASE}/${customerId}/payment-methods/${methodId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update payment method");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Delete a saved payment method
   */
  async deletePaymentMethod(
    customerId: string,
    methodId: string
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE}/${customerId}/payment-methods/${methodId}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete payment method");
    }
  },

  /**
   * Charge a saved payment method
   */
  async chargePaymentMethod(
    customerId: string,
    methodId: string,
    chargeData: ChargePaymentMethodData
  ): Promise<{
    transactionId: string;
    amount: number;
    cardBrand: string;
    lastFour: string;
  }> {
    const response = await fetch(
      `${API_BASE}/${customerId}/payment-methods/${methodId}/charge`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(chargeData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Payment failed");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Helper: Format card brand for display
   */
  formatCardBrand(brand: string): string {
    const brands: Record<string, string> = {
      VISA: "Visa",
      MASTERCARD: "Mastercard",
      AMEX: "American Express",
      DISCOVER: "Discover",
      DINERS: "Diners Club",
      JCB: "JCB",
    };
    return brands[brand.toUpperCase()] || brand;
  },

  /**
   * Helper: Format expiry date for display
   */
  formatExpiry(month: number, year: number): string {
    return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
  },

  /**
   * Helper: Check if card is expired
   */
  isExpired(month: number, year: number): boolean {
    const now = new Date();
    const expiryDate = new Date(year, month, 0); // Last day of expiry month
    return expiryDate < now;
  },

  /**
   * Helper: Get card icon name based on brand
   */
  getCardIcon(brand: string): string {
    const icons: Record<string, string> = {
      VISA: "visa",
      MASTERCARD: "mastercard",
      AMEX: "amex",
      DISCOVER: "discover",
    };
    return icons[brand.toUpperCase()] || "credit-card";
  },
};

export default customerPaymentMethodService;
