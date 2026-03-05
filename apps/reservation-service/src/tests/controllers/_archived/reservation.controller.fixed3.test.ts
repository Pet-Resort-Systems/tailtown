import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as reservationConflicts from '../../utils/reservation-conflicts';
import * as orderNumberUtils from '../../utils/orderNumber';

// Mock the AppError class
const mockAppError = jest.fn();

// Mock the Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    reservation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

// Mock the service module with AppError and safeExecutePrismaQuery
jest.mock('../../utils/service', () => {
  return {
    AppError: jest.fn().mockImplementation((message, statusCode) => {
      const error = new Error(message);
      (error as any).statusCode = statusCode;
      return error;
    }),
    safeExecutePrismaQuery: jest.fn().mockImplementation((fn) => fn()),
  };
});

// Import the controller functions after mocking dependencies
import {
  createReservation,
  updateReservation,
  getReservationById,
  deleteReservation,
  getAllReservations,
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
      body: {
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: '2025-06-10',
        endDate: '2025-06-15',
        status: 'CONFIRMED',
      },
      query: {},
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
  
  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      // Mock successful customer, pet, and resource lookups
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
      });
      
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
        id: 'pet-1',
        name: 'Test Pet',
      });
      
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        name: 'Test Resource',
      });
      
      // Mock no conflicts
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue([]);
      
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
          success: true,
          data: expect.objectContaining({
            id: 'new-reservation',
          }),
        })
      );
      
      // Verify reservation was created with correct data
      expect(prisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'customer-1',
            petId: 'pet-1',
            resourceId: 'resource-1',
          }),
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should auto-assign a resource when no resourceId is provided', async () => {
      // Remove resourceId from request
      mockRequest.body.resourceId = undefined;
      
      // Mock successful customer and pet lookups
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
      });
      
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
        id: 'pet-1',
        name: 'Test Pet',
      });
      
      // Mock available resources
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([
        { id: 'resource-1', name: 'Test Resource 1' },
        { id: 'resource-2', name: 'Test Resource 2' },
      ]);
      
      // Mock no conflicts for the first resource
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue([]);
      
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
          success: true,
          data: expect.objectContaining({
            id: 'new-reservation',
          }),
        })
      );
      
      // Verify reservation was created with auto-assigned resource
      expect(prisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceId: 'resource-1',
          }),
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return error when start date is after end date', async () => {
      // Set invalid dates
      mockRequest.body.startDate = '2025-06-20';
      mockRequest.body.endDate = '2025-06-15';
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Start date must be before end date'),
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should return error when resource is not available', async () => {
      // Mock successful customer, pet, and resource lookups
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
      });
      
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
        id: 'pet-1',
        name: 'Test Pet',
      });
      
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        name: 'Test Resource',
      });
      
      // Mock conflicts
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue([
        { id: 'existing-reservation', startDate: new Date('2025-06-12'), endDate: new Date('2025-06-18') },
      ]);
      
      await createReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Resource is not available'),
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
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should return error when pet does not exist', async () => {
      // Mock successful customer lookup
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
      });
      
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
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
    
    it('should return error when resource does not exist', async () => {
      // Mock successful customer and pet lookups
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
      });
      
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
        id: 'pet-1',
        name: 'Test Pet',
      });
      
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
        })
      );
      
      // Verify reservation was not created
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
  });
  
  describe('updateReservation', () => {
    it('should update a reservation successfully', async () => {
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
      
      // Mock successful customer, pet, and resource lookups
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
      });
      
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
        id: 'pet-1',
        name: 'Test Pet',
      });
      
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        name: 'Test Resource',
      });
      
      // Mock no conflicts
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue([]);
      
      // Mock successful reservation update
      (prisma.reservation.update as jest.Mock).mockResolvedValue({
        id: 'reservation-1',
        customerId: 'customer-1',
        petId: 'pet-1',
        resourceId: 'resource-1',
        startDate: new Date('2025-06-12'),
        endDate: new Date('2025-06-18'),
        status: 'CONFIRMED',
        tenantId: 'tenant-1',
      });
      
      // Update dates in request
      mockRequest.body.startDate = '2025-06-12';
      mockRequest.body.endDate = '2025-06-18';
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'reservation-1',
          }),
        })
      );
      
      // Verify reservation was updated with correct data
      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reservation-1' },
          data: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
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
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return error when start date is after end date', async () => {
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
      
      // Set invalid dates
      mockRequest.body.startDate = '2025-06-20';
      mockRequest.body.endDate = '2025-06-15';
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Start date must be before end date'),
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
    
    it('should return error when resource is not available', async () => {
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
      
      // Mock successful customer, pet, and resource lookups
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
      });
      
      (prisma.pet.findFirst as jest.Mock).mockResolvedValue({
        id: 'pet-1',
        name: 'Test Pet',
      });
      
      (prisma.resource.findFirst as jest.Mock).mockResolvedValue({
        id: 'resource-1',
        name: 'Test Resource',
      });
      
      // Mock conflicts
      (reservationConflicts.detectReservationConflicts as jest.Mock).mockResolvedValue([
        { id: 'existing-reservation', startDate: new Date('2025-06-12'), endDate: new Date('2025-06-18') },
      ]);
      
      // Update dates in request
      mockRequest.body.startDate = '2025-06-12';
      mockRequest.body.endDate = '2025-06-18';
      
      await updateReservation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Resource is not available'),
        })
      );
      
      // Verify reservation was not updated
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
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
          success: true,
          data: expect.objectContaining({
            id: 'reservation-1',
          }),
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
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Reservation not found'),
        })
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
          success: true,
          message: expect.stringContaining('Reservation deleted'),
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
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
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
      // Set status filter
      mockRequest.query.status = 'CONFIRMED';
      
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
        }
      ]);
      
      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'reservation-1', status: 'CONFIRMED' })
          ])
        })
      );
      
      // Verify the query included the status filter
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CONFIRMED'
          })
        })
      );
      
      // Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
  
  describe('getCustomerReservations', () => {
    it('should return customer reservations', async () => {
      // Mock customer exists
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'customer-1',
        name: 'Test Customer',
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
          customer: { id: 'customer-1', name: 'Test Customer' },
          pet: { id: 'pet-1', name: 'Test Pet' },
          resource: { id: 'resource-1', name: 'Test Resource' },
        }
      ]);
      
      await getCustomerReservations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Verify response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
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
        })
      );
      
      // Verify reservations were not fetched
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });
  });
});
