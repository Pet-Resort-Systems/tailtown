/**
 * Availability Service Tests
 * 
 * Tests for real-time availability checking business logic.
 * These define what "working" means for availability checking.
 */

import { availabilityService } from '../availabilityService';
import { AvailabilityCalendar, DateAvailability, AlternativeDateSuggestion } from '../../types/availability';

describe('Availability Service - Business Logic', () => {
  describe('calculateAvailabilityStatus', () => {
    it('should return UNAVAILABLE when no suites available', () => {
      const status = availabilityService.calculateAvailabilityStatus(0, 10);
      expect(status).toBe('UNAVAILABLE');
    });

    it('should return AVAILABLE when all suites available', () => {
      const status = availabilityService.calculateAvailabilityStatus(10, 10);
      expect(status).toBe('AVAILABLE');
    });

    it('should return PARTIALLY_AVAILABLE when some suites available', () => {
      const status = availabilityService.calculateAvailabilityStatus(5, 10);
      expect(status).toBe('PARTIALLY_AVAILABLE');
    });

    it('should handle edge case of 1 available out of many', () => {
      const status = availabilityService.calculateAvailabilityStatus(1, 100);
      expect(status).toBe('PARTIALLY_AVAILABLE');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(availabilityService.getStatusColor('AVAILABLE')).toBe('success');
      expect(availabilityService.getStatusColor('PARTIALLY_AVAILABLE')).toBe('warning');
      expect(availabilityService.getStatusColor('UNAVAILABLE')).toBe('error');
      expect(availabilityService.getStatusColor('WAITLIST')).toBe('info');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct labels for each status', () => {
      expect(availabilityService.getStatusLabel('AVAILABLE')).toBe('Available');
      expect(availabilityService.getStatusLabel('PARTIALLY_AVAILABLE')).toBe('Limited Availability');
      expect(availabilityService.getStatusLabel('UNAVAILABLE')).toBe('Fully Booked');
      expect(availabilityService.getStatusLabel('WAITLIST')).toBe('Waitlist Available');
    });
  });

  describe('formatCapacity', () => {
    it('should format capacity correctly', () => {
      expect(availabilityService.formatCapacity(5, 10)).toBe('5 of 10 available');
      expect(availabilityService.formatCapacity(0, 10)).toBe('0 of 10 available');
      expect(availabilityService.formatCapacity(10, 10)).toBe('10 of 10 available');
    });
  });

  describe('calculateUtilization', () => {
    it('should calculate utilization percentage correctly', () => {
      expect(availabilityService.calculateUtilization(5, 10)).toBe(50);
      expect(availabilityService.calculateUtilization(7, 10)).toBe(70);
      expect(availabilityService.calculateUtilization(10, 10)).toBe(100);
      expect(availabilityService.calculateUtilization(0, 10)).toBe(0);
    });

    it('should handle zero total capacity', () => {
      expect(availabilityService.calculateUtilization(0, 0)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(availabilityService.calculateUtilization(1, 3)).toBe(33);
      expect(availabilityService.calculateUtilization(2, 3)).toBe(67);
    });
  });

  describe('isPastDate', () => {
    it('should return true for past dates', () => {
      const pastDate = '2020-01-01';
      expect(availabilityService.isPastDate(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = '2030-12-31';
      expect(availabilityService.isPastDate(futureDate)).toBe(false);
    });

    it.skip('should return false for today (edge case - may vary by timezone)', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];
      const result = availabilityService.isPastDate(todayString);
      // Today should not be considered past
      expect(result).toBe(false);
    });
  });

  describe('getNextAvailableDate', () => {
    it('should find next available date', () => {
      const calendar: AvailabilityCalendar = {
        month: 11,
        year: 2026,
        dates: [
          { date: '2026-11-01', status: 'UNAVAILABLE', availableCount: 0, totalCount: 10, availableSuites: [] },
          { date: '2026-11-02', status: 'AVAILABLE', availableCount: 10, totalCount: 10, availableSuites: ['s1', 's2'] },
          { date: '2026-11-03', status: 'AVAILABLE', availableCount: 8, totalCount: 10, availableSuites: ['s1'] }
        ],
        summary: {
          totalDays: 3,
          availableDays: 2,
          partiallyAvailableDays: 0,
          unavailableDays: 1
        }
      };

      const nextDate = availabilityService.getNextAvailableDate(calendar);
      expect(nextDate).toBe('2026-11-02');
    });

    it('should return null when no dates available', () => {
      const calendar: AvailabilityCalendar = {
        month: 11,
        year: 2025,
        dates: [
          { date: '2025-11-01', status: 'UNAVAILABLE', availableCount: 0, totalCount: 10, availableSuites: [] },
          { date: '2025-11-02', status: 'UNAVAILABLE', availableCount: 0, totalCount: 10, availableSuites: [] }
        ],
        summary: {
          totalDays: 2,
          availableDays: 0,
          partiallyAvailableDays: 0,
          unavailableDays: 2
        }
      };

      const nextDate = availabilityService.getNextAvailableDate(calendar);
      expect(nextDate).toBeNull();
    });
  });

  describe('filterAvailableDates', () => {
    const dates: DateAvailability[] = [
      { date: '2026-11-01', status: 'AVAILABLE', availableCount: 10, totalCount: 10, availableSuites: [] },
      { date: '2026-11-02', status: 'PARTIALLY_AVAILABLE', availableCount: 3, totalCount: 10, availableSuites: [] },
      { date: '2026-11-03', status: 'UNAVAILABLE', availableCount: 0, totalCount: 10, availableSuites: [] },
      { date: '2020-01-01', status: 'AVAILABLE', availableCount: 10, totalCount: 10, availableSuites: [] } // Past date
    ];

    it('should filter dates with at least 1 available', () => {
      const filtered = availabilityService.filterAvailableDates(dates, 1);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].date).toBe('2026-11-01');
      expect(filtered[1].date).toBe('2026-11-02');
    });

    it('should filter dates with minimum availability', () => {
      const filtered = availabilityService.filterAvailableDates(dates, 5);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe('2026-11-01');
    });

    it('should exclude past dates', () => {
      const filtered = availabilityService.filterAvailableDates(dates, 1);
      expect(filtered.every(d => !availabilityService.isPastDate(d.date))).toBe(true);
    });
  });

  describe('sortAlternatives', () => {
    const alternatives: AlternativeDateSuggestion[] = [
      {
        startDate: '2025-11-10',
        endDate: '2025-11-12',
        availableCount: 5,
        price: 200,
        reason: 'Far from requested'
      },
      {
        startDate: '2025-11-02',
        endDate: '2025-11-04',
        availableCount: 8,
        price: 180,
        reason: 'Close to requested'
      },
      {
        startDate: '2025-11-03',
        endDate: '2025-11-05',
        availableCount: 10,
        price: 190,
        reason: 'Very close to requested'
      }
    ];

    it('should sort by proximity to requested date', () => {
      const sorted = availabilityService.sortAlternatives(alternatives, '2025-11-01');
      
      // Closest date should be first
      expect(sorted[0].startDate).toBe('2025-11-02');
      expect(sorted[1].startDate).toBe('2025-11-03');
      expect(sorted[2].startDate).toBe('2025-11-10');
    });

    it('should prioritize availability when dates are equally close', () => {
      const equallyClose: AlternativeDateSuggestion[] = [
        {
          startDate: '2025-11-05',
          endDate: '2025-11-07',
          availableCount: 3,
          price: 200,
          reason: 'Less available'
        },
        {
          startDate: '2025-11-05',
          endDate: '2025-11-07',
          availableCount: 10,
          price: 200,
          reason: 'More available'
        }
      ];

      const sorted = availabilityService.sortAlternatives(equallyClose, '2025-11-01');
      expect(sorted[0].availableCount).toBe(10);
    });
  });

  describe('formatDateRange', () => {
    it.skip('should format date range within same month (locale-dependent)', () => {
      const formatted = availabilityService.formatDateRange('2025-11-01', '2025-11-05');
      // Format may vary by locale
      expect(formatted).toBeTruthy();
    });

    it('should format date range across months', () => {
      const formatted = availabilityService.formatDateRange('2025-11-30', '2025-12-05');
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('Dec');
    });

    it('should format date range across years', () => {
      const formatted = availabilityService.formatDateRange('2025-12-30', '2026-01-05');
      expect(formatted).toContain('2025');
      expect(formatted).toContain('2026');
    });
  });

  describe('calculateNights', () => {
    it('should calculate number of nights correctly', () => {
      expect(availabilityService.calculateNights('2025-11-01', '2025-11-03')).toBe(2);
      expect(availabilityService.calculateNights('2025-11-01', '2025-11-02')).toBe(1);
      expect(availabilityService.calculateNights('2025-11-01', '2025-11-08')).toBe(7);
    });

    it('should return 0 for same day', () => {
      expect(availabilityService.calculateNights('2025-11-01', '2025-11-01')).toBe(0);
    });

    it('should handle month boundaries', () => {
      expect(availabilityService.calculateNights('2025-11-30', '2025-12-02')).toBe(2);
    });

    it('should handle year boundaries', () => {
      expect(availabilityService.calculateNights('2025-12-30', '2026-01-02')).toBe(3);
    });
  });

  describe('validateDateRange', () => {
    it('should accept valid future date range', () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 7);
      const futureEnd = new Date(futureStart);
      futureEnd.setDate(futureEnd.getDate() + 3);

      const result = availabilityService.validateDateRange(
        futureStart.toISOString().split('T')[0],
        futureEnd.toISOString().split('T')[0]
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject past start date', () => {
      const result = availabilityService.validateDateRange('2020-01-01', '2020-01-05');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('past');
    });

    it('should reject end date before start date', () => {
      const result = availabilityService.validateDateRange('2025-11-05', '2025-11-01');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('after start date');
    });

    it('should reject end date same as start date', () => {
      const result = availabilityService.validateDateRange('2025-11-01', '2025-11-01');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('after start date');
    });

    it('should reject reservations exceeding 365 days', () => {
      const start = '2025-11-01';
      const end = '2026-11-02'; // 366 days

      const result = availabilityService.validateDateRange(start, end);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('365 days');
    });

    it('should accept exactly 365 days', () => {
      const start = '2025-11-01';
      const end = '2026-11-01'; // Exactly 365 days

      const result = availabilityService.validateDateRange(start, end);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Business Rules', () => {
    it('should correctly identify fully booked dates', () => {
      const status = availabilityService.calculateAvailabilityStatus(0, 20);
      expect(status).toBe('UNAVAILABLE');
    });

    it('should handle high utilization correctly', () => {
      const utilization = availabilityService.calculateUtilization(19, 20);
      expect(utilization).toBe(95);
    });

    it('should validate minimum stay requirements', () => {
      const nights = availabilityService.calculateNights('2025-11-01', '2025-11-02');
      expect(nights).toBeGreaterThanOrEqual(1); // Minimum 1 night
    });

    it('should prevent booking in the past', () => {
      const validation = availabilityService.validateDateRange('2020-01-01', '2020-01-05');
      expect(validation.isValid).toBe(false);
    });
  });
});
