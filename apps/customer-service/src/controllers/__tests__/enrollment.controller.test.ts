/**
 * Enrollment Controller Tests
 * 
 * Tests enrollment business logic including capacity checking,
 * duplicate prevention, payment calculation, and waitlist integration
 */

import { Request, Response, NextFunction } from 'express';
import {
  enrollInClass,
  dropFromClass,
  getEnrollmentById,
  updateEnrollment,
  addToWaitlist,
  removeFromWaitlist,
  getClassWaitlist,
} from '../enrollment.controller';
import { AppError } from '../../middleware/error.middleware';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    trainingClass: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    classEnrollment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    classWaitlist: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
  }))
}));

describe('Enrollment Controller', () => {
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
      params: {},
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    mockNext = jest.fn();

    // Get mocked prisma instance
    const { PrismaClient } = require('@prisma/client');
    mockPrisma = new PrismaClient();
  });

  describe('enrollInClass - Capacity Checking', () => {
    it('should prevent enrollment when class is full', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      // Mock class at full capacity
      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 10,
        pricePerSeries: 200,
        _count: { enrollments: 10, sessions: 6 }
      });

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Class is full. Pet can be added to waitlist.',
          statusCode: 409
        })
      );
      expect(mockPrisma.classEnrollment.create).not.toHaveBeenCalled();
    });

    it('should allow enrollment when spots available', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 8,
        pricePerSeries: 200,
        _count: { enrollments: 8, sessions: 6 }
      });

      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);
      mockPrisma.classEnrollment.create.mockResolvedValue({
        id: 'enrollment-1',
        classId: 'class-1',
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200,
        paymentStatus: 'PAID'
      });

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classEnrollment.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle class at exactly max capacity', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 10,
        pricePerSeries: 200,
        _count: { enrollments: 10, sessions: 6 }
      });

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409
        })
      );
    });
  });

  describe('enrollInClass - Duplicate Prevention', () => {
    it('should prevent duplicate enrollment in same class', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      // Mock existing enrollment
      mockPrisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'existing-enrollment',
        classId: 'class-1',
        petId: 'pet-1'
      });

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pet is already enrolled in this class',
          statusCode: 409
        })
      );
    });

    it('should allow same pet in different classes', async () => {
      mockRequest.params = { classId: 'class-2' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-2',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      // No existing enrollment in this class
      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);
      mockPrisma.classEnrollment.create.mockResolvedValue({
        id: 'enrollment-2',
        classId: 'class-2',
        petId: 'pet-1'
      });

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classEnrollment.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('enrollInClass - Payment Calculation', () => {
    it('should mark as PAID when amount >= price', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classEnrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountPaid: 200,
            amountDue: 200,
            paymentStatus: 'PAID'
          })
        })
      );
    });

    it('should mark as PENDING when amount < price', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 50
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classEnrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountPaid: 50,
            amountDue: 200,
            paymentStatus: 'PENDING'
          })
        })
      );
    });

    it('should mark as PAID when amount > price (overpayment)', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 250
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classEnrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountPaid: 250,
            paymentStatus: 'PAID'
          })
        })
      );
    });

    it('should handle zero payment', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 0
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classEnrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountPaid: 0,
            paymentStatus: 'PENDING'
          })
        })
      );
    });
  });

  describe('enrollInClass - Waitlist Integration', () => {
    it('should remove from waitlist on successful enrollment', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);
      mockPrisma.classEnrollment.create.mockResolvedValue({
        id: 'enrollment-1',
        classId: 'class-1',
        petId: 'pet-1'
      });

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classWaitlist.deleteMany).toHaveBeenCalledWith({
        where: {
          classId: 'class-1',
          petId: 'pet-1',
          tenantId: 'test-tenant'
        }
      });
    });
  });

  describe('enrollInClass - Class Count Updates', () => {
    it('should increment currentEnrolled on successful enrollment', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue({
        id: 'class-1',
        maxCapacity: 10,
        currentEnrolled: 5,
        pricePerSeries: 200,
        _count: { enrollments: 5, sessions: 6 }
      });

      mockPrisma.classEnrollment.findFirst.mockResolvedValue(null);
      mockPrisma.classEnrollment.create.mockResolvedValue({
        id: 'enrollment-1'
      });

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.trainingClass.update).toHaveBeenCalledWith({
        where: { id: 'class-1' },
        data: {
          currentEnrolled: { increment: 1 }
        }
      });
    });
  });

  describe('dropFromClass', () => {
    it('should decrement currentEnrolled when dropping', async () => {
      mockRequest.params = { id: 'enrollment-1' };
      mockRequest.body = { reason: 'Schedule conflict' };

      mockPrisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
        classId: 'class-1',
        petId: 'pet-1',
        notes: 'Previous notes'
      });

      mockPrisma.classEnrollment.update.mockResolvedValue({});
      mockPrisma.classWaitlist.findFirst.mockResolvedValue(null);

      await dropFromClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.trainingClass.update).toHaveBeenCalledWith({
        where: { id: 'class-1' },
        data: {
          currentEnrolled: { decrement: 1 }
        }
      });
    });

    it('should notify first person on waitlist when spot opens', async () => {
      mockRequest.params = { id: 'enrollment-1' };
      mockRequest.body = { reason: 'Schedule conflict' };

      mockPrisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
        classId: 'class-1',
        petId: 'pet-1'
      });

      mockPrisma.classEnrollment.update.mockResolvedValue({});
      
      // Mock waitlist entry
      mockPrisma.classWaitlist.findFirst.mockResolvedValue({
        id: 'waitlist-1',
        classId: 'class-1',
        position: 1,
        status: 'WAITING'
      });

      await dropFromClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classWaitlist.update).toHaveBeenCalledWith({
        where: { id: 'waitlist-1' },
        data: {
          notified: true,
          notifiedDate: expect.any(Date)
        }
      });
    });

    it('should update enrollment status to DROPPED', async () => {
      mockRequest.params = { id: 'enrollment-1' };
      mockRequest.body = { reason: 'Moving away' };

      mockPrisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
        classId: 'class-1',
        petId: 'pet-1',
        notes: ''
      });

      mockPrisma.classWaitlist.findFirst.mockResolvedValue(null);

      await dropFromClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classEnrollment.update).toHaveBeenCalledWith({
        where: { id: 'enrollment-1' },
        data: {
          status: 'DROPPED',
          notes: expect.stringContaining('Dropped: Moving away')
        }
      });
    });
  });

  describe('enrollInClass - Validation', () => {
    it('should require petId', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        customerId: 'customer-1',
        amountPaid: 200
      };

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pet ID and Customer ID are required',
          statusCode: 400
        })
      );
    });

    it('should require customerId', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        amountPaid: 200
      };

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pet ID and Customer ID are required',
          statusCode: 400
        })
      );
    });

    it('should return 404 when class not found', async () => {
      mockRequest.params = { classId: 'nonexistent-class' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1',
        amountPaid: 200
      };

      mockPrisma.trainingClass.findFirst.mockResolvedValue(null);

      await enrollInClass(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Training class not found',
          statusCode: 404
        })
      );
    });
  });

  describe('Waitlist Management', () => {
    it('should prevent duplicate waitlist entries', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1'
      };

      mockPrisma.classWaitlist.findFirst.mockResolvedValue({
        id: 'existing-waitlist',
        classId: 'class-1',
        petId: 'pet-1'
      });

      await addToWaitlist(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pet is already on waitlist',
          statusCode: 409
        })
      );
    });

    it('should assign correct position in waitlist', async () => {
      mockRequest.params = { classId: 'class-1' };
      mockRequest.body = {
        petId: 'pet-1',
        customerId: 'customer-1'
      };

      mockPrisma.classWaitlist.findFirst
        .mockResolvedValueOnce(null) // No existing entry
        .mockResolvedValueOnce({ position: 5 }); // Max position is 5

      await addToWaitlist(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.classWaitlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            position: 6
          })
        })
      );
    });

    it('should reorder waitlist when entry removed', async () => {
      mockRequest.params = { id: 'waitlist-1' };

      mockPrisma.classWaitlist.findFirst.mockResolvedValue({
        id: 'waitlist-1',
        classId: 'class-1',
        position: 3,
        tenantId: 'test-tenant'
      });

      await removeFromWaitlist(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });
  });
});
