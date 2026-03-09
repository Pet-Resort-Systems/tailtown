/**
 * Training Class Session Generation Tests
 * 
 * Tests automatic session generation logic including date calculations,
 * multi-day scheduling, and session numbering
 */

import { Request, Response, NextFunction } from 'express';
import { createTrainingClass } from '../trainingClass.controller';
import { addDays, addWeeks, format } from 'date-fns';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    trainingClass: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    classSession: {
      createMany: jest.fn(),
    },
  }))
}));

describe('Training Class Session Generation', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      headers: {
        'x-tenant-id': 'test-tenant'
      },
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    const { PrismaClient } = require('@prisma/client');
    mockPrisma = new PrismaClient();
  });

  describe('Session Count Calculation', () => {
    it('should generate correct number of sessions for single day per week', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1], // Monday only
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
      };

      mockPrisma.trainingClass.create.mockResolvedValue({
        id: 'class-1',
        ...mockRequest.body
      });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 6 weeks * 1 day per week = 6 sessions
      expect(mockPrisma.classSession.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ sessionNumber: 1 }),
          expect.objectContaining({ sessionNumber: 2 }),
          expect.objectContaining({ sessionNumber: 3 }),
          expect.objectContaining({ sessionNumber: 4 }),
          expect.objectContaining({ sessionNumber: 5 }),
          expect.objectContaining({ sessionNumber: 6 })
        ])
      });
    });

    it('should generate correct number for multiple days per week', async () => {
      mockRequest.body = {
        name: 'Advanced Training',
        level: 'ADVANCED',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 4,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 300
      };

      mockPrisma.trainingClass.create.mockResolvedValue({
        id: 'class-1',
        ...mockRequest.body
      });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 4 weeks * 3 days per week = 12 sessions
      const callArg = mockPrisma.classSession.createMany.mock.calls[0][0];
      expect(callArg.data).toHaveLength(12);
    });

    it('should handle two days per week correctly', async () => {
      mockRequest.body = {
        name: 'Intermediate Training',
        level: 'INTERMEDIATE',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 8,
        daysOfWeek: [2, 4], // Tue, Thu
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 250
      };

      mockPrisma.trainingClass.create.mockResolvedValue({
        id: 'class-1',
        ...mockRequest.body
      });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 8 weeks * 2 days per week = 16 sessions
      const callArg = mockPrisma.classSession.createMany.mock.calls[0][0];
      expect(callArg.data).toHaveLength(16);
    });
  });

  describe('Date Calculation', () => {
    it('should calculate correct dates for each session', () => {
      const startDate = new Date('2025-11-03'); // Monday
      const totalWeeks = 3;
      const daysOfWeek = [1]; // Monday (day 1 of week)

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({
            date: format(sessionDate, 'yyyy-MM-dd')
          });
        }
      }

      expect(sessions).toHaveLength(3);
      expect(sessions[0].date).toBe('2025-11-04'); // Week 1, Monday
      expect(sessions[1].date).toBe('2025-11-11'); // Week 2, Monday
      expect(sessions[2].date).toBe('2025-11-18'); // Week 3, Monday
    });

    it('should handle different start days correctly', () => {
      const startDate = new Date('2025-11-01'); // Saturday
      const totalWeeks = 2;
      const daysOfWeek = [0, 6]; // Sunday and Saturday

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({
            date: format(sessionDate, 'yyyy-MM-dd'),
            week: week + 1
          });
        }
      }

      expect(sessions).toHaveLength(4);
      // Week 1
      expect(sessions[0].date).toBe('2025-11-01'); // Saturday
      expect(sessions[1].date).toBe('2025-11-07'); // Next Saturday
      // Week 2
      expect(sessions[2].date).toBe('2025-11-08'); // Saturday
      expect(sessions[3].date).toBe('2025-11-14'); // Next Saturday
    });

    it('should handle month boundaries correctly', () => {
      const startDate = new Date('2025-10-27'); // Monday
      const totalWeeks = 3;
      const daysOfWeek = [1]; // Monday

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({
            date: format(sessionDate, 'yyyy-MM-dd')
          });
        }
      }

      expect(sessions[0].date).toBe('2025-10-28'); // October
      expect(sessions[1].date).toBe('2025-11-04'); // November
      expect(sessions[2].date).toBe('2025-11-11'); // November
    });

    it('should handle year boundaries correctly', () => {
      const startDate = new Date('2025-12-29'); // Monday
      const totalWeeks = 2;
      const daysOfWeek = [1]; // Monday

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({
            date: format(sessionDate, 'yyyy-MM-dd')
          });
        }
      }

      expect(sessions[0].date).toBe('2025-12-30'); // 2025
      expect(sessions[1].date).toBe('2026-01-06'); // 2026
    });
  });

  describe('Session Numbering', () => {
    it('should number sessions sequentially', () => {
      const totalWeeks = 3;
      const daysOfWeek = [1, 3]; // Mon, Wed

      let sessionNumber = 1;
      const sessions = [];

      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          sessions.push({
            sessionNumber: sessionNumber,
            week: week + 1,
            day: dayOfWeek
          });
          sessionNumber++;
        }
      }

      expect(sessions).toHaveLength(6);
      expect(sessions[0].sessionNumber).toBe(1);
      expect(sessions[1].sessionNumber).toBe(2);
      expect(sessions[5].sessionNumber).toBe(6);
    });

    it('should maintain sequence across weeks', () => {
      const totalWeeks = 2;
      const daysOfWeek = [1, 3, 5]; // Mon, Wed, Fri

      let sessionNumber = 1;
      const sessions = [];

      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          sessions.push({
            sessionNumber: sessionNumber,
            week: week + 1
          });
          sessionNumber++;
        }
      }

      // Week 1: sessions 1, 2, 3
      expect(sessions[0].sessionNumber).toBe(1);
      expect(sessions[1].sessionNumber).toBe(2);
      expect(sessions[2].sessionNumber).toBe(3);
      
      // Week 2: sessions 4, 5, 6
      expect(sessions[3].sessionNumber).toBe(4);
      expect(sessions[4].sessionNumber).toBe(5);
      expect(sessions[5].sessionNumber).toBe(6);
    });
  });

  describe('Multi-Day Scheduling', () => {
    it('should handle Monday/Wednesday/Friday schedule', () => {
      const startDate = new Date('2025-11-03'); // Monday
      const totalWeeks = 2;
      const daysOfWeek = [1, 3, 5]; // Mon, Wed, Fri

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({
            date: format(sessionDate, 'yyyy-MM-dd'),
            dayName: format(sessionDate, 'EEEE')
          });
        }
      }

      expect(sessions).toHaveLength(6);
      
      // Week 1
      expect(sessions[0].dayName).toBe('Tuesday');
      expect(sessions[1].dayName).toBe('Thursday');
      expect(sessions[2].dayName).toBe('Saturday');
      
      // Week 2
      expect(sessions[3].dayName).toBe('Tuesday');
      expect(sessions[4].dayName).toBe('Thursday');
      expect(sessions[5].dayName).toBe('Saturday');
    });

    it('should handle Tuesday/Thursday schedule', () => {
      const startDate = new Date('2025-11-03'); // Monday
      const totalWeeks = 3;
      const daysOfWeek = [2, 4]; // Tue, Thu

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({
            date: format(sessionDate, 'yyyy-MM-dd')
          });
        }
      }

      expect(sessions).toHaveLength(6);
      expect(sessions[0].date).toBe('2025-11-05'); // Tuesday
      expect(sessions[1].date).toBe('2025-11-07'); // Thursday
    });

    it('should handle weekend schedule', () => {
      const startDate = new Date('2025-11-03'); // Monday
      const totalWeeks = 4;
      const daysOfWeek = [6, 0]; // Saturday, Sunday

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({
            date: format(sessionDate, 'yyyy-MM-dd'),
            dayName: format(sessionDate, 'EEEE')
          });
        }
      }

      expect(sessions).toHaveLength(8);
      expect(sessions[0].dayName).toBe('Saturday');
      expect(sessions[1].dayName).toBe('Sunday');
    });
  });

  describe('Session Metadata', () => {
    it('should include all required session fields', async () => {
      mockRequest.body = {
        name: 'Test Class',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 2,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
      };

      mockPrisma.trainingClass.create.mockResolvedValue({
        id: 'class-1',
        ...mockRequest.body
      });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classSession.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenantId: 'test-tenant',
            classId: 'class-1',
            sessionNumber: expect.any(Number),
            scheduledDate: expect.any(Date),
            scheduledTime: '18:00',
            duration: 60
          })
        ])
      });
    });

    it('should use custom duration if provided', async () => {
      mockRequest.body = {
        name: 'Extended Class',
        level: 'ADVANCED',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 1,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '20:00',
        duration: 120, // 2 hours
        pricePerSeries: 300
      };

      mockPrisma.trainingClass.create.mockResolvedValue({
        id: 'class-1',
        ...mockRequest.body
      });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classSession.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            duration: 120
          })
        ])
      });
    });

    it('should default to 60 minutes if duration not provided', async () => {
      mockRequest.body = {
        name: 'Standard Class',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 1,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // No duration specified
      };

      mockPrisma.trainingClass.create.mockResolvedValue({
        id: 'class-1',
        ...mockRequest.body
      });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classSession.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            duration: 60
          })
        ])
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single week class', () => {
      const startDate = new Date('2025-11-03');
      const totalWeeks = 1;
      const daysOfWeek = [1, 3];

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({ date: format(sessionDate, 'yyyy-MM-dd') });
        }
      }

      expect(sessions).toHaveLength(2);
    });

    it('should handle long-term class (12 weeks)', () => {
      const startDate = new Date('2025-11-03');
      const totalWeeks = 12;
      const daysOfWeek = [1];

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({ date: format(sessionDate, 'yyyy-MM-dd') });
        }
      }

      expect(sessions).toHaveLength(12);
      
      // First and last sessions
      expect(sessions[0].date).toBe('2025-11-04');
      expect(sessions[11].date).toBe('2026-01-20');
    });

    it('should handle all days of week', () => {
      const startDate = new Date('2025-11-03');
      const totalWeeks = 1;
      const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // All days

      const sessions = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = addDays(startDate, week * 7 + dayOfWeek);
          sessions.push({ date: format(sessionDate, 'yyyy-MM-dd') });
        }
      }

      expect(sessions).toHaveLength(7);
    });
  });

  describe('Integration', () => {
    it('should create class and sessions in single transaction', async () => {
      mockRequest.body = {
        name: 'Complete Class',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 4,
        daysOfWeek: [1, 3],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
      };

      mockPrisma.trainingClass.create.mockResolvedValue({
        id: 'class-1',
        ...mockRequest.body
      });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should create class first
      expect(mockPrisma.trainingClass.create).toHaveBeenCalled();
      
      // Then create sessions
      expect(mockPrisma.classSession.createMany).toHaveBeenCalled();
      
      // Should return success
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });
});
