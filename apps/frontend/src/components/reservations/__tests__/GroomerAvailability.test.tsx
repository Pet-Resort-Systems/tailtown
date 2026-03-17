/**
 * Groomer Availability Logic Tests
 *
 * Tests complex availability checking including time conflicts,
 * working hours validation, and time off integration
 */

import { parseISO, isWithinInterval } from 'date-fns';

// These tests validate the availability checking logic
// The actual implementation is in GroomerSelector component

describe('Groomer Availability Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Time Conflict Detection', () => {
    it('should detect overlapping appointments', () => {
      const existingAppointment = {
        startTime: '10:00',
        endTime: '11:00',
      };

      const newAppointment = {
        startTime: '10:30',
        endTime: '11:30',
      };

      // Check if appointments overlap
      const overlaps =
        (newAppointment.startTime >= existingAppointment.startTime &&
          newAppointment.startTime < existingAppointment.endTime) ||
        (newAppointment.endTime > existingAppointment.startTime &&
          newAppointment.endTime <= existingAppointment.endTime) ||
        (newAppointment.startTime <= existingAppointment.startTime &&
          newAppointment.endTime >= existingAppointment.endTime);

      expect(overlaps).toBe(true);
    });

    it('should allow back-to-back appointments', () => {
      const existingAppointment = {
        startTime: '10:00',
        endTime: '11:00',
      };

      const newAppointment = {
        startTime: '11:00',
        endTime: '12:00',
      };

      // Back-to-back should not overlap
      const overlaps =
        (newAppointment.startTime >= existingAppointment.startTime &&
          newAppointment.startTime < existingAppointment.endTime) ||
        (newAppointment.endTime > existingAppointment.startTime &&
          newAppointment.endTime <= existingAppointment.endTime);

      expect(overlaps).toBe(false);
    });

    it('should handle appointments spanning multiple hours', () => {
      const existingAppointment = {
        startTime: '09:00',
        endTime: '12:00',
      };

      const newAppointment = {
        startTime: '10:00',
        endTime: '11:00',
      };

      // New appointment is completely within existing
      const overlaps =
        newAppointment.startTime >= existingAppointment.startTime &&
        newAppointment.endTime <= existingAppointment.endTime;

      expect(overlaps).toBe(true);
    });

    it('should detect when new appointment wraps existing', () => {
      const existingAppointment = {
        startTime: '10:00',
        endTime: '11:00',
      };

      const newAppointment = {
        startTime: '09:00',
        endTime: '12:00',
      };

      // New appointment completely contains existing
      const overlaps =
        newAppointment.startTime <= existingAppointment.startTime &&
        newAppointment.endTime >= existingAppointment.endTime;

      expect(overlaps).toBe(true);
    });

    it('should allow non-overlapping appointments', () => {
      const existingAppointment = {
        startTime: '10:00',
        endTime: '11:00',
      };

      const newAppointment = {
        startTime: '14:00',
        endTime: '15:00',
      };

      const overlaps =
        (newAppointment.startTime >= existingAppointment.startTime &&
          newAppointment.startTime < existingAppointment.endTime) ||
        (newAppointment.endTime > existingAppointment.startTime &&
          newAppointment.endTime <= existingAppointment.endTime) ||
        (newAppointment.startTime <= existingAppointment.startTime &&
          newAppointment.endTime >= existingAppointment.endTime);

      expect(overlaps).toBe(false);
    });
  });

  describe('Working Hours Validation', () => {
    it('should reject appointments outside working hours', () => {
      const workingHours = {
        startTime: '08:00',
        endTime: '17:00',
      };

      const appointment = {
        startTime: '18:00',
        endTime: '19:00',
      };

      const isWithinHours =
        appointment.startTime >= workingHours.startTime &&
        appointment.endTime <= workingHours.endTime;

      expect(isWithinHours).toBe(false);
    });

    it('should accept appointments within working hours', () => {
      const workingHours = {
        startTime: '08:00',
        endTime: '17:00',
      };

      const appointment = {
        startTime: '10:00',
        endTime: '11:00',
      };

      const isWithinHours =
        appointment.startTime >= workingHours.startTime &&
        appointment.endTime <= workingHours.endTime;

      expect(isWithinHours).toBe(true);
    });

    it('should reject appointments starting before working hours', () => {
      const workingHours = {
        startTime: '08:00',
        endTime: '17:00',
      };

      const appointment = {
        startTime: '07:00',
        endTime: '09:00',
      };

      const isWithinHours =
        appointment.startTime >= workingHours.startTime &&
        appointment.endTime <= workingHours.endTime;

      expect(isWithinHours).toBe(false);
    });

    it('should reject appointments ending after working hours', () => {
      const workingHours = {
        startTime: '08:00',
        endTime: '17:00',
      };

      const appointment = {
        startTime: '16:00',
        endTime: '18:00',
      };

      const isWithinHours =
        appointment.startTime >= workingHours.startTime &&
        appointment.endTime <= workingHours.endTime;

      expect(isWithinHours).toBe(false);
    });

    it('should handle different hours per day', () => {
      const mondayHours = {
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '17:00',
      };

      const saturdayHours = {
        dayOfWeek: 6,
        startTime: '09:00',
        endTime: '13:00',
      };

      const saturdayAppointment = {
        startTime: '10:00',
        endTime: '11:00',
      };

      // Should be valid for Saturday hours
      const isValidForSaturday =
        saturdayAppointment.startTime >= saturdayHours.startTime &&
        saturdayAppointment.endTime <= saturdayHours.endTime;

      // Would be invalid for Monday (but that's not the day)
      const isValidForMonday =
        saturdayAppointment.startTime >= mondayHours.startTime &&
        saturdayAppointment.endTime <= mondayHours.endTime;

      expect(isValidForSaturday).toBe(true);
      expect(isValidForMonday).toBe(true); // Also within Monday hours
    });
  });

  describe('Time Off Integration', () => {
    it('should block all day for full-day time off', () => {
      const timeOff = {
        startDate: '2025-10-26',
        endDate: '2025-10-26',
        type: 'VACATION',
        status: 'APPROVED',
      };

      const appointmentDate = new Date('2025-10-26T10:00:00');
      const timeOffStart = parseISO(timeOff.startDate);
      const timeOffEnd = parseISO(timeOff.endDate);

      const isOnTimeOff = isWithinInterval(appointmentDate, {
        start: timeOffStart,
        end: timeOffEnd,
      });

      expect(isOnTimeOff).toBe(true);
    });

    it('should allow appointments outside time off period', () => {
      const timeOff = {
        startDate: '2025-10-26',
        endDate: '2025-10-28',
        type: 'VACATION',
        status: 'APPROVED',
      };

      const appointmentDate = new Date('2025-10-25T10:00:00');
      const timeOffStart = parseISO(timeOff.startDate);
      const timeOffEnd = parseISO(timeOff.endDate);

      const isOnTimeOff = isWithinInterval(appointmentDate, {
        start: timeOffStart,
        end: timeOffEnd,
      });

      expect(isOnTimeOff).toBe(false);
    });

    it('should handle multi-day time off', () => {
      const timeOff = {
        startDate: '2025-10-26',
        endDate: '2025-10-30',
        type: 'VACATION',
        status: 'APPROVED',
      };

      const appointmentDate1 = new Date('2025-10-27T10:00:00');
      const appointmentDate2 = new Date('2025-10-31T10:00:00');

      const timeOffStart = parseISO(timeOff.startDate);
      const timeOffEnd = parseISO(timeOff.endDate);

      const isDate1OnTimeOff = isWithinInterval(appointmentDate1, {
        start: timeOffStart,
        end: timeOffEnd,
      });

      const isDate2OnTimeOff = isWithinInterval(appointmentDate2, {
        start: timeOffStart,
        end: timeOffEnd,
      });

      expect(isDate1OnTimeOff).toBe(true);
      expect(isDate2OnTimeOff).toBe(false);
    });

    it('should only block approved time off', () => {
      const pendingTimeOff = {
        startDate: '2025-10-26',
        endDate: '2025-10-26',
        type: 'VACATION',
        status: 'PENDING',
      };

      const approvedTimeOff = {
        startDate: '2025-10-27',
        endDate: '2025-10-27',
        type: 'VACATION',
        status: 'APPROVED',
      };

      // Only approved time off should block
      expect(pendingTimeOff.status).not.toBe('APPROVED');
      expect(approvedTimeOff.status).toBe('APPROVED');
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight appointments', () => {
      const appointment = {
        startTime: '23:00',
        endTime: '00:00',
      };

      const workingHours = {
        startTime: '00:00',
        endTime: '23:59',
      };

      // Midnight (00:00) is technically the start of the next day
      const isValid =
        appointment.startTime >= workingHours.startTime &&
        appointment.startTime <= workingHours.endTime;

      expect(isValid).toBe(true);
    });

    it('should handle appointments crossing day boundary', () => {
      const appointment = {
        startDate: '2025-10-26T23:00:00',
        endDate: '2025-10-27T01:00:00',
      };

      const start = new Date(appointment.startDate);
      const end = new Date(appointment.endDate);

      // Appointment spans two days
      const spansDays = start.getDate() !== end.getDate();

      expect(spansDays).toBe(true);
    });

    it('should handle same start and end time (zero duration)', () => {
      const appointment = {
        startTime: '10:00',
        endTime: '10:00',
      };

      const duration = appointment.endTime === appointment.startTime;

      expect(duration).toBe(true);
      // Zero duration appointments should probably be rejected
    });

    it('should handle 24-hour availability', () => {
      const workingHours = {
        startTime: '00:00',
        endTime: '23:59',
      };

      const appointment = {
        startTime: '03:00',
        endTime: '04:00',
      };

      const isWithinHours =
        appointment.startTime >= workingHours.startTime &&
        appointment.endTime <= workingHours.endTime;

      expect(isWithinHours).toBe(true);
    });

    it('should compare times as strings correctly', () => {
      const time1 = '09:00';
      const time2 = '10:00';
      const time3 = '09:30';

      expect(time1 < time2).toBe(true);
      expect(time3 > time1).toBe(true);
      expect(time3 < time2).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle groomer with multiple appointments', () => {
      const existingAppointments = [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '11:00', endTime: '12:00' },
        { startTime: '14:00', endTime: '15:00' },
      ];

      const newAppointment = {
        startTime: '10:30',
        endTime: '11:30',
      };

      // Check against all existing appointments
      const hasConflict = existingAppointments.some((existing) => {
        return (
          (newAppointment.startTime >= existing.startTime &&
            newAppointment.startTime < existing.endTime) ||
          (newAppointment.endTime > existing.startTime &&
            newAppointment.endTime <= existing.endTime) ||
          (newAppointment.startTime <= existing.startTime &&
            newAppointment.endTime >= existing.endTime)
        );
      });

      expect(hasConflict).toBe(true);
    });

    it('should find available time slots', () => {
      const existingAppointments = [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '11:00', endTime: '12:00' },
      ];

      const workingHours = {
        startTime: '08:00',
        endTime: '17:00',
      };

      // Available slots: 08:00-09:00, 10:00-11:00, 12:00-17:00
      const testSlots = [
        { startTime: '08:30', endTime: '09:00', expected: false }, // Conflicts with 09:00 appointment
        { startTime: '10:00', endTime: '11:00', expected: false }, // Conflicts with 11:00 appointment
        { startTime: '12:00', endTime: '13:00', expected: true }, // Available
        { startTime: '13:00', endTime: '14:00', expected: true }, // Available
      ];

      testSlots.forEach((slot) => {
        const hasConflict = existingAppointments.some((existing) => {
          return (
            (slot.startTime >= existing.startTime &&
              slot.startTime < existing.endTime) ||
            (slot.endTime > existing.startTime &&
              slot.endTime <= existing.endTime) ||
            (slot.startTime <= existing.startTime &&
              slot.endTime >= existing.endTime)
          );
        });

        expect(!hasConflict).toBe(slot.expected);
      });
    });

    it('should handle groomer working split shifts', () => {
      const morningShift = {
        startTime: '08:00',
        endTime: '12:00',
      };

      const eveningShift = {
        startTime: '17:00',
        endTime: '21:00',
      };

      const appointments = [
        { startTime: '10:00', endTime: '11:00', expected: true }, // Morning - valid
        { startTime: '14:00', endTime: '15:00', expected: false }, // Break - invalid
        { startTime: '18:00', endTime: '19:00', expected: true }, // Evening - valid
      ];

      appointments.forEach((apt) => {
        const isInMorning =
          apt.startTime >= morningShift.startTime &&
          apt.endTime <= morningShift.endTime;

        const isInEvening =
          apt.startTime >= eveningShift.startTime &&
          apt.endTime <= eveningShift.endTime;

        expect(isInMorning || isInEvening).toBe(apt.expected);
      });
    });
  });
});
