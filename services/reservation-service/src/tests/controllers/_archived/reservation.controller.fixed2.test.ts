import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ExtendedReservationStatus } from '../../types/prisma-extensions';

// Mock the AppError class
const mockAppError = jest.fn();

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

// Mock the service module with AppError and safeExecutePrismaQuery
jest.mock('../../utils/service', () => {
  return {
    AppError: jest.fn().mockImplementation((message, statusCode) => {
      mockAppError(message, statusCode);
      const error = new Error(message);
      (error as any).statusCode = statusCode;
      return error;
    }),
    safeExecutePrismaQuery: safeExecutePrismaQueryMock
  };
});

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
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Start date must be before end date'),
          statusCode: 400
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
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Resource is not available'),
          statusCode: 409
        })
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
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Customer not found'),
          statusCode: 404
        })
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
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Pet not found'),
          statusCode: 404
        })
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
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Resource not found'),
          statusCode: 404
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
  });
  
  describe('updateReservation', () => {
    beforeEach(() => {
      // Setup for update tests
      mockRequest.params = { id: 'reservation-1' };
      
      // Mock reservation exists
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1'
      });
      
      // Mock resource exists
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        tenantId: 'tenant-1',
        type: 'STANDARD_SUITE'
      });
    });
    
    it('should update a reservation when there are no conflicts', async () => {
      // Setup update data
      mockRequest.body = {
        startDate: '2025-06-12',
        endDate: '2025-06-18',
        status: 'PENDING'
      };
      
      // Mock no conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: false,
        conflictingReservations: [],
        warnings: [],
      });
      
      // Mock successful reservation update
      (prisma.reservation.update as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-12'),
        endDate: new Date('2025-06-18'),
        status: 'PENDING',
        tenantId: 'tenant-1'
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
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Reservation not found'),
          statusCode: 404
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return error when date range is invalid', async () => {
      // Setup request with invalid date range (end before start)
      mockRequest.body = {
        startDate: '2025-06-15',
        endDate: '2025-06-10'
      };
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Start date must be before end date'),
          statusCode: 400
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return conflict error when resource has conflicts', async () => {
      // Setup update with new resource
      mockRequest.body = {
        resourceId: 'resource-2',
        startDate: '2025-06-12',
        endDate: '2025-06-18'
      };
      
      // Mock resource exists
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-2',
        tenantId: 'tenant-1',
        type: 'STANDARD_SUITE'
      });
      
      // Mock resource conflicts
      mockDetectReservationConflicts.mockResolvedValue({
        hasConflicts: true,
        conflictingReservations: [{ id: 'conflict-1' }],
        warnings: ['Resource is not available for the requested dates. There are 1 overlapping reservations.'],
      });
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Resource is not available'),
          statusCode: 409
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
  });
  
  describe('getReservationById', () => {
    beforeEach(() => {
      // Setup for getById tests
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
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify AppError was called with correct message
      expect(mockAppError).toHaveBeenCalledWith(
        expect.stringContaining('Reservation not found'),
        404
      );
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalled();
    });
  });
  
  describe('deleteReservation', () => {
    beforeEach(() => {
      // Setup for delete tests
      mockRequest.params = { id: 'reservation-1' };
    });
    
    it('should delete a reservation when it exists', async () => {
      // Mock existing reservation
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        tenantId: 'tenant-1'
      });
      
      // Mock successful deletion
      (prisma.reservation.delete as jest.Mock).mockResolvedValue({
        id: 'reservation-1'
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
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
      
      await deleteReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Reservation not found'),
          statusCode: 404
        })
      );
      
      // Verify reservation was not deleted
      expect(prisma.reservation.delete).not.toHaveBeenCalled();
    });
  });
  
  describe('getAllReservations', () => {
    it('should return all reservations', async () => {
      // Mock reservations
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        {
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
        },
        {
          id: 'reservation-2',
          customerId: 'customer-2',
          petId: 'pet-2',
          resourceId: 'resource-2',
          startDate: new Date('2025-06-20'),
          endDate: new Date('2025-06-25'),
          status: 'PENDING',
          tenantId: 'tenant-1',
          customer: { id: 'customer-2', name: 'Test Customer 2' },
          pet: { id: 'pet-2', name: 'Test Pet 2' },
          resource: { id: 'resource-2', name: 'Test Resource 2' },
        }
      ]);
      
      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'reservation-1' }),
            expect.objectContaining({ id: 'reservation-2' })
          ])
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should filter reservations by status', async () => {
      // Setup query params
      mockRequest.query = { status: 'CONFIRMED' };
      
      // Mock reservations
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'reservation-1',
          status: 'CONFIRMED',
          tenantId: 'tenant-1',
        }
      ]);
      
      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify query included status filter
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CONFIRMED'
          })
        })
      );
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
  
  describe('getCustomerReservations', () => {
    beforeEach(() => {
      // Setup for customer reservations tests
      mockRequest.params = { customerId: 'customer-1' };
    });
    
    it('should return customer reservations', async () => {
      // Mock customer exists
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        tenantId: 'tenant-1'
      });
      
      // Mock reservations
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'reservation-1',
          customerId: 'customer-1',
          petId: 'pet-1',
          resourceId: 'resource-1',
          startDate: new Date('2025-06-10'),
          endDate: new Date('2025-06-15'),
          status: 'CONFIRMED',
          tenantId: 'tenant-1',
        }
      ]);
      
      await getCustomerReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify query included customer filter
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'customer-1'
          })
        })
      );
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'reservation-1' })
          ])
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when customer does not exist', async () => {
      // Mock customer not found
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);
      
      await getCustomerReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Customer not found'),
          statusCode: 404
        })
      );
      
      // Verify reservations were not fetched
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });
  });
});
