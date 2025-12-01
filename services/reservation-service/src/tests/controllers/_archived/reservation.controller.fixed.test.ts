import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ExtendedReservationStatus } from '../../types/prisma-extensions';

// Mock the AppError class
const mockAppError = jest.fn();
jest.mock('../../utils/service', () => ({
  AppError: jest.fn().mockImplementation((message, statusCode) => {
    mockAppError(message, statusCode);
    return { message, statusCode };
  })
}));

// Mock the Prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      reservation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      reservationAddOn: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    invoice: {
      updateMany: jest.fn(),
    },
      resource: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      pet: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback()),
    })),
  };
});

// Mock the conflict detection utility
const mockDetectReservationConflicts = jest.fn();
jest.mock('../../utils/reservation-conflicts', () => ({
  detectReservationConflicts: (...args: any[]) => mockDetectReservationConflicts(...args),
}));

// Mock the safeExecutePrismaQuery function
const safeExecutePrismaQueryMock = jest.fn().mockImplementation((fn, fallback) => fn());

// Import the controller functions after mocking dependencies
import {
  createReservation,
  updateReservation,
  getReservationById,
  deleteReservation,
  getAllReservations,
  getCustomerReservations
} from '../../controllers/reservation/reservation.controller';

// Get the mocked instances
const prisma = new PrismaClient();

describe('Reservation Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock request, response, and next function
    mockRequest = {
      body: {
        customerId: 'customer-1',
        petId: 'pet-1',
        startDate: '2025-06-10',
        endDate: '2025-06-15',
        suiteType: 'STANDARD_SUITE',
        status: 'CONFIRMED',
      },
      params: {},
      query: {},
    } as Request;
    
    // Add tenantId property using our schema alignment strategy
    Object.defineProperty(mockRequest, 'tenantId', {
      value: 'tenant-1',
      configurable: true
    });
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockNext = jest.fn();
    
    // Reset all mocks to their default values
    mockAppError.mockClear();
    mockDetectReservationConflicts.mockReset();
    mockDetectReservationConflicts.mockResolvedValue({
      hasConflicts: false,
      conflictingReservations: [],
      warnings: [],
    });
    
    // Mock customer exists
    (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
      id: 'customer-1',
      tenantId: 'tenant-1',
    });
    
    // Mock pet exists
    (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
      id: 'pet-1',
      tenantId: 'tenant-1',
    });
  });

  describe('createReservation', () => {
    it('should create a reservation when there are no conflicts', async () => {
      // Setup request with resourceId
      mockRequest.body.resourceId = 'resource-1';
      
      // Mock resource exists
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({ 
        id: 'resource-1',
        tenantId: 'tenant-1',
        type: 'STANDARD_SUITE'
      });
      
      // Mock successful reservation creation
      (prisma.reservation.create as jest.Mock).mockResolvedValue({
        id: 'new-reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
        orderNumber: 'R12345'
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify reservation was created
      expect(prisma.reservation.create).toHaveBeenCalled();
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Object)
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when date range is invalid', async () => {
      // Setup request with invalid date range (end before start)
      mockRequest.body.startDate = '2025-06-15';
      mockRequest.body.endDate = '2025-06-10';
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify AppError was called with correct message
      expect(mockAppError).toHaveBeenCalledWith(
        expect.stringContaining('Start date must be before end date'),
        400
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should auto-assign a resource when none provided', async () => {
      // Setup request without resourceId
      delete mockRequest.body.resourceId;
      
      // Mock available resources for auto-assignment
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([
        { id: 'auto-resource-1', type: 'STANDARD_SUITE', tenantId: 'tenant-1' },
        { id: 'auto-resource-2', type: 'STANDARD_SUITE', tenantId: 'tenant-1' }
      ]);
      
      // Mock no conflicts for the first resource
      mockDetectReservationConflicts.mockImplementation(({ resourceId }) => {
        if (resourceId === 'auto-resource-1') {
          return Promise.resolve({
            hasConflicts: false,
            conflictingReservations: [],
            warnings: []
          });
        } else {
          return Promise.resolve({
            hasConflicts: true,
            conflictingReservations: [{ id: 'conflict-1' }],
            warnings: ['Resource is not available']
          });
        }
      });
      
      // Mock successful reservation creation
      (prisma.reservation.create as jest.Mock).mockResolvedValue({
        id: 'new-reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'auto-resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1'
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify resource auto-assignment was attempted
      expect(prisma.resource.findMany).toHaveBeenCalled();
      
      // Verify conflict detection was called for resource assignment
      expect(mockDetectReservationConflicts).toHaveBeenCalled();
      
      // Verify reservation was created with auto-assigned resource
      expect(prisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceId: 'auto-resource-1'
          })
        })
      );
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Object)
        })
      );
    });
    
    it('should return conflict error when resource has conflicts', async () => {
      // Mock resource conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: true,
        conflictingReservations: [{ id: 'conflict-1' }],
        warnings: ['Resource is not available for the requested dates. There are 1 overlapping reservations.'],
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify AppError was called with correct message
      expect(mockAppError).toHaveBeenCalledWith(
        expect.stringContaining('Resource is not available'),
        409
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should return error when customer does not exist', async () => {
      // Mock customer not found
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify AppError was called with correct message
      expect(mockAppError).toHaveBeenCalledWith(
        expect.stringContaining('Customer not found'),
        404
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should return error when pet does not exist', async () => {
      // Mock pet not found
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue(null);
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify AppError was called with correct message
      expect(mockAppError).toHaveBeenCalledWith(
        expect.stringContaining('Pet not found'),
        404
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should return error when resource does not exist', async () => {
      // Mock resource not found
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(null);
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify AppError was called with correct message
      expect(mockAppError).toHaveBeenCalledWith(
        expect.stringContaining('Resource not found'),
        404
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should create a reservation when there are no conflicts', async () => {
      // Setup request with resourceId
      mockRequest.body.resourceId = 'resource-1';
      
      // Mock resource exists
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({ id: 'resource-1' });
      
      // Mock no conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: false,
        conflictingReservations: [],
        warnings: [],
      });
      
      // Mock successful reservation creation
      (prisma.reservation.create as jest.Mock).mockResolvedValue({
        id: 'new-reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify resource existence check was called
      expect(prisma.resource.findFirst).toHaveBeenCalled();
      
      // Verify conflict detection was called
      expect(mockDetectReservationConflicts).toHaveBeenCalled();
      
      // Verify reservation was created
      expect(prisma.reservation.create).toHaveBeenCalled();
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Object)
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when date range is invalid', async () => {
      // Setup request with invalid date range (end before start)
      mockRequest.body.startDate = '2025-06-15';
      mockRequest.body.endDate = '2025-06-10';
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Start date must be before end date'
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should auto-assign a resource when none provided', async () => {
      // Setup request without resourceId
      delete mockRequest.body.resourceId;
      
      // Mock available resources for auto-assignment
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([
        { id: 'auto-resource-1', type: 'STANDARD_SUITE' },
        { id: 'auto-resource-2', type: 'STANDARD_SUITE' }
      ]);
      
      // Mock no conflicts for the first resource
      mockDetectReservationConflicts.mockImplementation(({ resourceId }) => {
        if (resourceId === 'auto-resource-1') {
          return Promise.resolve({
            hasConflicts: false,
            conflictingReservations: [],
            warnings: []
          });
        }
        return Promise.resolve({
          hasConflicts: true,
          conflictingReservations: [{ id: 'conflict-1' }],
          warnings: ['Resource has conflicts']
        });
      });
      
      // Mock successful reservation creation
      (prisma.reservation.create as jest.Mock).mockResolvedValue({
        id: 'new-reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'auto-resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify resource auto-assignment was attempted
      expect(prisma.resource.findMany).toHaveBeenCalled();
      
      // Verify conflict detection was called for resource assignment
      expect(mockDetectReservationConflicts).toHaveBeenCalled();
      
      // Verify reservation was created with auto-assigned resource
      expect(prisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceId: 'auto-resource-1'
          })
        })
      );
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Object)
        })
      );
    });
    
    it('should return conflict error when resource has conflicts', async () => {
      // Mock resource conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: true,
        conflictingReservations: [{ id: 'conflict-1' }],
        warnings: ['Resource is not available for the requested dates. There are 1 overlapping reservations.'],
      });
      
      // Reset mocks
      mockAppError.mockClear();
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Resource is not available for the requested dates'
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });

    it('should return conflict error when pet has conflicts', async () => {
      // Setup request with pet ID and dates but no resourceId
      mockRequest.body = {
        customerId: 'customer-1',
        petId: 'pet-1',
        startDate: '2025-06-10',
        endDate: '2025-06-15',
        suiteType: 'STANDARD_SUITE',
      };
      
      // Mock no available resources to force pet conflict check
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);
      
      // Mock pet conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: true,
        conflictingReservations: [{ id: 'conflict-1' }],
        warnings: ['Pet already has 1 overlapping reservation(s) during the requested dates.'],
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify conflict detection was called
      expect(mockDetectReservationConflicts).toHaveBeenCalled();
      
      // Verify next was called with conflict error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Pet already has 1 overlapping reservation(s) during the requested dates.'
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
  });

  describe('updateReservation', () => {
    beforeEach(() => {
      // Setup request params and body for update
      mockRequest.params = { id: 'reservation-1' };
      mockRequest.body = {
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: '2025-06-10',
        endDate: '2025-06-15',
        status: 'CONFIRMED',
      };
      
      // Mock existing reservation
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-05'),
        endDate: new Date('2025-06-08'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
      });
      
      // Mock resource exists
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({ id: 'resource-1' });
    });
    
    it('should update a reservation when there are no conflicts', async () => {
      // Mock no conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: false,
        conflictingReservations: [],
        warnings: [],
      });
      
      // Mock successful update
      (prisma.reservation.update as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
      });
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify reservation was updated
      expect(prisma.reservation.update).toHaveBeenCalled();
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Object)
        })
      );
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Reservation not found'
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return error when tenant ID does not match', async () => {
      // Mock reservation with different tenant
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        tenantId: 'different-tenant',
      });
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Unauthorized access to reservation'
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return error when resource does not exist', async () => {
      // Mock resource not found
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(null);
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Requested resource not found or not available'
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return error when dates are invalid', async () => {
      // Setup request with invalid dates
      mockRequest.body.startDate = '2025-06-15'; // Start date after end date
      mockRequest.body.endDate = '2025-06-10';
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Start date must be before end date'
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return error when resource has conflicts', async () => {
      // Mock resource conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: true,
        conflictingReservations: [{ id: 'conflict-1' }],
        warnings: ['Resource is not available for the requested dates'],
      });
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with conflict error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Resource is not available for the requested dates'
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
  });

  describe('getReservationById', () => {
    beforeEach(() => {
      // Setup request params
      mockRequest.params = { id: 'reservation-1' };
    });
    
    it('should return a reservation when it exists', async () => {
      // Mock existing reservation
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
        customer: { id: 'customer-1', name: 'Test Customer' },
        pet: { id: 'pet-1', name: 'Test Pet' },
        resource: { id: 'resource-1', name: 'Test Resource' },
      });
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            id: 'reservation-1'
          })
        })
      );
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Reservation not found'
        })
      );
    });
    
    it('should return error when tenant ID does not match', async () => {
      // Mock reservation with different tenant
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        tenantId: 'different-tenant',
      });
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockAppError).toHaveBeenCalledWith(
        'Unauthorized access to reservation',
        403
      );
    });
  });

  describe('deleteReservation', () => {
    beforeEach(() => {
      // Setup request params
      mockRequest.params = { id: 'reservation-1' };
    });
    
    it('should delete a reservation when it exists', async () => {
      // Mock existing reservation
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        tenantId: 'tenant-1',
      });
      
      // Mock successful delete
      (prisma.reservation.delete as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
      });
      
      await deleteReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify add-ons were deleted
      expect(prisma.reservationAddOn.deleteMany).toHaveBeenCalled();
      
      // Verify reservation was deleted
      expect(prisma.reservation.delete).toHaveBeenCalled();
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: expect.stringContaining('Reservation deleted')
        })
      );
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);
      
      await deleteReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Reservation not found'
        })
      );
      
      // Verify reservation was not deleted
      expect(prisma.reservation.delete).not.toHaveBeenCalled();
    });
    
    it('should return error when tenant ID does not match', async () => {
      // Mock reservation with different tenant
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        tenantId: 'different-tenant',
      });
      
      await deleteReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Unauthorized access to reservation'
        })
      );
      
      // Verify reservation was not deleted
      expect(prisma.reservation.delete).not.toHaveBeenCalled();
    });
  });
  
  describe('getReservationById', () => {
    beforeEach(() => {
      // Setup request params
      mockRequest.params = { id: 'reservation-1' };
    });
    
    it('should return a reservation with all related data', async () => {
      // Mock existing reservation with related data
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        petId: 'pet-1',
        customerId: 'customer-1',
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
        pet: {
          id: 'pet-1',
          name: 'Fluffy',
          breed: 'Golden Retriever'
        },
        customer: {
          id: 'customer-1',
          firstName: 'John',
          lastName: 'Doe'
        },
        resource: {
          id: 'resource-1',
          name: 'Suite 101',
          type: 'STANDARD_SUITE'
        },
        addOns: [
          {
            id: 'addon-1',
            addOn: {
              id: 'addon-type-1',
              name: 'Bath',
              price: 25.00
            }
          }
        ]
      });
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            id: 'reservation-1'
          })
        })
      );
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Reservation not found'
        })
      );
    });
    
    it('should return error when tenant ID does not match', async () => {
      // Mock reservation with different tenant
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        tenantId: 'different-tenant',
      });
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with error
      expect(mockAppError).toHaveBeenCalledWith(
        'Unauthorized access to reservation',
        403
      );
    });
    
    it('should handle schema misalignment gracefully', async () => {
      // Mock existing reservation but with missing related data (schema misalignment)
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        petId: 'pet-1',
        customerId: 'customer-1',
        status: 'CONFIRMED',
        tenantId: 'tenant-1'
        // Missing pet, customer, resource data
      });
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response still succeeds but with warnings
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Object),
          warnings: expect.arrayContaining([
            expect.stringContaining('missing')
          ])
        })
      );
    });
  });
});
