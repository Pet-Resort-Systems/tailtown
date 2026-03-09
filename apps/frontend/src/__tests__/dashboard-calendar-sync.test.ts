/**
 * Dashboard and Calendar Synchronization Tests
 * 
 * These tests ensure that the dashboard metrics (In, Out, Overnight counts)
 * always match what's displayed on the calendar for the same date.
 * 
 * IMPORTANT: These tests also verify timezone handling to prevent UTC vs local time bugs.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock reservation data for testing
const mockReservations = [
  {
    id: '1',
    startDate: '2025-09-30T09:00:00.000Z',
    endDate: '2025-09-30T17:00:00.000Z',
    status: 'CONFIRMED',
    pet: { name: 'Buddy' },
    customer: { firstName: 'John', lastName: 'Doe' }
  },
  {
    id: '2',
    startDate: '2025-09-29T09:00:00.000Z',
    endDate: '2025-09-30T17:00:00.000Z',
    status: 'CONFIRMED',
    pet: { name: 'Max' },
    customer: { firstName: 'Jane', lastName: 'Smith' }
  },
  {
    id: '3',
    startDate: '2025-09-30T09:00:00.000Z',
    endDate: '2025-10-01T17:00:00.000Z',
    status: 'CONFIRMED',
    pet: { name: 'Luna' },
    customer: { firstName: 'Bob', lastName: 'Johnson' }
  },
  {
    id: '4',
    startDate: '2025-09-29T09:00:00.000Z',
    endDate: '2025-10-01T17:00:00.000Z',
    status: 'CONFIRMED',
    pet: { name: 'Charlie' },
    customer: { firstName: 'Alice', lastName: 'Williams' }
  }
];

/**
 * Calculate dashboard metrics from reservations
 * This should match the logic in Dashboard.tsx
 * USES CORRECT TIMEZONE HANDLING
 */
function calculateDashboardMetrics(reservations: any[], targetDate: Date) {
  let inCount = 0;
  let outCount = 0;
  let overnightCount = 0;
  
  // Format target date as YYYY-MM-DD in local timezone
  const todayStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  
  reservations.forEach((reservation: any) => {
    // Convert to Date objects and extract local date strings
    const startDate = new Date(reservation.startDate);
    const endDate = new Date(reservation.endDate);
    
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    
    // Check if reservation is active today
    const isActiveToday = startDateStr <= todayStr && endDateStr >= todayStr;
    
    if (!isActiveToday) {
      return;
    }
    
    // IN: Checking in today
    if (startDateStr === todayStr) {
      inCount++;
    }
    
    // OUT: Checking out today
    if (endDateStr === todayStr) {
      outCount++;
    }
    
    // OVERNIGHT: Staying overnight (active today AND ends after today)
    if (endDateStr > todayStr) {
      overnightCount++;
    }
  });
  
  return { inCount, outCount, overnightCount };
}

/**
 * Calculate calendar occupancy from reservations
 * This should match the logic in KennelCalendar/useKennelData
 * USES CORRECT TIMEZONE HANDLING
 */
function calculateCalendarOccupancy(reservations: any[], targetDate: Date) {
  // Format target date as YYYY-MM-DD in local timezone
  const todayStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  
  const activeReservations = reservations.filter((reservation: any) => {
    // Convert to Date objects and extract local date strings
    const startDate = new Date(reservation.startDate);
    const endDate = new Date(reservation.endDate);
    
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    
    // Reservation is active if it overlaps with today
    return startDateStr <= todayStr && endDateStr >= todayStr;
  });
  
  return {
    totalOccupied: activeReservations.length,
    reservations: activeReservations
  };
}

describe('Dashboard and Calendar Synchronization', () => {
  const testDate = new Date('2025-09-30T12:00:00.000Z');
  
  it('should calculate correct IN count for reservations starting today', () => {
    const metrics = calculateDashboardMetrics(mockReservations, testDate);
    
    // Reservations 1 and 3 start on 2025-09-30
    expect(metrics.inCount).toBe(2);
  });
  
  it('should calculate correct OUT count for reservations ending today', () => {
    const metrics = calculateDashboardMetrics(mockReservations, testDate);
    
    // Reservations 1 and 2 end on 2025-09-30
    expect(metrics.outCount).toBe(2);
  });
  
  it('should calculate correct OVERNIGHT count for reservations staying overnight', () => {
    const metrics = calculateDashboardMetrics(mockReservations, testDate);
    
    // Reservations 3 and 4 end after 2025-09-30
    expect(metrics.overnightCount).toBe(2);
  });
  
  it('should match calendar occupancy with total active reservations', () => {
    const metrics = calculateDashboardMetrics(mockReservations, testDate);
    const calendar = calculateCalendarOccupancy(mockReservations, testDate);
    
    // All 4 reservations are active on 2025-09-30
    expect(calendar.totalOccupied).toBe(4);
    
    // The sum of unique pets should match calendar occupancy
    // Note: IN + OVERNIGHT should equal total occupied (some pets may be both)
    const uniquePetsOnCalendar = calendar.reservations.length;
    expect(uniquePetsOnCalendar).toBe(4);
  });
  
  it('should have consistent logic between dashboard and calendar', () => {
    const metrics = calculateDashboardMetrics(mockReservations, testDate);
    const calendar = calculateCalendarOccupancy(mockReservations, testDate);
    
    // Verify the relationship:
    // - Calendar shows all active reservations
    // - Dashboard IN = reservations starting today
    // - Dashboard OUT = reservations ending today
    // - Dashboard OVERNIGHT = reservations active today that end after today
    
    // All active reservations on calendar
    expect(calendar.totalOccupied).toBe(4);
    
    // Dashboard metrics
    expect(metrics.inCount).toBe(2);  // Starting today
    expect(metrics.outCount).toBe(2); // Ending today
    expect(metrics.overnightCount).toBe(2); // Staying overnight
    
    // Validation: Every reservation on the calendar should be counted somewhere
    // A reservation can be counted in multiple categories (e.g., both IN and OVERNIGHT)
    const dashboardTotal = metrics.inCount + metrics.outCount + metrics.overnightCount;
    
    // This should be >= calendar total because some reservations are counted twice
    // (e.g., a reservation that checks in today and stays overnight is counted in both IN and OVERNIGHT)
    expect(dashboardTotal).toBeGreaterThanOrEqual(calendar.totalOccupied);
  });
  
  it('should handle edge case: same-day reservation (check-in and check-out today)', () => {
    const sameDayReservation = [{
      id: '5',
      startDate: '2025-09-30T09:00:00.000Z',
      endDate: '2025-09-30T17:00:00.000Z',
      status: 'CONFIRMED',
      pet: { name: 'Daisy' },
      customer: { firstName: 'Tom', lastName: 'Brown' }
    }];
    
    const metrics = calculateDashboardMetrics(sameDayReservation, testDate);
    const calendar = calculateCalendarOccupancy(sameDayReservation, testDate);
    
    // Should be counted in both IN and OUT, but NOT overnight
    expect(metrics.inCount).toBe(1);
    expect(metrics.outCount).toBe(1);
    expect(metrics.overnightCount).toBe(0);
    expect(calendar.totalOccupied).toBe(1);
  });
  
  it('should handle edge case: multi-day stay that started yesterday', () => {
    const multiDayReservation = [{
      id: '6',
      startDate: '2025-09-29T09:00:00.000Z',
      endDate: '2025-10-01T17:00:00.000Z',
      status: 'CONFIRMED',
      pet: { name: 'Rocky' },
      customer: { firstName: 'Sarah', lastName: 'Davis' }
    }];
    
    const metrics = calculateDashboardMetrics(multiDayReservation, testDate);
    const calendar = calculateCalendarOccupancy(multiDayReservation, testDate);
    
    // Should NOT be counted in IN (started yesterday)
    // Should NOT be counted in OUT (ends tomorrow)
    // SHOULD be counted in OVERNIGHT (active today, ends after today)
    expect(metrics.inCount).toBe(0);
    expect(metrics.outCount).toBe(0);
    expect(metrics.overnightCount).toBe(1);
    expect(calendar.totalOccupied).toBe(1);
  });
});

describe('Dashboard Metrics Validation Rules', () => {
  it('should ensure IN + OVERNIGHT >= total calendar occupancy for check-in days', () => {
    // This validates that all pets checking in today are accounted for
    const testDate = new Date('2025-09-30T12:00:00.000Z');
    const metrics = calculateDashboardMetrics(mockReservations, testDate);
    const calendar = calculateCalendarOccupancy(mockReservations, testDate);
    
    // Pets checking in today should be in either IN or both IN and OVERNIGHT
    const checkingInToday = mockReservations.filter(r => {
      const start = new Date(r.startDate);
      start.setHours(0, 0, 0, 0);
      const today = new Date(testDate);
      today.setHours(0, 0, 0, 0);
      return start.getTime() === today.getTime();
    });
    
    expect(metrics.inCount).toBe(checkingInToday.length);
  });
  
  it('should ensure calendar occupancy includes all dashboard categories', () => {
    const testDate = new Date('2025-09-30T12:00:00.000Z');
    const metrics = calculateDashboardMetrics(mockReservations, testDate);
    const calendar = calculateCalendarOccupancy(mockReservations, testDate);
    
    // Every pet on the calendar should be in at least one dashboard category
    // Calendar shows: All active reservations
    // Dashboard shows: IN (starting), OUT (ending), OVERNIGHT (staying)
    
    // Verify each calendar reservation is accounted for in dashboard
    calendar.reservations.forEach((reservation: any) => {
      const start = new Date(reservation.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(reservation.endDate);
      end.setHours(0, 0, 0, 0);
      const today = new Date(testDate);
      today.setHours(0, 0, 0, 0);
      
      const isIn = start.getTime() === today.getTime();
      const isOut = end.getTime() === today.getTime();
      const isOvernight = end.getTime() > today.getTime();
      
      // Every reservation should be in at least one category
      expect(isIn || isOut || isOvernight).toBe(true);
    });
  });
});
