/**
 * Standing Reservation Service
 * Handles API calls for recurring reservation templates
 */

import api from './api';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface StandingReservation {
  id: string;
  tenantId: string;
  customerId: string;
  petId: string;
  serviceId: string;
  resourceId?: string;
  staffAssignedId?: string;
  name: string;
  frequency: RecurrenceFrequency;
  daysOfWeek: number[];
  dayOfMonth?: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  notes?: string;
  isActive: boolean;
  autoConfirm: boolean;
  generateAheadDays: number;
  lastGeneratedDate?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  pet?: {
    id: string;
    name: string;
    type?: string;
    breed?: string;
  };
  service?: {
    id: string;
    name: string;
    price: number;
    serviceCategory?: string;
  };
  resource?: {
    id: string;
    name: string;
    type?: string;
  };
  staffAssigned?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  generatedReservations?: StandingReservationInstance[];
  _count?: {
    generatedReservations: number;
  };
}

export interface StandingReservationInstance {
  id: string;
  tenantId: string;
  standingReservationId: string;
  reservationId?: string;
  scheduledDate: string;
  status: 'PENDING' | 'GENERATED' | 'SKIPPED' | 'CANCELLED';
  skipReason?: string;
  createdAt: string;
}

export interface CreateStandingReservationData {
  customerId: string;
  petId: string;
  serviceId: string;
  resourceId?: string;
  staffAssignedId?: string;
  name: string;
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  notes?: string;
  autoConfirm?: boolean;
  generateAheadDays?: number;
}

export interface UpdateStandingReservationData {
  name?: string;
  frequency?: RecurrenceFrequency;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  startTime?: string;
  endTime?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  notes?: string;
  isActive?: boolean;
  autoConfirm?: boolean;
  generateAheadDays?: number;
  resourceId?: string;
  staffAssignedId?: string;
}

export const standingReservationService = {
  /**
   * Get all standing reservations
   */
  getAll: async (params?: {
    customerId?: string;
    isActive?: boolean;
  }): Promise<StandingReservation[]> => {
    const response = await api.get('/api/standing-reservations', { params });
    return response.data?.data || [];
  },

  /**
   * Get standing reservations for a customer
   */
  getByCustomer: async (customerId: string): Promise<StandingReservation[]> => {
    const response = await api.get(
      `/api/standing-reservations/customer/${customerId}`
    );
    return response.data?.data || [];
  },

  /**
   * Get a single standing reservation
   */
  getById: async (id: string): Promise<StandingReservation> => {
    const response = await api.get(`/api/standing-reservations/${id}`);
    return response.data?.data;
  },

  /**
   * Create a standing reservation
   */
  create: async (
    data: CreateStandingReservationData
  ): Promise<StandingReservation> => {
    const response = await api.post('/api/standing-reservations', data);
    return response.data?.data;
  },

  /**
   * Update a standing reservation
   */
  update: async (
    id: string,
    data: UpdateStandingReservationData
  ): Promise<StandingReservation> => {
    const response = await api.put(`/api/standing-reservations/${id}`, data);
    return response.data?.data;
  },

  /**
   * Delete a standing reservation
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/standing-reservations/${id}`);
  },

  /**
   * Generate reservations from template
   */
  generateReservations: async (
    id: string,
    untilDate?: string
  ): Promise<{
    generatedCount: number;
    instances: StandingReservationInstance[];
  }> => {
    const response = await api.post(
      `/api/standing-reservations/${id}/generate`,
      { untilDate }
    );
    return response.data?.data;
  },

  /**
   * Get upcoming instances
   */
  getUpcomingInstances: async (
    id: string,
    limit?: number
  ): Promise<StandingReservationInstance[]> => {
    const response = await api.get(
      `/api/standing-reservations/${id}/instances`,
      { params: { limit } }
    );
    return response.data?.data || [];
  },

  /**
   * Skip an instance
   */
  skipInstance: async (
    standingReservationId: string,
    instanceId: string,
    reason?: string
  ): Promise<StandingReservationInstance> => {
    const response = await api.post(
      `/api/standing-reservations/${standingReservationId}/instances/${instanceId}/skip`,
      { reason }
    );
    return response.data?.data;
  },

  /**
   * Format frequency for display
   */
  formatFrequency: (
    frequency: RecurrenceFrequency,
    daysOfWeek?: number[],
    dayOfMonth?: number
  ): string => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    switch (frequency) {
      case 'DAILY':
        return 'Daily';
      case 'WEEKLY':
        if (daysOfWeek && daysOfWeek.length > 0) {
          return `Weekly on ${daysOfWeek.map((d) => dayNames[d]).join(', ')}`;
        }
        return 'Weekly';
      case 'BIWEEKLY':
        if (daysOfWeek && daysOfWeek.length > 0) {
          return `Every 2 weeks on ${daysOfWeek
            .map((d) => dayNames[d])
            .join(', ')}`;
        }
        return 'Every 2 weeks';
      case 'MONTHLY':
        if (dayOfMonth) {
          const suffix =
            dayOfMonth === 1
              ? 'st'
              : dayOfMonth === 2
                ? 'nd'
                : dayOfMonth === 3
                  ? 'rd'
                  : 'th';
          return `Monthly on the ${dayOfMonth}${suffix}`;
        }
        return 'Monthly';
      default:
        return frequency;
    }
  },
};

export default standingReservationService;
