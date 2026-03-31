import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SpecializedCalendar from '../SpecializedCalendar';
import { ServiceCategory } from '../../../types/service';
import { reservationService } from '../../../services/reservationService';
import schedulingService from '../../../services/schedulingService';

// Mock the services
jest.mock('../../../services/reservationService');
jest.mock('../../../services/schedulingService');

// Store for calendar events
let mockCalendarEvents: any[] = [];

// Mock FullCalendar to avoid rendering issues in tests
jest.mock('@fullcalendar/react', () => {
  return function MockFullCalendar(props: any) {
    // Store events for testing
    mockCalendarEvents = props.events || [];
    return <div data-testid="mock-calendar">Mock Calendar</div>;
  };
});

describe('SpecializedCalendar Timezone Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalendarEvents = [];

    // Mock reservations to return empty array
    (reservationService.getAllReservations as jest.Mock).mockResolvedValue({
      status: 'success',
      data: { reservations: [] },
    });
  });

  describe('Training Session Date Parsing', () => {
    it('should handle Sunday (day 0) classes correctly', async () => {
      // This is the exact bug scenario: Sunday Nov 2, 2025
      const mockClasses = [
        {
          id: 'class-sunday',
          name: 'Basic Obedience',
          startDate: '2025-11-02',
          totalWeeks: 6,
          daysOfWeek: [0], // Sunday
          startTime: '18:00',
          duration: 60,
          isActive: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-sunday',
          sessionNumber: 1,
          scheduledDate: '2025-11-02T00:00:00.000Z', // Nov 2 (Sunday)
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-2',
          classId: 'class-sunday',
          sessionNumber: 2,
          scheduledDate: '2025-11-09T00:00:00.000Z', // Nov 9 (Sunday)
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-3',
          classId: 'class-sunday',
          sessionNumber: 3,
          scheduledDate: '2025-11-16T00:00:00.000Z', // Nov 16 (Sunday)
          scheduledTime: '18:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(
          schedulingService.trainingClasses.getSessions
        ).toHaveBeenCalled();
      });

      const events = mockCalendarEvents;
      expect(events).toHaveLength(3);

      // All sessions should be on Sundays (day 0)
      events.forEach((event: any) => {
        expect(event.start.getDay()).toBe(0); // Sunday
      });

      // Verify specific dates: Nov 2, 9, 16
      expect(events[0].start.getMonth()).toBe(10); // November
      expect(events[0].start.getDate()).toBe(2);

      expect(events[1].start.getMonth()).toBe(10); // November
      expect(events[1].start.getDate()).toBe(9);

      expect(events[2].start.getMonth()).toBe(10); // November
      expect(events[2].start.getDate()).toBe(16);
    });

    it('should parse UTC date strings to local dates without timezone shift', async () => {
      // Mock training classes
      const mockClasses = [
        {
          id: 'class-1',
          name: 'Puppy Training',
          startDate: '2024-11-04',
          totalWeeks: 2,
          daysOfWeek: [0],
          startTime: '18:00',
          duration: 60,
          isActive: true,
        },
      ];

      // Mock sessions with UTC dates (as they come from the backend)
      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-1',
          sessionNumber: 1,
          scheduledDate: '2024-11-04T00:00:00.000Z', // Nov 4 midnight UTC
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-2',
          classId: 'class-1',
          sessionNumber: 2,
          scheduledDate: '2024-11-11T00:00:00.000Z', // Nov 11 midnight UTC
          scheduledTime: '18:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(schedulingService.trainingClasses.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(
          schedulingService.trainingClasses.getSessions
        ).toHaveBeenCalled();
      });

      // Get the events that were passed to FullCalendar
      const events = mockCalendarEvents;
      expect(events).toHaveLength(2);

      // Verify first session is on Nov 4 (not Nov 3)
      const firstEvent = events[0];
      expect(firstEvent.start).toBeInstanceOf(Date);
      expect(firstEvent.start.getFullYear()).toBe(2024);
      expect(firstEvent.start.getMonth()).toBe(10); // November (0-indexed)
      expect(firstEvent.start.getDate()).toBe(4); // Should be 4, not 3
      expect(firstEvent.start.getHours()).toBe(18); // 6 PM
      expect(firstEvent.start.getMinutes()).toBe(0);

      // Verify second session is on Nov 11
      const secondEvent = events[1];
      expect(secondEvent.start.getDate()).toBe(11);
      expect(secondEvent.start.getMonth()).toBe(10); // November
    });

    it('should handle sessions across different months', async () => {
      const mockClasses = [
        {
          id: 'class-2',
          name: 'Advanced Training',
          startDate: '2024-10-28',
          totalWeeks: 2,
          daysOfWeek: [0],
          startTime: '19:00',
          duration: 60,
          isActive: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-2',
          sessionNumber: 1,
          scheduledDate: '2024-10-28T00:00:00.000Z', // Oct 28
          scheduledTime: '19:00',
          duration: 60,
        },
        {
          id: 'session-2',
          classId: 'class-2',
          sessionNumber: 2,
          scheduledDate: '2024-11-04T00:00:00.000Z', // Nov 4
          scheduledTime: '19:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(2);
      });

      const events = mockCalendarEvents;

      // First session in October
      expect(events[0].start.getMonth()).toBe(9); // October
      expect(events[0].start.getDate()).toBe(28);

      // Second session in November
      expect(events[1].start.getMonth()).toBe(10); // November
      expect(events[1].start.getDate()).toBe(4);
    });

    it('should handle sessions across year boundary', async () => {
      const mockClasses = [
        {
          id: 'class-3',
          name: 'New Year Training',
          startDate: '2024-12-30',
          totalWeeks: 2,
          daysOfWeek: [0],
          startTime: '18:00',
          duration: 60,
          isActive: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-3',
          sessionNumber: 1,
          scheduledDate: '2024-12-30T00:00:00.000Z', // Dec 30, 2024
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-2',
          classId: 'class-3',
          sessionNumber: 2,
          scheduledDate: '2025-01-06T00:00:00.000Z', // Jan 6, 2025
          scheduledTime: '18:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(2);
      });

      const events = mockCalendarEvents;

      // First session in 2024
      expect(events[0].start.getFullYear()).toBe(2024);
      expect(events[0].start.getMonth()).toBe(11); // December
      expect(events[0].start.getDate()).toBe(30);

      // Second session in 2025
      expect(events[1].start.getFullYear()).toBe(2025);
      expect(events[1].start.getMonth()).toBe(0); // January
      expect(events[1].start.getDate()).toBe(6);
    });

    it('should handle leap year dates correctly', async () => {
      const mockClasses = [
        {
          id: 'class-4',
          name: 'Leap Year Training',
          startDate: '2024-02-26',
          totalWeeks: 2,
          daysOfWeek: [0, 3],
          startTime: '18:00',
          duration: 60,
          isActive: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-4',
          sessionNumber: 1,
          scheduledDate: '2024-02-26T00:00:00.000Z', // Feb 26
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-2',
          classId: 'class-4',
          sessionNumber: 2,
          scheduledDate: '2024-02-29T00:00:00.000Z', // Feb 29 (leap day)
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-3',
          classId: 'class-4',
          sessionNumber: 3,
          scheduledDate: '2024-03-04T00:00:00.000Z', // Mar 4
          scheduledTime: '18:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(3);
      });

      const events = mockCalendarEvents;

      // Feb 26
      expect(events[0].start.getMonth()).toBe(1); // February
      expect(events[0].start.getDate()).toBe(26);

      // Feb 29 (leap day)
      expect(events[1].start.getMonth()).toBe(1); // February
      expect(events[1].start.getDate()).toBe(29);

      // Mar 4
      expect(events[2].start.getMonth()).toBe(2); // March
      expect(events[2].start.getDate()).toBe(4);
    });
  });

  describe('Time Handling', () => {
    it('should correctly parse different time formats', async () => {
      const mockClasses = [
        {
          id: 'class-5',
          name: 'Morning Training',
          startDate: '2024-11-04',
          totalWeeks: 1,
          daysOfWeek: [0],
          startTime: '09:30',
          duration: 60,
          isActive: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-5',
          sessionNumber: 1,
          scheduledDate: '2024-11-04T00:00:00.000Z',
          scheduledTime: '09:30',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(1);
      });

      const events = mockCalendarEvents;
      const event = events[0];

      expect(event.start.getHours()).toBe(9);
      expect(event.start.getMinutes()).toBe(30);
    });

    it('should calculate correct end times based on duration', async () => {
      const mockClasses = [
        {
          id: 'class-6',
          name: 'Extended Training',
          startDate: '2024-11-04',
          totalWeeks: 1,
          daysOfWeek: [0],
          startTime: '18:00',
          duration: 90,
          isActive: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-6',
          sessionNumber: 1,
          scheduledDate: '2024-11-04T00:00:00.000Z',
          scheduledTime: '18:00',
          duration: 90,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(1);
      });

      const events = mockCalendarEvents;
      const event = events[0];

      // Start: 6:00 PM
      expect(event.start.getHours()).toBe(18);
      expect(event.start.getMinutes()).toBe(0);

      // End: 7:30 PM (90 minutes later)
      expect(event.end.getHours()).toBe(19);
      expect(event.end.getMinutes()).toBe(30);
    });

    it('should handle sessions that span midnight', async () => {
      const mockClasses = [
        {
          id: 'class-7',
          name: 'Late Night Training',
          startDate: '2024-11-04',
          totalWeeks: 1,
          daysOfWeek: [0],
          startTime: '23:30',
          duration: 90,
          isActive: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-7',
          sessionNumber: 1,
          scheduledDate: '2024-11-04T00:00:00.000Z',
          scheduledTime: '23:30',
          duration: 90,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(1);
      });

      const events = mockCalendarEvents;
      const event = events[0];

      // Start: 11:30 PM on Nov 4
      expect(event.start.getDate()).toBe(4);
      expect(event.start.getHours()).toBe(23);
      expect(event.start.getMinutes()).toBe(30);

      // End: 1:00 AM on Nov 5 (next day)
      expect(event.end.getDate()).toBe(5);
      expect(event.end.getHours()).toBe(1);
      expect(event.end.getMinutes()).toBe(0);
    });
  });

  describe('Multiple Classes', () => {
    it('should handle multiple classes with different schedules without date conflicts', async () => {
      const mockClasses = [
        {
          id: 'class-8',
          name: 'Morning Class',
          startDate: '2024-11-04',
          totalWeeks: 1,
          daysOfWeek: [0],
          startTime: '09:00',
          duration: 60,
          isActive: true,
        },
        {
          id: 'class-9',
          name: 'Evening Class',
          startDate: '2024-11-04',
          totalWeeks: 1,
          daysOfWeek: [0],
          startTime: '18:00',
          duration: 60,
          isActive: true,
        },
      ];

      const mockSessions1 = [
        {
          id: 'session-1',
          classId: 'class-8',
          sessionNumber: 1,
          scheduledDate: '2024-11-04T00:00:00.000Z',
          scheduledTime: '09:00',
          duration: 60,
        },
      ];

      const mockSessions2 = [
        {
          id: 'session-2',
          classId: 'class-9',
          sessionNumber: 1,
          scheduledDate: '2024-11-04T00:00:00.000Z',
          scheduledTime: '18:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (schedulingService.trainingClasses.getSessions as jest.Mock)
        .mockResolvedValueOnce(mockSessions1)
        .mockResolvedValueOnce(mockSessions2);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(2);
      });

      const events = mockCalendarEvents;

      // Both should be on Nov 4
      expect(events[0].start.getDate()).toBe(4);
      expect(events[1].start.getDate()).toBe(4);

      // But at different times
      expect(events[0].start.getHours()).toBe(9);
      expect(events[1].start.getHours()).toBe(18);
    });
  });

  describe('DST Edge Cases', () => {
    it('should handle dates during spring DST transition (March)', async () => {
      const mockClasses = [
        {
          id: 'class-10',
          name: 'Spring DST Training',
          startDate: '2024-03-04',
          totalWeeks: 3,
          daysOfWeek: [0],
          startTime: '18:00',
          duration: 60,
          isActive: true,
        },
      ];

      // March 10, 2024 is when DST starts in US (2 AM -> 3 AM)
      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-10',
          sessionNumber: 1,
          scheduledDate: '2024-03-04T00:00:00.000Z', // Before DST
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-2',
          classId: 'class-10',
          sessionNumber: 2,
          scheduledDate: '2024-03-11T00:00:00.000Z', // After DST
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-3',
          classId: 'class-10',
          sessionNumber: 3,
          scheduledDate: '2024-03-18T00:00:00.000Z', // After DST
          scheduledTime: '18:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(3);
      });

      const events = mockCalendarEvents;

      // All sessions should be on the correct dates
      expect(events[0].start.getDate()).toBe(4);
      expect(events[1].start.getDate()).toBe(11);
      expect(events[2].start.getDate()).toBe(18);

      // All should be in March
      events.forEach((event: any) => {
        expect(event.start.getMonth()).toBe(2); // March
      });

      // All should maintain the same local time (6 PM)
      events.forEach((event: any) => {
        expect(event.start.getHours()).toBe(18);
      });
    });

    it('should handle dates during fall DST transition (November)', async () => {
      const mockClasses = [
        {
          id: 'class-11',
          name: 'Fall DST Training',
          startDate: '2024-10-28',
          totalWeeks: 3,
          daysOfWeek: [0],
          startTime: '18:00',
          duration: 60,
          isActive: true,
        },
      ];

      // November 3, 2024 is when DST ends in US (2 AM -> 1 AM)
      const mockSessions = [
        {
          id: 'session-1',
          classId: 'class-11',
          sessionNumber: 1,
          scheduledDate: '2024-10-28T00:00:00.000Z', // Before DST ends
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-2',
          classId: 'class-11',
          sessionNumber: 2,
          scheduledDate: '2024-11-04T00:00:00.000Z', // After DST ends
          scheduledTime: '18:00',
          duration: 60,
        },
        {
          id: 'session-3',
          classId: 'class-11',
          sessionNumber: 3,
          scheduledDate: '2024-11-11T00:00:00.000Z', // After DST ends
          scheduledTime: '18:00',
          duration: 60,
        },
      ];

      (schedulingService.trainingClasses.getAll as jest.Mock).mockResolvedValue(
        mockClasses
      );
      (
        schedulingService.trainingClasses.getSessions as jest.Mock
      ).mockResolvedValue(mockSessions);

      render(
        <BrowserRouter>
          <SpecializedCalendar serviceCategories={[ServiceCategory.TRAINING]} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const events = mockCalendarEvents;
        expect(events).toHaveLength(3);
      });

      const events = mockCalendarEvents;

      // Verify dates are correct
      expect(events[0].start.getDate()).toBe(28);
      expect(events[0].start.getMonth()).toBe(9); // October

      expect(events[1].start.getDate()).toBe(4);
      expect(events[1].start.getMonth()).toBe(10); // November

      expect(events[2].start.getDate()).toBe(11);
      expect(events[2].start.getMonth()).toBe(10); // November

      // All should maintain the same local time (6 PM)
      events.forEach((event: any) => {
        expect(event.start.getHours()).toBe(18);
      });
    });
  });
});
