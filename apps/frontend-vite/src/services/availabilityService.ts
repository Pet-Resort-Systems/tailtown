/**
 * Availability Service
 * 
 * Real-time availability checking for:
 * - Suites/kennels
 * - Services
 * - Staff
 * - Time slots
 * 
 * Prevents double-bookings and provides instant feedback
 */

import { customerApi } from './api';
import {
  AvailabilityCheckRequest,
  AvailabilityCheckResult,
  AvailabilityCalendar,
  DateAvailability,
  SuiteAvailability,
  ServiceAvailability,
  AlternativeDateSuggestion,
  WaitlistEntry,
  WaitlistRequest,
  CapacityInfo,
  TimeSlotAvailability,
  AvailabilityStatus
} from '../types/availability';

export const availabilityService = {
  /**
   * Check availability for a date range
   * Primary method for booking flow
   */
  checkAvailability: async (
    request: AvailabilityCheckRequest
  ): Promise<AvailabilityCheckResult> => {
    const response = await customerApi.post('/api/availability/check', request);
    return response.data;
  },

  /**
   * Get availability calendar for a month
   * Shows availability status for each day
   */
  getAvailabilityCalendar: async (
    year: number,
    month: number,
    serviceId?: string
  ): Promise<AvailabilityCalendar> => {
    const response = await customerApi.get('/api/availability/calendar', {
      params: { year, month, serviceId }
    });
    return response.data;
  },

  /**
   * Get availability for a specific date
   */
  getDateAvailability: async (
    date: string,
    serviceId?: string
  ): Promise<DateAvailability> => {
    const response = await customerApi.get('/api/availability/date', {
      params: { date, serviceId }
    });
    return response.data;
  },

  /**
   * Get suite availability for date range
   */
  getSuiteAvailability: async (
    startDate: string,
    endDate: string,
    suiteType?: string
  ): Promise<SuiteAvailability[]> => {
    const response = await customerApi.get('/api/availability/suites', {
      params: { startDate, endDate, suiteType }
    });
    return response.data;
  },

  /**
   * Get service availability
   */
  getServiceAvailability: async (
    serviceId: string,
    startDate: string,
    endDate: string
  ): Promise<ServiceAvailability> => {
    const response = await customerApi.get(`/api/availability/services/${serviceId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  /**
   * Get alternative date suggestions
   * When requested dates are unavailable
   */
  getAlternativeDates: async (
    request: AvailabilityCheckRequest,
    maxSuggestions: number = 5
  ): Promise<AlternativeDateSuggestion[]> => {
    const response = await customerApi.post('/api/availability/alternatives', {
      ...request,
      maxSuggestions
    });
    return response.data;
  },

  /**
   * Get capacity information for a date range
   */
  getCapacityInfo: async (
    startDate: string,
    endDate: string
  ): Promise<CapacityInfo[]> => {
    const response = await customerApi.get('/api/availability/capacity', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  /**
   * Get time slot availability (for daycare, grooming, etc.)
   */
  getTimeSlotAvailability: async (
    date: string,
    serviceId: string
  ): Promise<TimeSlotAvailability[]> => {
    const response = await customerApi.get('/api/availability/timeslots', {
      params: { date, serviceId }
    });
    return response.data;
  },

  /**
   * Waitlist Management
   */

  /**
   * Join waitlist for unavailable dates
   */
  joinWaitlist: async (request: WaitlistRequest): Promise<WaitlistEntry> => {
    const response = await customerApi.post('/api/waitlist', request);
    return response.data;
  },

  /**
   * Get customer's waitlist entries
   */
  getCustomerWaitlist: async (customerId: string): Promise<WaitlistEntry[]> => {
    const response = await customerApi.get(`/api/customers/${customerId}/waitlist`);
    return response.data;
  },

  /**
   * Cancel waitlist entry
   */
  cancelWaitlistEntry: async (entryId: string): Promise<void> => {
    await customerApi.delete(`/api/waitlist/${entryId}`);
  },

  /**
   * CLIENT-SIDE: Calculate availability status from counts
   */
  calculateAvailabilityStatus: (
    availableCount: number,
    totalCount: number
  ): AvailabilityStatus => {
    if (availableCount === 0) return 'UNAVAILABLE';
    if (availableCount === totalCount) return 'AVAILABLE';
    return 'PARTIALLY_AVAILABLE';
  },

  /**
   * CLIENT-SIDE: Get status color for UI
   */
  getStatusColor: (
    status: AvailabilityStatus
  ): 'success' | 'warning' | 'error' | 'info' => {
    const colors: Record<AvailabilityStatus, any> = {
      AVAILABLE: 'success',
      PARTIALLY_AVAILABLE: 'warning',
      UNAVAILABLE: 'error',
      WAITLIST: 'info'
    };
    return colors[status] || 'default';
  },

  /**
   * CLIENT-SIDE: Get status label
   */
  getStatusLabel: (status: AvailabilityStatus): string => {
    const labels: Record<AvailabilityStatus, string> = {
      AVAILABLE: 'Available',
      PARTIALLY_AVAILABLE: 'Limited Availability',
      UNAVAILABLE: 'Fully Booked',
      WAITLIST: 'Waitlist Available'
    };
    return labels[status] || status;
  },

  /**
   * CLIENT-SIDE: Format capacity display
   */
  formatCapacity: (available: number, total: number): string => {
    return `${available} of ${total} available`;
  },

  /**
   * CLIENT-SIDE: Calculate utilization percentage
   */
  calculateUtilization: (booked: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((booked / total) * 100);
  },

  /**
   * CLIENT-SIDE: Check if date is in the past
   */
  isPastDate: (date: string): boolean => {
    const checkDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkDate < today;
  },

  /**
   * CLIENT-SIDE: Get next available date from calendar
   */
  getNextAvailableDate: (calendar: AvailabilityCalendar): string | null => {
    const availableDate = calendar.dates.find(
      d => d.status === 'AVAILABLE' && !availabilityService.isPastDate(d.date)
    );
    return availableDate?.date || null;
  },

  /**
   * CLIENT-SIDE: Filter available dates
   */
  filterAvailableDates: (
    dates: DateAvailability[],
    minAvailable: number = 1
  ): DateAvailability[] => {
    return dates.filter(
      d => d.availableCount >= minAvailable && !availabilityService.isPastDate(d.date)
    );
  },

  /**
   * CLIENT-SIDE: Sort alternative suggestions by relevance
   */
  sortAlternatives: (
    alternatives: AlternativeDateSuggestion[],
    requestedStart: string
  ): AlternativeDateSuggestion[] => {
    const requested = new Date(requestedStart);
    
    return [...alternatives].sort((a, b) => {
      // Prioritize by proximity to requested date
      const diffA = Math.abs(new Date(a.startDate).getTime() - requested.getTime());
      const diffB = Math.abs(new Date(b.startDate).getTime() - requested.getTime());
      
      if (diffA !== diffB) return diffA - diffB;
      
      // Then by availability
      if (a.availableCount !== b.availableCount) {
        return b.availableCount - a.availableCount;
      }
      
      // Then by price (lower is better)
      return a.price - b.price;
    });
  },

  /**
   * CLIENT-SIDE: Format date range for display
   */
  formatDateRange: (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    
    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
    }
    
    if (start.getMonth() !== end.getMonth()) {
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}`;
  },

  /**
   * CLIENT-SIDE: Calculate number of nights
   */
  calculateNights: (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  },

  /**
   * CLIENT-SIDE: Validate date range
   */
  validateDateRange: (
    startDate: string,
    endDate: string
  ): { isValid: boolean; error?: string } => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return { isValid: false, error: 'Start date cannot be in the past' };
    }

    if (end <= start) {
      return { isValid: false, error: 'End date must be after start date' };
    }

    const nights = availabilityService.calculateNights(startDate, endDate);
    if (nights > 365) {
      return { isValid: false, error: 'Reservation cannot exceed 365 days' };
    }

    return { isValid: true };
  }
};
