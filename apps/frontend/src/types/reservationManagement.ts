/**
 * Reservation Management Types
 * 
 * Types for customer-facing reservation management including:
 * - Viewing reservations
 * - Modifying reservations
 * - Cancellation policies
 * - Refund processing
 * - Modification history
 */

import { Reservation } from '../services/reservationService';

export type ReservationFilter = 'ALL' | 'UPCOMING' | 'PAST' | 'CANCELLED';

export type ModificationType = 
  | 'DATE_CHANGE'
  | 'PET_ADDED'
  | 'PET_REMOVED'
  | 'ADDON_ADDED'
  | 'ADDON_REMOVED'
  | 'SERVICE_CHANGE'
  | 'NOTES_UPDATED'
  | 'CANCELLED';

export type CancellationReason =
  | 'SCHEDULE_CONFLICT'
  | 'PET_HEALTH'
  | 'TRAVEL_CANCELLED'
  | 'FOUND_ALTERNATIVE'
  | 'PRICE_CONCERN'
  | 'OTHER';

export type RefundStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSED'
  | 'DECLINED'
  | 'PARTIAL';

export interface ReservationModification {
  id: string;
  reservationId: string;
  modificationType: ModificationType;
  modifiedBy: 'CUSTOMER' | 'STAFF';
  modifiedAt: Date | string;
  previousValue?: any;
  newValue?: any;
  notes?: string;
  staffMemberId?: string;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  daysBeforeCheckIn: number;
  refundPercentage: number; // 0-100
  isActive: boolean;
}

export interface CancellationRequest {
  reservationId: string;
  reason: CancellationReason;
  reasonDetails?: string;
  requestedBy: string; // Customer ID
  requestedAt: Date | string;
}

export interface CancellationResult {
  success: boolean;
  reservationId: string;
  cancelledAt: Date | string;
  refundAmount: number;
  refundPercentage: number;
  policyApplied: CancellationPolicy;
  refundStatus: RefundStatus;
  message: string;
}

export interface RefundRequest {
  id: string;
  reservationId: string;
  customerId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedAt: Date | string;
  processedAt?: Date | string;
  processedBy?: string;
  notes?: string;
}

export interface ModifyReservationRequest {
  reservationId: string;
  modifications: {
    startDate?: string;
    endDate?: string;
    petIds?: string[]; // For multi-pet reservations
    addOnServiceIds?: string[];
    notes?: string;
  };
  reason?: string;
}

export interface ModifyReservationResult {
  success: boolean;
  reservation: Reservation;
  modifications: ReservationModification[];
  priceDifference: number; // Positive = customer owes, Negative = refund due
  message: string;
}

export interface ReservationSummary {
  id: string;
  orderNumber?: string;
  startDate: string;
  endDate: string;
  status: Reservation['status'];
  petName: string;
  serviceName: string;
  totalPrice: number;
  canModify: boolean;
  canCancel: boolean;
  daysUntilCheckIn: number;
}

export interface CustomerReservationDashboard {
  upcoming: ReservationSummary[];
  past: ReservationSummary[];
  cancelled: ReservationSummary[];
  totalSpent: number;
  totalReservations: number;
  upcomingCount: number;
}

export interface ReservationDetails extends Reservation {
  modificationHistory: ReservationModification[];
  cancellationPolicy: CancellationPolicy;
  canModify: boolean;
  canCancel: boolean;
  refundAmount: number; // If cancelled now
  refundPercentage: number;
  daysUntilCheckIn: number;
}

export interface ModificationConstraints {
  canChangeDates: boolean;
  canAddPets: boolean;
  canRemovePets: boolean;
  canAddAddOns: boolean;
  canRemoveAddOns: boolean;
  minDaysBeforeCheckIn: number;
  maxDaysBeforeCheckIn: number;
  reasons: string[];
}

export interface PriceAdjustment {
  originalPrice: number;
  newPrice: number;
  difference: number;
  breakdown: {
    basePrice: number;
    addOns: number;
    discount: number;
    tax: number;
  };
}
