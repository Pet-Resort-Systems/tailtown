/**
 * Training Class Controller Tests
 * 
 * Tests backend validation and business logic for training classes
 */

import { Request, Response, NextFunction } from 'express';
import { createTrainingClass } from '../trainingClass.controller';
import { AppError } from '../../middleware/error.middleware';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    trainingClass: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn()
    },
    classSession: {
      createMany: jest.fn()
    }
  }))
}));

describe('TrainingClass Controller - createTrainingClass', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
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
  });

  describe('Required Field Validation', () => {
    it('should return 400 when name is missing', async () => {
      mockRequest.body = {
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // name is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when level is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // level is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when category is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // category is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when instructorId is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // instructorId is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when maxCapacity is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // maxCapacity is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when startDate is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // startDate is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when totalWeeks is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // totalWeeks is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when daysOfWeek is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
        // daysOfWeek is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when startTime is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        endTime: '19:00',
        pricePerSeries: 200
        // startTime is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when endTime is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        pricePerSeries: 200
        // endTime is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });

    it('should return 400 when pricePerSeries is missing', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00'
        // pricePerSeries is missing
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          statusCode: 400
        })
      );
    });
  });

  describe('Valid Request', () => {
    it('should accept request with all required fields', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        totalWeeks: 6,
        daysOfWeek: [1],
        startTime: '18:00',
        endTime: '19:00',
        pricePerSeries: 200
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should not call next with an error
      if (mockNext.mock.calls.length > 0) {
        const errorArg = mockNext.mock.calls[0][0];
        if (errorArg) {
          expect(errorArg).not.toHaveProperty('statusCode', 400);
        }
      }
    });

    it('should accept optional fields', async () => {
      mockRequest.body = {
        name: 'Puppy Training',
        description: 'A comprehensive puppy training program',
        level: 'BEGINNER',
        category: 'OBEDIENCE',
        instructorId: 'instructor-1',
        maxCapacity: 8,
        startDate: '2025-11-01',
        endDate: '2025-12-15',
        totalWeeks: 6,
        daysOfWeek: [1, 3], // Monday and Wednesday
        startTime: '18:00',
        endTime: '19:00',
        duration: 60,
        pricePerSeries: 200,
        pricePerSession: 35,
        depositRequired: 50,
        minAge: 8,
        maxAge: 16,
        prerequisites: ['Basic commands'],
        notes: 'Bring treats'
      };

      await createTrainingClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should not call next with a validation error
      if (mockNext.mock.calls.length > 0) {
        const errorArg = mockNext.mock.calls[0][0];
        if (errorArg) {
          expect(errorArg).not.toHaveProperty('statusCode', 400);
        }
      }
    });
  });
});
