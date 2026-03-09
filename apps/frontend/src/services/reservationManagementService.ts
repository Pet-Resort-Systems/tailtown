/**
 * Reservation Management Service
 * 
 * Customer-facing reservation management operations:
 * - View reservations
 * - Modify reservations
 * - Cancel reservations
 * - Track modification history
 * - Calculate refunds
 */

import { customerApi } from './api';
import {
  ReservationSummary,
  CustomerReservationDashboard,
  ReservationDetails,
  ModifyReservationRequest,
  ModifyReservationResult,
  CancellationRequest,
  CancellationResult,
  CancellationPolicy,
  ReservationModification,
  ModificationConstraints,
  PriceAdjustment,
  RefundRequest
} from '../types/reservationManagement';
import { Reservation } from './reservationService';

export const reservationManagementService = {
  /**
   * Get customer's reservation dashboard
   * Returns upcoming, past, and cancelled reservations
   */
  getCustomerDashboard: async (customerId: string): Promise<CustomerReservationDashboard> => {
    const response = await customerApi.get(`/api/customers/${customerId}/reservations/dashboard`);
    return response.data;
  },

  /**
   * Get customer's reservations with filtering
   */
  getCustomerReservations: async (
    customerId: string,
    filter: 'ALL' | 'UPCOMING' | 'PAST' | 'CANCELLED' = 'ALL'
  ): Promise<ReservationSummary[]> => {
    const response = await customerApi.get(`/api/customers/${customerId}/reservations`, {
      params: { filter }
    });
    return response.data;
  },

  /**
   * Get detailed reservation information including modification history
   */
  getReservationDetails: async (reservationId: string): Promise<ReservationDetails> => {
    const response = await customerApi.get(`/api/reservations/${reservationId}/details`);
    return response.data;
  },

  /**
   * Get modification history for a reservation
   */
  getModificationHistory: async (reservationId: string): Promise<ReservationModification[]> => {
    const response = await customerApi.get(`/api/reservations/${reservationId}/modifications`);
    return response.data;
  },

  /**
   * Check if reservation can be modified
   * Returns constraints and eligibility
   */
  checkModificationEligibility: async (
    reservationId: string
  ): Promise<ModificationConstraints> => {
    const response = await customerApi.get(`/api/reservations/${reservationId}/can-modify`);
    return response.data;
  },

  /**
   * Modify a reservation
   * 
   * Business Logic:
   * 1. Validate modification is allowed (timing, status)
   * 2. Check availability for new dates/services
   * 3. Calculate price difference
   * 4. Create modification record
   * 5. Update reservation
   * 6. Process payment/refund if needed
   */
  modifyReservation: async (
    request: ModifyReservationRequest
  ): Promise<ModifyReservationResult> => {
    const response = await customerApi.put(
      `/api/reservations/${request.reservationId}/modify`,
      request
    );
    return response.data;
  },

  /**
   * Preview modification without committing
   * Shows price changes and availability
   */
  previewModification: async (
    request: ModifyReservationRequest
  ): Promise<{
    isAvailable: boolean;
    priceAdjustment: PriceAdjustment;
    warnings: string[];
  }> => {
    const response = await customerApi.post(
      `/api/reservations/${request.reservationId}/preview-modification`,
      request
    );
    return response.data;
  },

  /**
   * Get applicable cancellation policy
   */
  getCancellationPolicy: async (reservationId: string): Promise<CancellationPolicy> => {
    const response = await customerApi.get(`/api/reservations/${reservationId}/cancellation-policy`);
    return response.data;
  },

  /**
   * Calculate refund amount for cancellation
   */
  calculateRefund: async (
    reservationId: string
  ): Promise<{ refundAmount: number; refundPercentage: number; policy: CancellationPolicy }> => {
    const response = await customerApi.get(`/api/reservations/${reservationId}/calculate-refund`);
    return response.data;
  },

  /**
   * Cancel a reservation
   * 
   * Business Logic:
   * 1. Validate cancellation is allowed
   * 2. Apply cancellation policy
   * 3. Calculate refund amount
   * 4. Update reservation status
   * 5. Create refund request
   * 6. Send notifications
   */
  cancelReservation: async (request: CancellationRequest): Promise<CancellationResult> => {
    const response = await customerApi.post('/api/reservations/cancel', request);
    return response.data;
  },

  /**
   * Get refund requests for a customer
   */
  getCustomerRefunds: async (customerId: string): Promise<RefundRequest[]> => {
    const response = await customerApi.get(`/api/customers/${customerId}/refunds`);
    return response.data;
  },

  /**
   * Add a pet to an existing reservation
   */
  addPetToReservation: async (
    reservationId: string,
    petId: string
  ): Promise<ModifyReservationResult> => {
    const response = await customerApi.post(`/api/reservations/${reservationId}/add-pet`, {
      petId
    });
    return response.data;
  },

  /**
   * Remove a pet from a reservation
   */
  removePetFromReservation: async (
    reservationId: string,
    petId: string
  ): Promise<ModifyReservationResult> => {
    const response = await customerApi.post(`/api/reservations/${reservationId}/remove-pet`, {
      petId
    });
    return response.data;
  },

  /**
   * Add an add-on service to a reservation
   */
  addAddOnToReservation: async (
    reservationId: string,
    addOnId: string,
    quantity: number = 1
  ): Promise<ModifyReservationResult> => {
    const response = await customerApi.post(`/api/reservations/${reservationId}/add-addon`, {
      addOnId,
      quantity
    });
    return response.data;
  },

  /**
   * Remove an add-on service from a reservation
   */
  removeAddOnFromReservation: async (
    reservationId: string,
    addOnServiceId: string
  ): Promise<ModifyReservationResult> => {
    const response = await customerApi.delete(
      `/api/reservations/${reservationId}/addons/${addOnServiceId}`
    );
    return response.data;
  },

  /**
   * Update reservation notes (customer-facing notes)
   */
  updateReservationNotes: async (
    reservationId: string,
    notes: string
  ): Promise<Reservation> => {
    const response = await customerApi.patch(`/api/reservations/${reservationId}/notes`, {
      notes
    });
    return response.data;
  },

  /**
   * CLIENT-SIDE: Calculate days until check-in
   */
  getDaysUntilCheckIn: (startDate: string | Date): number => {
    const checkIn = new Date(startDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    checkIn.setHours(0, 0, 0, 0);
    
    const diffTime = checkIn.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },

  /**
   * CLIENT-SIDE: Check if reservation can be modified
   */
  canModifyReservation: (reservation: Reservation): boolean => {
    // Can't modify if cancelled or completed
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status)) {
      return false;
    }

    // Can't modify if checked in or checked out
    if (['CHECKED_IN', 'CHECKED_OUT'].includes(reservation.status)) {
      return false;
    }

    // Can't modify if check-in is within 24 hours
    const daysUntil = reservationManagementService.getDaysUntilCheckIn(reservation.startDate);
    if (daysUntil < 1) {
      return false;
    }

    return true;
  },

  /**
   * CLIENT-SIDE: Check if reservation can be cancelled
   */
  canCancelReservation: (reservation: Reservation): boolean => {
    // Can't cancel if already cancelled or completed
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status)) {
      return false;
    }

    // Can't cancel if checked in or checked out
    if (['CHECKED_IN', 'CHECKED_OUT'].includes(reservation.status)) {
      return false;
    }

    return true;
  },

  /**
   * CLIENT-SIDE: Calculate refund percentage based on days until check-in
   * Default policy: 
   * - 7+ days: 100% refund
   * - 3-6 days: 50% refund
   * - 1-2 days: 25% refund
   * - < 1 day: No refund
   */
  calculateRefundPercentage: (daysUntilCheckIn: number): number => {
    if (daysUntilCheckIn >= 7) return 100;
    if (daysUntilCheckIn >= 3) return 50;
    if (daysUntilCheckIn >= 1) return 25;
    return 0;
  },

  /**
   * CLIENT-SIDE: Format modification type for display
   */
  formatModificationType: (type: string): string => {
    const labels: Record<string, string> = {
      DATE_CHANGE: 'Date Changed',
      PET_ADDED: 'Pet Added',
      PET_REMOVED: 'Pet Removed',
      ADDON_ADDED: 'Add-on Added',
      ADDON_REMOVED: 'Add-on Removed',
      SERVICE_CHANGE: 'Service Changed',
      NOTES_UPDATED: 'Notes Updated',
      CANCELLED: 'Cancelled'
    };
    return labels[type] || type;
  },

  /**
   * CLIENT-SIDE: Get status color for UI
   */
  getStatusColor: (
    status: Reservation['status']
  ): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    const colors: Record<Reservation['status'], any> = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      CHECKED_IN: 'info',
      CHECKED_OUT: 'primary',
      CANCELLED: 'error',
      COMPLETED: 'default',
      NO_SHOW: 'error'
    };
    return colors[status] || 'default';
  },

  /**
   * CLIENT-SIDE: Get status label for display
   */
  getStatusLabel: (status: Reservation['status']): string => {
    const labels: Record<Reservation['status'], string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      CHECKED_IN: 'Checked In',
      CHECKED_OUT: 'Checked Out',
      CANCELLED: 'Cancelled',
      COMPLETED: 'Completed',
      NO_SHOW: 'No Show'
    };
    return labels[status] || status;
  }
};
