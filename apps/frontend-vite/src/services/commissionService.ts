/**
 * Commission Service
 * Handles API calls for staff commission management
 */

import api from './api';

export interface StaffCommission {
  id: string;
  tenantId: string;
  staffId: string;
  name: string;
  commissionType: 'PERCENTAGE' | 'FLAT_AMOUNT';
  commissionValue: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  serviceCommissions: { id: string; serviceId: string }[];
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
  };
}

export interface CreateCommissionData {
  staffId: string;
  name: string;
  commissionType: 'PERCENTAGE' | 'FLAT_AMOUNT';
  commissionValue: number;
  serviceIds: string[];
  notes?: string;
}

export interface UpdateCommissionData {
  name?: string;
  commissionType?: 'PERCENTAGE' | 'FLAT_AMOUNT';
  commissionValue?: number;
  serviceIds?: string[];
  isActive?: boolean;
  notes?: string;
}

export interface CommissionCalculation {
  hasCommission: boolean;
  commissionId?: string;
  commissionName?: string;
  commissionType?: 'PERCENTAGE' | 'FLAT_AMOUNT';
  commissionValue?: number;
  serviceAmount?: number;
  commissionAmount: number;
}

export interface CommissionReportDetail {
  reservationId: string;
  serviceName: string;
  serviceAmount: number;
  commissionName: string;
  commissionType: 'PERCENTAGE' | 'FLAT_AMOUNT';
  commissionValue: number;
  commissionAmount: number;
  completedDate: string;
}

export interface CommissionReport {
  staffId: string;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  totalCommission: number;
  reservationCount: number;
  commissionDetails: CommissionReportDetail[];
}

export const commissionService = {
  /**
   * Get all commissions for a tenant
   */
  getAllCommissions: async (isActive?: boolean): Promise<StaffCommission[]> => {
    const params = isActive !== undefined ? { isActive } : {};
    const response = await api.get('/api/commissions', { params });
    return response.data?.data || [];
  },

  /**
   * Get commissions for a specific staff member
   */
  getStaffCommissions: async (staffId: string): Promise<StaffCommission[]> => {
    const response = await api.get(`/api/commissions/staff/${staffId}`);
    return response.data?.data || [];
  },

  /**
   * Get a single commission by ID
   */
  getCommissionById: async (id: string): Promise<StaffCommission> => {
    const response = await api.get(`/api/commissions/${id}`);
    return response.data?.data;
  },

  /**
   * Create a new commission
   */
  createCommission: async (
    data: CreateCommissionData
  ): Promise<StaffCommission> => {
    const response = await api.post('/api/commissions', data);
    return response.data?.data;
  },

  /**
   * Update a commission
   */
  updateCommission: async (
    id: string,
    data: UpdateCommissionData
  ): Promise<StaffCommission> => {
    const response = await api.put(`/api/commissions/${id}`, data);
    return response.data?.data;
  },

  /**
   * Delete a commission
   */
  deleteCommission: async (id: string): Promise<void> => {
    await api.delete(`/api/commissions/${id}`);
  },

  /**
   * Calculate commission for a service
   */
  calculateCommission: async (
    staffId: string,
    serviceId: string,
    serviceAmount: number
  ): Promise<CommissionCalculation> => {
    const response = await api.post('/api/commissions/calculate', {
      staffId,
      serviceId,
      serviceAmount,
    });
    return response.data?.data;
  },

  /**
   * Get commission report for a staff member
   */
  getCommissionReport: async (
    staffId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CommissionReport> => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get(`/api/commissions/staff/${staffId}/report`, {
      params,
    });
    return response.data?.data;
  },

  /**
   * Format commission value for display
   */
  formatCommissionValue: (commission: StaffCommission): string => {
    if (commission.commissionType === 'PERCENTAGE') {
      return `${commission.commissionValue}%`;
    }
    return `$${commission.commissionValue.toFixed(2)}`;
  },
};

export default commissionService;
