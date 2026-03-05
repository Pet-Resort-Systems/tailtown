import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  createTrainingClass, 
  getTrainingClassById,
  getClassSessions 
} from '../trainingClass.controller';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    trainingClass: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    classSession: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('Training Class Timezone Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      headers: { 'x-tenant-id': 'test-tenant' },
      body: {},
      params: {},
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('Session Date Storage', () => {
    it('should store session dates without timezone conversion', async () => {
      const startDate = '2024-11-04'; // Monday, Nov 4, 2024
      const startTime = '18:00';
      
      mockRequest.body = {
        name: 'Puppy Training',
        description: 'Basic puppy training',
        instructorId: 'instructor-1',
        maxCapacity: 10,
        pricePerSeries: 200,
        startDate,
        totalWeeks: 4,
        daysOfWeek: [0], // Monday only
        startTime,
        duration: 60,
        isActive: true,
      };

      const mockClass = {
        id: 'class-1',
        tenantId: 'test-tenant',
        name: 'Puppy Training',
        startDate: new Date(startDate),
        totalWeeks: 4,
        daysOfWeek: [0],
        startTime,
        duration: 60,
      };

      (prisma.trainingClass.create as jest.Mock).mockResolvedValue(mockClass);
      (prisma.classSession.createMany as jest.Mock).mockResolvedValue({ count: 4 });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify that createMany was called with correct dates
      expect(prisma.classSession.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            scheduledDate: expect.any(Date),
            scheduledTime: '18:00',
            sessionNumber: 1,
          }),
        ]),
      });

      // Get the actual dates that were stored
      const createManyCall = (prisma.classSession.createMany as jest.Mock).mock.calls[0][0];
      const sessions = createManyCall.data;

      // Verify first session is on Nov 4, 2024
      const firstSession = sessions[0];
      const firstSessionDate = new Date(firstSession.scheduledDate);
      expect(firstSessionDate.getFullYear()).toBe(2024);
      expect(firstSessionDate.getMonth()).toBe(10); // November (0-indexed)
      expect(firstSessionDate.getDate()).toBe(4);
    });

    it('should maintain date consistency across multiple weeks', async () => {
      const startDate = '2024-11-04'; // Monday
      
      mockRequest.body = {
        name: 'Advanced Training',
        description: 'Advanced training',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        pricePerSeries: 300,
        startDate,
        totalWeeks: 3,
        daysOfWeek: [0, 2], // Monday and Wednesday
        startTime: '18:00',
        duration: 60,
        isActive: true,
      };

      const mockClass = {
        id: 'class-2',
        tenantId: 'test-tenant',
        name: 'Advanced Training',
        startDate: new Date(startDate),
        totalWeeks: 3,
        daysOfWeek: [0, 2],
        startTime: '18:00',
        duration: 60,
      };

      (prisma.trainingClass.create as jest.Mock).mockResolvedValue(mockClass);
      (prisma.classSession.createMany as jest.Mock).mockResolvedValue({ count: 6 });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const createManyCall = (prisma.classSession.createMany as jest.Mock).mock.calls[0][0];
      const sessions = createManyCall.data;

      // Should have 6 sessions (3 weeks × 2 days)
      expect(sessions).toHaveLength(6);

      // Verify dates are correct
      // Week 1: Nov 4 (Mon), Nov 6 (Wed)
      // Week 2: Nov 11 (Mon), Nov 13 (Wed)
      // Week 3: Nov 18 (Mon), Nov 20 (Wed)
      const expectedDates = [4, 6, 11, 13, 18, 20];
      
      sessions.forEach((session: any, index: number) => {
        const sessionDate = new Date(session.scheduledDate);
        expect(sessionDate.getDate()).toBe(expectedDates[index]);
        expect(sessionDate.getMonth()).toBe(10); // November
      });
    });
  });

  describe('Session Date Retrieval', () => {
    it('should return session dates in ISO format without timezone shift', async () => {
      mockRequest.params = { classId: 'class-1' };

      const mockSessions = [
        {
          id: 'session-1',
          tenantId: 'test-tenant',
          classId: 'class-1',
          sessionNumber: 1,
          scheduledDate: new Date('2024-11-04T00:00:00.000Z'),
          scheduledTime: '18:00',
          duration: 60,
          _count: { attendance: 0 },
        },
        {
          id: 'session-2',
          tenantId: 'test-tenant',
          classId: 'class-1',
          sessionNumber: 2,
          scheduledDate: new Date('2024-11-11T00:00:00.000Z'),
          scheduledTime: '18:00',
          duration: 60,
          _count: { attendance: 0 },
        },
      ];

      (prisma.classSession.findMany as jest.Mock).mockResolvedValue(mockSessions);

      await getClassSessions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: mockSessions,
      });

      // Verify the dates are returned as Date objects (which will be serialized to ISO strings)
      const returnedData = jsonMock.mock.calls[0][0].data;
      expect(returnedData[0].scheduledDate).toBeInstanceOf(Date);
      expect(returnedData[1].scheduledDate).toBeInstanceOf(Date);
    });

    it('should handle sessions across daylight saving time boundaries', async () => {
      // Test sessions that span DST change (March 10, 2024 in US)
      const startDate = '2024-03-04'; // Week before DST
      
      mockRequest.body = {
        name: 'Spring Training',
        description: 'Training across DST',
        instructorId: 'instructor-1',
        maxCapacity: 10,
        pricePerSeries: 200,
        startDate,
        totalWeeks: 3,
        daysOfWeek: [0], // Mondays
        startTime: '18:00',
        duration: 60,
        isActive: true,
      };

      const mockClass = {
        id: 'class-3',
        tenantId: 'test-tenant',
        name: 'Spring Training',
        startDate: new Date(startDate),
        totalWeeks: 3,
        daysOfWeek: [0],
        startTime: '18:00',
        duration: 60,
      };

      (prisma.trainingClass.create as jest.Mock).mockResolvedValue(mockClass);
      (prisma.classSession.createMany as jest.Mock).mockResolvedValue({ count: 3 });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const createManyCall = (prisma.classSession.createMany as jest.Mock).mock.calls[0][0];
      const sessions = createManyCall.data;

      // Verify dates: March 4, March 11 (after DST), March 18
      const expectedDates = [4, 11, 18];
      
      sessions.forEach((session: any, index: number) => {
        const sessionDate = new Date(session.scheduledDate);
        expect(sessionDate.getDate()).toBe(expectedDates[index]);
        expect(sessionDate.getMonth()).toBe(2); // March (0-indexed)
        expect(sessionDate.getFullYear()).toBe(2024);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle sessions starting on the last day of the month', async () => {
      const startDate = '2024-10-31'; // Thursday, Oct 31
      
      mockRequest.body = {
        name: 'Halloween Training',
        description: 'Training starting end of month',
        instructorId: 'instructor-1',
        maxCapacity: 10,
        pricePerSeries: 200,
        startDate,
        totalWeeks: 2,
        daysOfWeek: [3], // Thursday
        startTime: '18:00',
        duration: 60,
        isActive: true,
      };

      const mockClass = {
        id: 'class-4',
        tenantId: 'test-tenant',
        name: 'Halloween Training',
        startDate: new Date(startDate),
        totalWeeks: 2,
        daysOfWeek: [3],
        startTime: '18:00',
        duration: 60,
      };

      (prisma.trainingClass.create as jest.Mock).mockResolvedValue(mockClass);
      (prisma.classSession.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const createManyCall = (prisma.classSession.createMany as jest.Mock).mock.calls[0][0];
      const sessions = createManyCall.data;

      // First session: Oct 31
      const firstSession = new Date(sessions[0].scheduledDate);
      expect(firstSession.getMonth()).toBe(9); // October
      expect(firstSession.getDate()).toBe(31);

      // Second session: Nov 7 (one week later)
      const secondSession = new Date(sessions[1].scheduledDate);
      expect(secondSession.getMonth()).toBe(10); // November
      expect(secondSession.getDate()).toBe(7);
    });

    it('should handle leap year dates correctly', async () => {
      const startDate = '2024-02-26'; // Monday in leap year
      
      mockRequest.body = {
        name: 'Leap Year Training',
        description: 'Training in leap year',
        instructorId: 'instructor-1',
        maxCapacity: 10,
        pricePerSeries: 200,
        startDate,
        totalWeeks: 2,
        daysOfWeek: [0, 3], // Monday and Thursday
        startTime: '18:00',
        duration: 60,
        isActive: true,
      };

      const mockClass = {
        id: 'class-5',
        tenantId: 'test-tenant',
        name: 'Leap Year Training',
        startDate: new Date(startDate),
        totalWeeks: 2,
        daysOfWeek: [0, 3],
        startTime: '18:00',
        duration: 60,
      };

      (prisma.trainingClass.create as jest.Mock).mockResolvedValue(mockClass);
      (prisma.classSession.createMany as jest.Mock).mockResolvedValue({ count: 4 });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const createManyCall = (prisma.classSession.createMany as jest.Mock).mock.calls[0][0];
      const sessions = createManyCall.data;

      // Week 1: Feb 26 (Mon), Feb 29 (Thu - leap day)
      // Week 2: Mar 4 (Mon), Mar 7 (Thu)
      expect(sessions).toHaveLength(4);
      
      const dates = sessions.map((s: any) => {
        const d = new Date(s.scheduledDate);
        return { month: d.getMonth(), date: d.getDate() };
      });

      expect(dates[0]).toEqual({ month: 1, date: 26 }); // Feb 26
      expect(dates[1]).toEqual({ month: 1, date: 29 }); // Feb 29 (leap day)
      expect(dates[2]).toEqual({ month: 2, date: 4 });  // Mar 4
      expect(dates[3]).toEqual({ month: 2, date: 7 });  // Mar 7
    });

    it('should handle year boundary correctly', async () => {
      const startDate = '2024-12-30'; // Monday, Dec 30
      
      mockRequest.body = {
        name: 'New Year Training',
        description: 'Training across year boundary',
        instructorId: 'instructor-1',
        maxCapacity: 10,
        pricePerSeries: 200,
        startDate,
        totalWeeks: 2,
        daysOfWeek: [0], // Monday
        startTime: '18:00',
        duration: 60,
        isActive: true,
      };

      const mockClass = {
        id: 'class-6',
        tenantId: 'test-tenant',
        name: 'New Year Training',
        startDate: new Date(startDate),
        totalWeeks: 2,
        daysOfWeek: [0],
        startTime: '18:00',
        duration: 60,
      };

      (prisma.trainingClass.create as jest.Mock).mockResolvedValue(mockClass);
      (prisma.classSession.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const createManyCall = (prisma.classSession.createMany as jest.Mock).mock.calls[0][0];
      const sessions = createManyCall.data;

      // First session: Dec 30, 2024
      const firstSession = new Date(sessions[0].scheduledDate);
      expect(firstSession.getFullYear()).toBe(2024);
      expect(firstSession.getMonth()).toBe(11); // December
      expect(firstSession.getDate()).toBe(30);

      // Second session: Jan 6, 2025
      const secondSession = new Date(sessions[1].scheduledDate);
      expect(secondSession.getFullYear()).toBe(2025);
      expect(secondSession.getMonth()).toBe(0); // January
      expect(secondSession.getDate()).toBe(6);
    });
  });

  describe('Time Consistency', () => {
    it('should maintain the same time across all sessions regardless of date', async () => {
      const startDate = '2024-11-04';
      const startTime = '18:30'; // 6:30 PM
      
      mockRequest.body = {
        name: 'Evening Training',
        description: 'Consistent time training',
        instructorId: 'instructor-1',
        maxCapacity: 10,
        pricePerSeries: 200,
        startDate,
        totalWeeks: 4,
        daysOfWeek: [0, 2, 4], // Mon, Wed, Fri
        startTime,
        duration: 90,
        isActive: true,
      };

      const mockClass = {
        id: 'class-7',
        tenantId: 'test-tenant',
        name: 'Evening Training',
        startDate: new Date(startDate),
        totalWeeks: 4,
        daysOfWeek: [0, 2, 4],
        startTime,
        duration: 90,
      };

      (prisma.trainingClass.create as jest.Mock).mockResolvedValue(mockClass);
      (prisma.classSession.createMany as jest.Mock).mockResolvedValue({ count: 12 });

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const createManyCall = (prisma.classSession.createMany as jest.Mock).mock.calls[0][0];
      const sessions = createManyCall.data;

      // All sessions should have the same time
      sessions.forEach((session: any) => {
        expect(session.scheduledTime).toBe('18:30');
        expect(session.duration).toBe(90);
      });
    });
  });
});
