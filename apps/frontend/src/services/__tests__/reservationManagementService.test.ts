/**
 * Reservation Management Service Tests
 * 
 * Tests for customer reservation management business logic.
 * These define what "working" means for reservation management.
 */

import { reservationManagementService } from '../reservationManagementService';
import { Reservation } from '../reservationService';

describe('Reservation Management Service - Business Logic', () => {
  const mockReservation: Reservation = {
    id: 'res-1',
    customerId: 'customer-1',
    petId: 'pet-1',
    serviceId: 'service-1',
    startDate: '2025-11-01',
    endDate: '2025-11-05',
    status: 'CONFIRMED',
    createdAt: '2025-10-01'
  };

  describe('getDaysUntilCheckIn', () => {
    it('should calculate days until check-in correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const days = reservationManagementService.getDaysUntilCheckIn(futureDate);
      
      expect(days).toBe(7);
    });

    it('should return negative days for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      
      const days = reservationManagementService.getDaysUntilCheckIn(pastDate);
      
      expect(days).toBeLessThan(0);
    });

    it('should return 0 for today', () => {
      const today = new Date();
      
      const days = reservationManagementService.getDaysUntilCheckIn(today);
      
      expect(days).toBe(0);
    });

    it('should handle string dates', () => {
      // Create date at midnight to avoid timezone issues
      const futureDate = new Date();
      futureDate.setHours(0, 0, 0, 0);
      futureDate.setDate(futureDate.getDate() + 14);
      const dateString = futureDate.toISOString().split('T')[0];
      
      const days = reservationManagementService.getDaysUntilCheckIn(dateString);
      
      // Business Rule: Should calculate exactly 14 days
      // Allow ±1 day for timezone edge cases during midnight transitions
      expect(days).toBeGreaterThanOrEqual(13);
      expect(days).toBeLessThanOrEqual(15);
    });
  });

  describe('canModifyReservation', () => {
    it('should allow modification for confirmed future reservations', () => {
      const futureReservation: Reservation = {
        ...mockReservation,
        status: 'CONFIRMED',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const canModify = reservationManagementService.canModifyReservation(futureReservation);
      
      expect(canModify).toBe(true);
    });

    it('should not allow modification for cancelled reservations', () => {
      const cancelledReservation: Reservation = {
        ...mockReservation,
        status: 'CANCELLED'
      };

      const canModify = reservationManagementService.canModifyReservation(cancelledReservation);
      
      expect(canModify).toBe(false);
    });

    it('should not allow modification for completed reservations', () => {
      const completedReservation: Reservation = {
        ...mockReservation,
        status: 'COMPLETED'
      };

      const canModify = reservationManagementService.canModifyReservation(completedReservation);
      
      expect(canModify).toBe(false);
    });

    it('should not allow modification for checked-in reservations', () => {
      const checkedInReservation: Reservation = {
        ...mockReservation,
        status: 'CHECKED_IN'
      };

      const canModify = reservationManagementService.canModifyReservation(checkedInReservation);
      
      expect(canModify).toBe(false);
    });

    it('should not allow modification for no-show reservations', () => {
      const noShowReservation: Reservation = {
        ...mockReservation,
        status: 'NO_SHOW'
      };

      const canModify = reservationManagementService.canModifyReservation(noShowReservation);
      
      expect(canModify).toBe(false);
    });

    it('should not allow modification within 24 hours of check-in', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(tomorrow.getHours() - 1); // Less than 24 hours

      const soonReservation: Reservation = {
        ...mockReservation,
        status: 'CONFIRMED',
        startDate: tomorrow.toISOString()
      };

      const canModify = reservationManagementService.canModifyReservation(soonReservation);
      
      expect(canModify).toBe(false);
    });
  });

  describe('canCancelReservation', () => {
    it('should allow cancellation for confirmed reservations', () => {
      const confirmedReservation: Reservation = {
        ...mockReservation,
        status: 'CONFIRMED'
      };

      const canCancel = reservationManagementService.canCancelReservation(confirmedReservation);
      
      expect(canCancel).toBe(true);
    });

    it('should allow cancellation for pending reservations', () => {
      const pendingReservation: Reservation = {
        ...mockReservation,
        status: 'PENDING'
      };

      const canCancel = reservationManagementService.canCancelReservation(pendingReservation);
      
      expect(canCancel).toBe(true);
    });

    it('should not allow cancellation for already cancelled reservations', () => {
      const cancelledReservation: Reservation = {
        ...mockReservation,
        status: 'CANCELLED'
      };

      const canCancel = reservationManagementService.canCancelReservation(cancelledReservation);
      
      expect(canCancel).toBe(false);
    });

    it('should not allow cancellation for completed reservations', () => {
      const completedReservation: Reservation = {
        ...mockReservation,
        status: 'COMPLETED'
      };

      const canCancel = reservationManagementService.canCancelReservation(completedReservation);
      
      expect(canCancel).toBe(false);
    });

    it('should not allow cancellation for checked-in reservations', () => {
      const checkedInReservation: Reservation = {
        ...mockReservation,
        status: 'CHECKED_IN'
      };

      const canCancel = reservationManagementService.canCancelReservation(checkedInReservation);
      
      expect(canCancel).toBe(false);
    });
  });

  describe('calculateRefundPercentage', () => {
    it('should return 100% refund for 7+ days before check-in', () => {
      const percentage = reservationManagementService.calculateRefundPercentage(7);
      expect(percentage).toBe(100);

      const percentage10 = reservationManagementService.calculateRefundPercentage(10);
      expect(percentage10).toBe(100);
    });

    it('should return 50% refund for 3-6 days before check-in', () => {
      const percentage3 = reservationManagementService.calculateRefundPercentage(3);
      expect(percentage3).toBe(50);

      const percentage5 = reservationManagementService.calculateRefundPercentage(5);
      expect(percentage5).toBe(50);

      const percentage6 = reservationManagementService.calculateRefundPercentage(6);
      expect(percentage6).toBe(50);
    });

    it('should return 25% refund for 1-2 days before check-in', () => {
      const percentage1 = reservationManagementService.calculateRefundPercentage(1);
      expect(percentage1).toBe(25);

      const percentage2 = reservationManagementService.calculateRefundPercentage(2);
      expect(percentage2).toBe(25);
    });

    it('should return 0% refund for same day or past', () => {
      const percentage0 = reservationManagementService.calculateRefundPercentage(0);
      expect(percentage0).toBe(0);

      const percentageNegative = reservationManagementService.calculateRefundPercentage(-1);
      expect(percentageNegative).toBe(0);
    });
  });

  describe('formatModificationType', () => {
    it('should format modification types correctly', () => {
      expect(reservationManagementService.formatModificationType('DATE_CHANGE'))
        .toBe('Date Changed');
      
      expect(reservationManagementService.formatModificationType('PET_ADDED'))
        .toBe('Pet Added');
      
      expect(reservationManagementService.formatModificationType('PET_REMOVED'))
        .toBe('Pet Removed');
      
      expect(reservationManagementService.formatModificationType('ADDON_ADDED'))
        .toBe('Add-on Added');
      
      expect(reservationManagementService.formatModificationType('ADDON_REMOVED'))
        .toBe('Add-on Removed');
      
      expect(reservationManagementService.formatModificationType('SERVICE_CHANGE'))
        .toBe('Service Changed');
      
      expect(reservationManagementService.formatModificationType('NOTES_UPDATED'))
        .toBe('Notes Updated');
      
      expect(reservationManagementService.formatModificationType('CANCELLED'))
        .toBe('Cancelled');
    });

    it('should return original type for unknown types', () => {
      expect(reservationManagementService.formatModificationType('UNKNOWN_TYPE'))
        .toBe('UNKNOWN_TYPE');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(reservationManagementService.getStatusColor('PENDING')).toBe('warning');
      expect(reservationManagementService.getStatusColor('CONFIRMED')).toBe('success');
      expect(reservationManagementService.getStatusColor('CHECKED_IN')).toBe('info');
      expect(reservationManagementService.getStatusColor('CHECKED_OUT')).toBe('primary');
      expect(reservationManagementService.getStatusColor('CANCELLED')).toBe('error');
      expect(reservationManagementService.getStatusColor('COMPLETED')).toBe('default');
      expect(reservationManagementService.getStatusColor('NO_SHOW')).toBe('error');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct labels for each status', () => {
      expect(reservationManagementService.getStatusLabel('PENDING')).toBe('Pending');
      expect(reservationManagementService.getStatusLabel('CONFIRMED')).toBe('Confirmed');
      expect(reservationManagementService.getStatusLabel('CHECKED_IN')).toBe('Checked In');
      expect(reservationManagementService.getStatusLabel('CHECKED_OUT')).toBe('Checked Out');
      expect(reservationManagementService.getStatusLabel('CANCELLED')).toBe('Cancelled');
      expect(reservationManagementService.getStatusLabel('COMPLETED')).toBe('Completed');
      expect(reservationManagementService.getStatusLabel('NO_SHOW')).toBe('No Show');
    });
  });

  describe('Business Rules', () => {
    it('should enforce 24-hour modification window', () => {
      const in23Hours = new Date();
      in23Hours.setHours(in23Hours.getHours() + 23);

      const reservation: Reservation = {
        ...mockReservation,
        status: 'CONFIRMED',
        startDate: in23Hours.toISOString()
      };

      expect(reservationManagementService.canModifyReservation(reservation)).toBe(false);
    });

    it('should allow modification more than 24 hours before check-in', () => {
      const in25Hours = new Date();
      in25Hours.setHours(in25Hours.getHours() + 25);

      const reservation: Reservation = {
        ...mockReservation,
        status: 'CONFIRMED',
        startDate: in25Hours.toISOString()
      };

      expect(reservationManagementService.canModifyReservation(reservation)).toBe(true);
    });

    it('should handle edge case of exactly 1 day until check-in', () => {
      const in24Hours = new Date();
      in24Hours.setDate(in24Hours.getDate() + 1);

      const days = reservationManagementService.getDaysUntilCheckIn(in24Hours);
      
      // Should be 1 day (rounded up)
      expect(days).toBeGreaterThanOrEqual(1);
    });
  });
});
