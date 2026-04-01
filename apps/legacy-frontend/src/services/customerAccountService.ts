/**
 * Customer Account Service
 *
 * API calls for customer-facing account features:
 * - View reservations (upcoming/past)
 * - Update pet information
 * - View/purchase daycare passes
 * - View account balance
 */

import api from './api';

export interface CustomerReservation {
  id: string;
  orderNumber?: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  service?: {
    id: string;
    name: string;
    category?: string;
  };
  pet?: {
    id: string;
    name: string;
    breed?: string;
  };
  resource?: {
    id: string;
    name: string;
    type?: string;
  };
  notes?: string;
  createdAt: string;
}

export interface CustomerPet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  color?: string;
  weight?: number;
  birthDate?: string;
  gender?: string;
  isActive: boolean;
  notes?: string;
  feedingInstructions?: string;
  medicationInstructions?: string;
  vaccinations?: any[];
  photoUrl?: string;
}

export interface DaycarePass {
  id: string;
  name: string;
  totalDays: number;
  remainingDays: number;
  expiresAt?: string;
  purchasedAt: string;
  price: number;
  status: 'ACTIVE' | 'EXPIRED' | 'USED';
}

export interface DaycarePassType {
  id: string;
  name: string;
  days: number;
  price: number;
  validityDays: number;
  description?: string;
}

export interface AccountBalance {
  balance: number;
  pendingCharges: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  dueDate: string;
  createdAt: string;
  items?: {
    description: string;
    amount: number;
  }[];
}

export const customerAccountService = {
  /**
   * Get customer's upcoming reservations
   */
  async getUpcomingReservations(
    customerId: string
  ): Promise<CustomerReservation[]> {
    const response = await api.get(
      `/reservations/customer/${customerId}/upcoming`
    );
    return response.data.data || response.data || [];
  },

  /**
   * Get customer's past reservations
   */
  async getPastReservations(
    customerId: string,
    limit: number = 20
  ): Promise<CustomerReservation[]> {
    const response = await api.get(
      `/reservations/customer/${customerId}/past?limit=${limit}`
    );
    return response.data.data || response.data || [];
  },

  /**
   * Get customer's pets
   */
  async getCustomerPets(customerId: string): Promise<CustomerPet[]> {
    const response = await api.get(`/pets/customer/${customerId}`);
    return response.data.data || response.data || [];
  },

  /**
   * Update pet information
   */
  async updatePet(
    petId: string,
    data: Partial<CustomerPet>
  ): Promise<CustomerPet> {
    const response = await api.put(`/pets/${petId}`, data);
    return response.data.data || response.data;
  },

  /**
   * Add a new pet
   */
  async addPet(
    customerId: string,
    data: Partial<CustomerPet>
  ): Promise<CustomerPet> {
    const response = await api.post('/pets', { ...data, customerId });
    return response.data.data || response.data;
  },

  /**
   * Get customer's daycare passes
   */
  async getDaycarePasses(customerId: string): Promise<DaycarePass[]> {
    const response = await api.get(`/daycare-passes/customer/${customerId}`);
    return response.data.data || response.data || [];
  },

  /**
   * Get available daycare pass types for purchase
   */
  async getAvailablePassTypes(): Promise<DaycarePassType[]> {
    const response = await api.get('/daycare-passes/types');
    return response.data.data || response.data || [];
  },

  /**
   * Purchase a daycare pass
   */
  async purchaseDaycarePass(
    customerId: string,
    passTypeId: string,
    paymentMethod?: any
  ): Promise<DaycarePass> {
    const response = await api.post('/daycare-passes/purchase', {
      customerId,
      passTypeId,
      paymentMethod,
    });
    return response.data.data || response.data;
  },

  /**
   * Get customer's account balance
   */
  async getAccountBalance(customerId: string): Promise<AccountBalance> {
    const response = await api.get(`/customers/${customerId}/balance`);
    return (
      response.data.data || response.data || { balance: 0, pendingCharges: 0 }
    );
  },

  /**
   * Get customer's invoices
   */
  async getInvoices(customerId: string, status?: string): Promise<Invoice[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/invoices/customer/${customerId}${params}`);
    return response.data.data || response.data || [];
  },

  /**
   * Cancel a reservation (if allowed)
   */
  async cancelReservation(
    reservationId: string,
    reason?: string
  ): Promise<void> {
    await api.post(`/reservations/${reservationId}/cancel`, { reason });
  },

  /**
   * Update customer profile
   */
  async updateProfile(customerId: string, data: any): Promise<any> {
    const response = await api.put(`/customers/${customerId}`, data);
    return response.data.data || response.data;
  },
};

export default customerAccountService;
