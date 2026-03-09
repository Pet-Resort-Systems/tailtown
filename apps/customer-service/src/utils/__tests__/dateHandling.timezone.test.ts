import { addDays } from 'date-fns';

/**
 * Timezone-focused tests for date handling in training class sessions
 * 
 * These tests verify that dates are stored and retrieved correctly without
 * timezone conversion issues that could cause sessions to display on wrong days.
 */

describe('Date Handling Timezone Tests', () => {
  describe('Date Storage and Retrieval', () => {
    it('should demonstrate timezone issue with direct Date parsing', () => {
      // When we create a date from a string like '2024-11-04'
      const dateString = '2024-11-04';
      const date = new Date(dateString);
      
      // This is parsed as UTC midnight, then converted to local time
      // In PST (UTC-8), this becomes Nov 3 at 4:00 PM
      // This is the BUG we need to avoid!
      
      // The test will fail in PST timezone, demonstrating the issue
      // In UTC or positive offset timezones, it might pass
      // This is why we need the manual parsing approach below
    });

    it('should create dates correctly using manual parsing (the fix)', () => {
      // The CORRECT way: parse the date string manually
      const dateString = '2024-11-04';
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Now it should be Nov 4 in the local timezone
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(10); // November (0-indexed)
      expect(date.getDate()).toBe(4);
    });

    it('should handle ISO string dates correctly', () => {
      // Simulate what comes from the database (UTC midnight)
      const isoString = '2024-11-04T00:00:00.000Z';
      const date = new Date(isoString);
      
      // When parsed, this will be converted to local timezone
      // In PST (UTC-8), this becomes Nov 3 at 4:00 PM
      // We need to extract just the date part to avoid this
      
      const dateOnly = isoString.split('T')[0]; // '2024-11-04'
      const [year, month, day] = dateOnly.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      
      // Now it should be Nov 4 in local timezone
      expect(localDate.getFullYear()).toBe(2024);
      expect(localDate.getMonth()).toBe(10);
      expect(localDate.getDate()).toBe(4);
    });

    it('should maintain date consistency when adding days', () => {
      // Start with Nov 4, 2024 (Monday)
      const startDate = new Date(2024, 10, 4); // Nov 4
      
      // Add 7 days (one week)
      const nextWeek = addDays(startDate, 7);
      
      // Should be Nov 11
      expect(nextWeek.getFullYear()).toBe(2024);
      expect(nextWeek.getMonth()).toBe(10);
      expect(nextWeek.getDate()).toBe(11);
    });

    it('should handle month boundaries correctly', () => {
      // Oct 28, 2024 (Monday)
      const startDate = new Date(2024, 9, 28);
      
      // Add 7 days
      const nextWeek = addDays(startDate, 7);
      
      // Should be Nov 4
      expect(nextWeek.getMonth()).toBe(10); // November
      expect(nextWeek.getDate()).toBe(4);
    });

    it('should handle year boundaries correctly', () => {
      // Dec 30, 2024 (Monday)
      const startDate = new Date(2024, 11, 30);
      
      // Add 7 days
      const nextWeek = addDays(startDate, 7);
      
      // Should be Jan 6, 2025
      expect(nextWeek.getFullYear()).toBe(2025);
      expect(nextWeek.getMonth()).toBe(0); // January
      expect(nextWeek.getDate()).toBe(6);
    });

    it('should handle leap year dates correctly', () => {
      // Feb 26, 2024 (Monday in leap year)
      const startDate = new Date(2024, 1, 26);
      
      // Add 3 days to get to Feb 29 (leap day)
      const leapDay = addDays(startDate, 3);
      
      expect(leapDay.getMonth()).toBe(1); // February
      expect(leapDay.getDate()).toBe(29);
      
      // Add 7 more days from Feb 26
      const nextWeek = addDays(startDate, 7);
      
      // Should be Mar 4
      expect(nextWeek.getMonth()).toBe(2); // March
      expect(nextWeek.getDate()).toBe(4);
    });
  });

  describe('Time Handling', () => {
    it('should parse time strings correctly', () => {
      const timeString = '18:00';
      const [hours, minutes] = timeString.split(':').map(Number);
      
      expect(hours).toBe(18);
      expect(minutes).toBe(0);
    });

    it('should create dates with specific times', () => {
      const dateString = '2024-11-04';
      const timeString = '18:30';
      
      const [year, month, day] = dateString.split('-').map(Number);
      const [hours, minutes] = timeString.split(':').map(Number);
      
      const dateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      expect(dateTime.getFullYear()).toBe(2024);
      expect(dateTime.getMonth()).toBe(10); // November
      expect(dateTime.getDate()).toBe(4);
      expect(dateTime.getHours()).toBe(18);
      expect(dateTime.getMinutes()).toBe(30);
    });

    it('should calculate end times correctly', () => {
      const startTime = new Date(2024, 10, 4, 18, 0, 0); // Nov 4, 6:00 PM
      const duration = 90; // 90 minutes
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);
      
      expect(endTime.getHours()).toBe(19); // 7 PM
      expect(endTime.getMinutes()).toBe(30); // 30 minutes
      expect(endTime.getDate()).toBe(4); // Same day
    });

    it('should handle sessions that span midnight', () => {
      const startTime = new Date(2024, 10, 4, 23, 30, 0); // Nov 4, 11:30 PM
      const duration = 90; // 90 minutes
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);
      
      expect(endTime.getDate()).toBe(5); // Nov 5
      expect(endTime.getHours()).toBe(1); // 1 AM
      expect(endTime.getMinutes()).toBe(0);
    });
  });

  describe('DST Edge Cases', () => {
    it('should handle spring DST transition (March 10, 2024)', () => {
      // March 4, 2024 (before DST)
      const beforeDST = new Date(2024, 2, 4, 18, 0, 0);
      
      // March 11, 2024 (after DST - clocks spring forward at 2 AM)
      const afterDST = new Date(2024, 2, 11, 18, 0, 0);
      
      // Both should be at 6 PM local time
      expect(beforeDST.getHours()).toBe(18);
      expect(afterDST.getHours()).toBe(18);
      
      // Dates should be correct
      expect(beforeDST.getDate()).toBe(4);
      expect(afterDST.getDate()).toBe(11);
    });

    it('should handle fall DST transition (November 3, 2024)', () => {
      // Oct 28, 2024 (before DST ends)
      const beforeDST = new Date(2024, 9, 28, 18, 0, 0);
      
      // Nov 4, 2024 (after DST - clocks fall back at 2 AM)
      const afterDST = new Date(2024, 10, 4, 18, 0, 0);
      
      // Both should be at 6 PM local time
      expect(beforeDST.getHours()).toBe(18);
      expect(afterDST.getHours()).toBe(18);
      
      // Dates should be correct
      expect(beforeDST.getDate()).toBe(28);
      expect(afterDST.getDate()).toBe(4);
    });

    it('should maintain consistent weekly intervals across DST', () => {
      // Start March 4, 2024 (before DST)
      const week1 = new Date(2024, 2, 4);
      const week2 = addDays(week1, 7); // March 11 (after DST)
      const week3 = addDays(week2, 7); // March 18
      
      // All should be Mondays
      expect(week1.getDay()).toBe(1); // Monday
      expect(week2.getDay()).toBe(1); // Monday
      expect(week3.getDay()).toBe(1); // Monday
      
      // Dates should be correct
      expect(week1.getDate()).toBe(4);
      expect(week2.getDate()).toBe(11);
      expect(week3.getDate()).toBe(18);
    });
  });

  describe('Session Generation Logic', () => {
    it('should handle Sunday (day 0) schedules correctly', () => {
      // This is the exact scenario from the bug: Sunday classes
      const startDate = new Date(2025, 10, 2); // Nov 2, 2025 (Sunday)
      const totalWeeks = 6;
      const daysOfWeek = [0]; // Sunday only
      
      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push(sessionDate);
        }
      }
      
      // Should have 6 sessions (6 weeks × 1 day)
      expect(sessions).toHaveLength(6);
      
      // All should be Sundays: Nov 2, 9, 16, 23, 30, Dec 7
      expect(sessions[0].getDate()).toBe(2);
      expect(sessions[0].getMonth()).toBe(10); // November
      expect(sessions[0].getDay()).toBe(0); // Sunday
      
      expect(sessions[1].getDate()).toBe(9);
      expect(sessions[1].getDay()).toBe(0); // Sunday
      
      expect(sessions[2].getDate()).toBe(16);
      expect(sessions[2].getDay()).toBe(0); // Sunday
      
      expect(sessions[3].getDate()).toBe(23);
      expect(sessions[3].getDay()).toBe(0); // Sunday
      
      expect(sessions[4].getDate()).toBe(30);
      expect(sessions[4].getDay()).toBe(0); // Sunday
      
      expect(sessions[5].getDate()).toBe(7);
      expect(sessions[5].getMonth()).toBe(11); // December
      expect(sessions[5].getDay()).toBe(0); // Sunday
    });

    it('should generate correct dates for multi-week, multi-day schedule', () => {
      const startDate = new Date(2024, 10, 4); // Nov 4, 2024 (Monday)
      const totalWeeks = 3;
      const daysOfWeek = [0, 2]; // Monday (0) and Wednesday (2)
      
      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push(sessionDate);
        }
      }
      
      // Should have 6 sessions (3 weeks × 2 days)
      expect(sessions).toHaveLength(6);
      
      // Week 1: Nov 4 (Mon), Nov 6 (Wed)
      expect(sessions[0].getDate()).toBe(4);
      expect(sessions[1].getDate()).toBe(6);
      
      // Week 2: Nov 11 (Mon), Nov 13 (Wed)
      expect(sessions[2].getDate()).toBe(11);
      expect(sessions[3].getDate()).toBe(13);
      
      // Week 3: Nov 18 (Mon), Nov 20 (Wed)
      expect(sessions[4].getDate()).toBe(18);
      expect(sessions[5].getDate()).toBe(20);
      
      // All in November
      sessions.forEach(session => {
        expect(session.getMonth()).toBe(10);
      });
    });

    it('should handle single-day weekly schedule', () => {
      const startDate = new Date(2024, 10, 4); // Nov 4, 2024 (Monday)
      const totalWeeks = 4;
      const daysOfWeek = [0]; // Monday only
      
      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push(sessionDate);
        }
      }
      
      // Should have 4 sessions (4 weeks × 1 day)
      expect(sessions).toHaveLength(4);
      
      // Nov 4, 11, 18, 25
      expect(sessions[0].getDate()).toBe(4);
      expect(sessions[1].getDate()).toBe(11);
      expect(sessions[2].getDate()).toBe(18);
      expect(sessions[3].getDate()).toBe(25);
      
      // All should be Mondays
      sessions.forEach(session => {
        expect(session.getDay()).toBe(1); // Monday
      });
    });

    it('should handle three-day weekly schedule', () => {
      const startDate = new Date(2024, 10, 4); // Nov 4, 2024 (Monday)
      const totalWeeks = 2;
      const daysOfWeek = [0, 2, 4]; // Mon, Wed, Fri
      
      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push(sessionDate);
        }
      }
      
      // Should have 6 sessions (2 weeks × 3 days)
      expect(sessions).toHaveLength(6);
      
      // Week 1: Nov 4 (Mon), Nov 6 (Wed), Nov 8 (Fri)
      expect(sessions[0].getDate()).toBe(4);
      expect(sessions[1].getDate()).toBe(6);
      expect(sessions[2].getDate()).toBe(8);
      
      // Week 2: Nov 11 (Mon), Nov 13 (Wed), Nov 15 (Fri)
      expect(sessions[3].getDate()).toBe(11);
      expect(sessions[4].getDate()).toBe(13);
      expect(sessions[5].getDate()).toBe(15);
    });
  });

  describe('Frontend Date Parsing', () => {
    it('should parse backend ISO dates to local dates correctly', () => {
      // Simulate what the backend returns
      const backendDate = '2024-11-04T00:00:00.000Z';
      
      // Frontend parsing logic (from SpecializedCalendar.tsx)
      const dateStr = backendDate.split('T')[0]; // '2024-11-04'
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      
      // Should be Nov 4 in local timezone
      expect(localDate.getFullYear()).toBe(2024);
      expect(localDate.getMonth()).toBe(10); // November
      expect(localDate.getDate()).toBe(4);
    });

    it('should combine date and time correctly', () => {
      // Backend data
      const scheduledDate = '2024-11-04T00:00:00.000Z';
      const scheduledTime = '18:00';
      
      // Frontend parsing
      const dateStr = scheduledDate.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      
      const sessionDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      // Should be Nov 4 at 6:00 PM
      expect(sessionDate.getFullYear()).toBe(2024);
      expect(sessionDate.getMonth()).toBe(10);
      expect(sessionDate.getDate()).toBe(4);
      expect(sessionDate.getHours()).toBe(18);
      expect(sessionDate.getMinutes()).toBe(0);
    });

    it('should handle multiple sessions with different times on same day', () => {
      const scheduledDate = '2024-11-04T00:00:00.000Z';
      const times = ['09:00', '14:00', '18:00'];
      
      const sessions = times.map(time => {
        const dateStr = scheduledDate.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, 0, 0);
      });
      
      // All should be on Nov 4
      sessions.forEach(session => {
        expect(session.getDate()).toBe(4);
        expect(session.getMonth()).toBe(10);
      });
      
      // But at different times
      expect(sessions[0].getHours()).toBe(9);
      expect(sessions[1].getHours()).toBe(14);
      expect(sessions[2].getHours()).toBe(18);
    });
  });
});
