import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as reservationConflicts from '../../utils/reservation-conflicts';
import * as orderNumberUtils from '../../utils/orderNumber';
import * as serviceUtils from '../../utils/service';

// Mock the Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    reservation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    pet: {
      findFirst: jest.fn(),
    },
    resource: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    reservationAddOn: {
      deleteMany: jest.fn(),
    },
    invoice: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback()),
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock the reservation conflicts utility
jest.mock('../../utils/reservation-conflicts', () => ({
  detectReservationConflicts: jest.fn(),
}));

// Mock the order number utility
jest.mock('../../utils/orderNumber', () => ({
  generateOrderNumber: jest.fn().mockReturnValue('ORD-12345'),
}));

// Mock the customer service client
jest.mock('../../clients/customer-service.client', () => ({
  customerServiceClient: {
    verifyCustomer: jest.fn(),
    verifyPet: jest.fn(),
    getCustomer: jest.fn(),
    getPet: jest.fn(),
    healthCheck: jest.fn(),
  },
}));

// Mock the service utilities
jest.mock('../../utils/service', () => {
  // Create a mock AppError class
  class MockAppError extends Error {
    statusCode: number;
    
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
      this.name = 'AppError';
    }
  }
  
  return {
    AppError: jest.fn().mockImplementation((message, statusCode) => {
      return new MockAppError(message, statusCode);
    }),
    safeExecutePrismaQuery: jest.fn().mockImplementation((fn) => fn()),
  };
});

// Import the controller functions after mocking dependencies
// Import the customer service client mock
import { customerServiceClient } from '../../clients/customer-service.client';

import {
  getReservationById,
  deleteReservation,
  getAllReservations,
  createReservation,
  updateReservation,
  getCustomerReservations,
} from '../../controllers/reservation/reservation.controller';

describe('Reservation Controller', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let prisma: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up mock request, response, and next function
    mockRequest = {
      params: { id: 'reservation-1', customerId: 'customer-1' },
      query: {},
      body: {
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: '2025-06-10',
        endDate: '2025-06-15',
        status: 'CONFIRMED',
      },
      tenantId: 'tenant-1',
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockNext = jest.fn();
    
    // Get the mocked Prisma client
    prisma = new PrismaClient();
  });
  
  describe('getReservationById', () => {
    it('should get a reservation by ID successfully', async () => {
      // Mock successful reservation lookup
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
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
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when reservation does not exist', async () => {
      // Mock reservation not found
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
      
      await getReservationById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalled();
      
      // Verify AppError was created with correct message and status
      expect(serviceUtils.AppError).toHaveBeenCalledWith(
        'Reservation not found',
        404
      );
    });
  });
  
  describe('deleteReservation', () => {
    it('should delete a reservation successfully', async () => {
      // Mock successful reservation lookup
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
      });
      
      // Mock successful add-on deletion
      (prisma.reservationAddOn.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      
      // Mock successful reservation deletion
      (prisma.reservation.delete as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
      });
      
      await deleteReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: expect.stringContaining('Reservation deleted successfully')
        })
      );
      
      // Verify reservation was deleted
      expect(prisma.reservation.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reservation-1' },
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
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
      
      // Add count method for pagination
      (prisma.reservation.count as jest.Mock).mockResolvedValue(2);
      
      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      // Mock customer and pet verification via Customer Service API
      (customerServiceClient.verifyCustomer as jest.Mock).mockResolvedValue(true);
      (customerServiceClient.verifyPet as jest.Mock).mockResolvedValue(true);
      
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        name: 'Test Resource',
        tenantId: 'tenant-1',
      });
      
      // Mock no conflicts
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      });
      
      // Mock successful reservation creation
      (prisma.reservation.create as jest.Mock).mockResolvedValue({
        id: 'new-reservation',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
        orderNumber: 'ORD-12345',
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle conflicts properly', async () => {
      // Mock customer and pet verification via Customer Service API
      (customerServiceClient.verifyCustomer as jest.Mock).mockResolvedValue(true);
      (customerServiceClient.verifyPet as jest.Mock).mockResolvedValue(true);
      
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        name: 'Test Resource',
        tenantId: 'tenant-1',
      });
      
      // Mock conflicts
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue({
        hasConflicts: true,
        conflicts: [{
          id: 'existing-reservation',
          startDate: new Date('2025-06-12'),
          endDate: new Date('2025-06-14'),
        }],
        warnings: ['Resource resource-1 conflicts with existing reservation from 2025-06-12 to 2025-06-14']
      });
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalled();
      expect(serviceUtils.AppError).toHaveBeenCalledWith(
        expect.stringContaining('conflicts with existing'),
        409
      );
    });
  });

  describe('updateReservation', () => {
    it('should update a reservation successfully', async () => {
      // Mock existing reservation
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-15'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
      });
      
      // Mock customer, pet, and resource existence
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
        tenantId: 'tenant-1',
      });
      
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
        id: 'pet-1',
        name: 'Test Pet',
        customerId: 'customer-1',
        tenantId: 'tenant-1',
      });
      
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        name: 'Test Resource',
        tenantId: 'tenant-1',
      });
      
      // Mock no conflicts
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      });
      
      // Mock successful reservation update
      (prisma.reservation.update as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-11'), // Updated date
        endDate: new Date('2025-06-16'),   // Updated date
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
      });
      
      // Update the request body with new dates
      mockRequest.body.startDate = '2025-06-11';
      mockRequest.body.endDate = '2025-06-16';
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('getCustomerReservations', () => {
    it('should return customer reservations', async () => {
      // Mock reservations for customer
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
        }
      ]);
      
      // Mock customer verification via Customer Service API
      (customerServiceClient.verifyCustomer as jest.Mock).mockResolvedValue(true);
      
      await getCustomerReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle customer not found', async () => {
      // Mock customer verification failure via Customer Service API
      const notFoundError = new Error('Customer with ID customer-1 not found');
      (notFoundError as any).statusCode = 404;
      (customerServiceClient.verifyCustomer as jest.Mock).mockRejectedValue(notFoundError);
      
      await getCustomerReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent with error status
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Customer not found'
        })
      );
    });
  });
});
