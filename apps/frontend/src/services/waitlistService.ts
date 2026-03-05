/**
 * Waitlist Service
 * 
 * Frontend service for waitlist operations
 */

import api from './api';

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  customerId: string;
  petId: string;
  serviceType: 'BOARDING' | 'DAYCARE' | 'GROOMING' | 'TRAINING';
  requestedStartDate: string;
  requestedEndDate?: string;
  requestedTime?: string;
  flexibleDates: boolean;
  dateFlexibilityDays?: number;
  serviceId?: string;
  resourceId?: string;
  groomerId?: string;
  classId?: string;
  preferences: {
    suiteType?: string[];
    groomerPreference?: string;
    timePreference?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  };
  status: 'ACTIVE' | 'NOTIFIED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  priority: string;
  position: number;
  notes?: string;
  customerNotes?: string;
  notificationsSent: number;
  lastNotifiedAt?: string;
  convertedToReservationId?: string;
  convertedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  pet?: {
    id: string;
    name: string;
    type: string;
    breed?: string;
  };
  service?: {
    id: string;
    name: string;
  };
  resource?: {
    id: string;
    name: string;
  };
}

export interface AddToWaitlistRequest {
  customerId: string;
  petId: string;
  serviceType: 'BOARDING' | 'DAYCARE' | 'GROOMING' | 'TRAINING';
  requestedStartDate: string;
  requestedEndDate?: string;
  requestedTime?: string;
  flexibleDates?: boolean;
  dateFlexibilityDays?: number;
  serviceId?: string;
  resourceId?: string;
  groomerId?: string;
  classId?: string;
  preferences?: {
    suiteType?: string[];
    groomerPreference?: string;
    timePreference?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  };
  customerNotes?: string;
}

export interface WaitlistPosition {
  position: number;
  totalInQueue: number;
  status: string;
  estimatedWaitTime: string;
}

export interface WaitlistSummary {
  entries: WaitlistEntry[];
  grouped: Record<string, WaitlistEntry[]>;
  summary: {
    total: number;
    byServiceType: Array<{
      serviceType: string;
      count: number;
    }>;
  };
}

class WaitlistService {
  /**
   * Add customer to waitlist
   */
  async addToWaitlist(data: AddToWaitlistRequest): Promise<WaitlistEntry> {
    const response = await api.post('/api/waitlist', data);
    return response.data.data;
  }

  /**
   * Get customer's waitlist entries
   */
  async getMyEntries(customerId: string): Promise<WaitlistEntry[]> {
    const response = await api.get('/api/waitlist/my-entries', {
      params: { customerId }
    });
    return response.data.data;
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(id: string): Promise<void> {
    await api.delete(`/api/waitlist/${id}`);
  }

  /**
   * Get waitlist position
   */
  async getPosition(id: string): Promise<WaitlistPosition> {
    const response = await api.get(`/api/waitlist/${id}/position`);
    return response.data.data;
  }

  /**
   * List all waitlist entries (staff only)
   */
  async listEntries(filters?: {
    serviceType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WaitlistSummary> {
    const response = await api.get('/api/waitlist', { params: filters });
    return response.data.data;
  }

  /**
   * Update waitlist entry (staff only)
   */
  async updateEntry(id: string, data: {
    notes?: string;
    status?: string;
    position?: number;
  }): Promise<WaitlistEntry> {
    const response = await api.patch(`/api/waitlist/${id}`, data);
    return response.data.data;
  }

  /**
   * Convert waitlist entry to reservation (staff only)
   */
  async convertToReservation(id: string, reservationId: string): Promise<WaitlistEntry> {
    const response = await api.post(`/api/waitlist/${id}/convert`, { reservationId });
    return response.data.data;
  }

  /**
   * Check availability and notify waitlist (staff only)
   */
  async checkAvailability(data: {
    serviceType: string;
    startDate: string;
    endDate?: string;
    resourceId?: string;
  }): Promise<{
    matchingEntries: number;
    notified: number;
    notifications: any[];
  }> {
    const response = await api.post('/api/waitlist/check-availability', data);
    return response.data.data;
  }

  /**
   * Format service type for display
   */
  formatServiceType(serviceType: string): string {
    const map: Record<string, string> = {
      BOARDING: 'Boarding',
      DAYCARE: 'Daycare',
      GROOMING: 'Grooming',
      TRAINING: 'Training'
    };
    return map[serviceType] || serviceType;
  }

  /**
   * Format status for display
   */
  formatStatus(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'Active',
      NOTIFIED: 'Notified',
      CONVERTED: 'Converted',
      EXPIRED: 'Expired',
      CANCELLED: 'Cancelled'
    };
    return map[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      ACTIVE: 'info',
      NOTIFIED: 'warning',
      CONVERTED: 'success',
      EXPIRED: 'default',
      CANCELLED: 'error'
    };
    return map[status] || 'default';
  }
}

export const waitlistService = new WaitlistService();
export default waitlistService;
