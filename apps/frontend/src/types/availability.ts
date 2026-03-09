/**
 * Real-Time Availability Types
 * 
 * Types for checking and displaying availability of:
 * - Suites/kennels
 * - Services
 * - Staff
 * - Time slots
 */

export type AvailabilityStatus = 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'UNAVAILABLE' | 'WAITLIST';

export interface DateAvailability {
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  availableCount: number;
  totalCount: number;
  availableSuites: string[]; // Suite IDs
  price?: number; // Dynamic pricing
  surcharge?: number;
}

export interface SuiteAvailability {
  suiteId: string;
  suiteName: string;
  suiteType: string;
  capacity: number;
  isAvailable: boolean;
  conflictingReservations?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    petName: string;
  }>;
  nextAvailableDate?: string;
}

export interface ServiceAvailability {
  serviceId: string;
  serviceName: string;
  isAvailable: boolean;
  availableSlots: number;
  totalSlots: number;
  requiredStaff: number;
  availableStaff: number;
  restrictions?: string[];
}

export interface StaffAvailability {
  staffId: string;
  staffName: string;
  isAvailable: boolean;
  assignedReservations: number;
  maxCapacity: number;
  skills: string[];
}

export interface AvailabilityCheckRequest {
  startDate: string;
  endDate: string;
  serviceId?: string;
  suiteType?: string;
  numberOfPets?: number;
  petSizes?: string[];
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  status: AvailabilityStatus;
  message: string;
  availableSuites: SuiteAvailability[];
  alternativeDates?: DateAvailability[];
  waitlistAvailable: boolean;
  estimatedWaitTime?: number; // in days
  suggestions?: string[];
}

export interface AvailabilityCalendar {
  month: number;
  year: number;
  dates: DateAvailability[];
  summary: {
    totalDays: number;
    availableDays: number;
    partiallyAvailableDays: number;
    unavailableDays: number;
  };
}

export interface AlternativeDateSuggestion {
  startDate: string;
  endDate: string;
  availableCount: number;
  price: number;
  savings?: number; // Compared to requested dates
  reason: string; // Why this is suggested
}

export interface WaitlistEntry {
  id: string;
  customerId: string;
  serviceId: string;
  requestedStartDate: string;
  requestedEndDate: string;
  numberOfPets: number;
  priority: number;
  status: 'PENDING' | 'NOTIFIED' | 'EXPIRED' | 'FULFILLED';
  createdAt: Date | string;
  expiresAt: Date | string;
  notifiedAt?: Date | string;
}

export interface WaitlistRequest {
  customerId: string;
  serviceId: string;
  requestedStartDate: string;
  requestedEndDate: string;
  numberOfPets: number;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
}

export interface CapacityInfo {
  date: string;
  totalCapacity: number;
  bookedCapacity: number;
  availableCapacity: number;
  utilizationPercentage: number;
  isAtCapacity: boolean;
}

export interface TimeSlotAvailability {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
  availableSlots: number;
  bookedSlots: number;
  price: number;
}

export interface AvailabilityFilters {
  serviceIds?: string[];
  suiteTypes?: string[];
  minCapacity?: number;
  maxPrice?: number;
  requiresStaff?: boolean;
  petSizes?: string[];
}
