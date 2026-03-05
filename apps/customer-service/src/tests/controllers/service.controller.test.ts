import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as serviceController from '../../controllers/service.controller';

// Mock the ServiceCategory enum since we can't access the real one in testing environment
enum ServiceCategory {
  DAYCARE = 'DAYCARE',
  BOARDING = 'BOARDING',
  GROOMING = 'GROOMING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER'
}

// Define mock types to fix TypeScript errors
type MockPrismaClient = {
  service: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  addOnService: {
    findMany: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  reservation: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
};

// Mock the PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient: MockPrismaClient = {
    service: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    addOnService: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    reservation: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    $transaction: jest.fn((callback: (prisma: MockPrismaClient) => any) => callback(mockPrismaClient))
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

describe('Service Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let prisma: any;

  beforeEach(() => {
    mockReq = {
      tenantId: 'test-tenant'  // Default tenantId for all tests
    } as any;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllServices', () => {
    it('should return all services with default pagination', async () => {
      // Setup
      mockReq.query = {};
      const mockServices = [
        { id: '1', name: 'Boarding', serviceCategory: ServiceCategory.BOARDING },
        { id: '2', name: 'Daycare', serviceCategory: ServiceCategory.DAYCARE }
      ];
      prisma.service.findMany.mockResolvedValue(mockServices);
      prisma.service.count.mockResolvedValue(2);

      // Execute
      await serviceController.getAllServices(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        include: {
          availableAddOns: true,
          _count: {
            select: {
              reservations: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        totalPages: 1,
        currentPage: 1,
        data: mockServices
      });
    });

    it('should filter services by search query and category', async () => {
      // Setup
      mockReq.query = {
        search: 'board',
        category: ServiceCategory.BOARDING,
        isActive: 'true',
        page: '2',
        limit: '5'
      };
      const mockServices = [{ id: '1', name: 'Boarding', serviceCategory: ServiceCategory.BOARDING }];
      prisma.service.findMany.mockResolvedValue(mockServices);
      prisma.service.count.mockResolvedValue(1);

      // Execute
      await serviceController.getAllServices(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          serviceCategory: ServiceCategory.BOARDING,
          OR: [
            { name: { contains: 'board', mode: 'insensitive' } },
            { description: { contains: 'board', mode: 'insensitive' } }
          ]
        },
        skip: 5,
        take: 5,
        include: {
          availableAddOns: true,
          _count: {
            select: {
              reservations: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      // Setup
      mockReq.query = {};
      const mockError = new Error('Database error');
      prisma.service.findMany.mockRejectedValue(mockError);

      // Execute
      await serviceController.getAllServices(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('getServiceById', () => {
    it('should return a service by ID', async () => {
      // Setup
      mockReq.params = { id: '1' };
      const mockService = { id: '1', name: 'Boarding', serviceCategory: ServiceCategory.BOARDING };
      prisma.service.findUnique.mockResolvedValue(mockService);

      // Execute
      await serviceController.getServiceById(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          availableAddOns: true,
          _count: {
            select: {
              reservations: true
            }
          }
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockService
      });
    });

    it('should return 404 if service not found', async () => {
      // Setup
      mockReq.params = { id: 'nonexistent' };
      prisma.service.findUnique.mockResolvedValue(null);

      // Execute
      await serviceController.getServiceById(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Service not found'
      }));
    });
  });

  describe('createService', () => {
    it('should create a new service with tenantId', async () => {
      // Setup
      mockReq.body = {
        name: 'New Service',
        description: 'Description',
        price: 50.0,
        duration: 60,
        serviceCategory: ServiceCategory.GROOMING,
        availableAddOns: [
          { name: 'Add-on 1', price: 10.0 }
        ]
      };
      
      const mockCreatedService = {
        id: '1',
        tenantId: 'test-tenant',
        ...mockReq.body,
        availableAddOns: [
          { id: '101', name: 'Add-on 1', price: 10.0, serviceId: '1' }
        ]
      };
      
      prisma.service.create.mockResolvedValue({ id: '1', tenantId: 'test-tenant', ...mockReq.body });
      prisma.service.findUnique.mockResolvedValue(mockCreatedService);

      // Execute
      await serviceController.createService(mockReq as Request, mockRes as Response, mockNext);

      // Assert - Verify tenantId is included in the create call
      expect(prisma.service.create).toHaveBeenCalled();
      const createCall = (prisma.service.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tenantId).toBe('test-tenant');
      expect(createCall.data.name).toBe('New Service');
      expect(createCall.data.description).toBe('Description');
      expect(createCall.data.price).toBe(50.0);
      expect(createCall.data.duration).toBe(60);
      expect(createCall.data.serviceCategory).toBe(ServiceCategory.GROOMING);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockCreatedService
      });
    });

    it('should fail to create service without tenantId', async () => {
      // Setup - simulate missing tenantId
      (mockReq as any).tenantId = undefined;
      mockReq.body = {
        name: 'New Service',
        description: 'Description',
        price: 50.0,
        duration: 60,
        serviceCategory: ServiceCategory.GROOMING
      };

      // Execute
      await serviceController.createService(mockReq as Request, mockRes as Response, mockNext);

      // Assert - should call next with error since tenantId is required
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should set default values for optional fields', async () => {
      // Setup - minimal service data
      mockReq.body = {
        name: 'Minimal Service',
        description: 'Description',
        price: 50.0,
        duration: 60,
        serviceCategory: ServiceCategory.GROOMING
        // No isActive, capacityLimit, or requiresStaff provided
      };
      
      const mockCreatedService = {
        id: '1',
        tenantId: 'test-tenant',
        ...mockReq.body,
        isActive: true,
        capacityLimit: 0,
        requiresStaff: false
      };
      
      prisma.service.create.mockResolvedValue(mockCreatedService);
      prisma.service.findUnique.mockResolvedValue(mockCreatedService);

      // Execute
      await serviceController.createService(mockReq as Request, mockRes as Response, mockNext);

      // Assert - Verify default values are set
      const createCall = (prisma.service.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.isActive).toBe(true);
      expect(createCall.data.capacityLimit).toBe(0);
      expect(createCall.data.requiresStaff).toBe(false);
    });
  });

  describe('updateService', () => {
    it('should update an existing service', async () => {
      // Setup
      mockReq.params = { id: '1' };
      mockReq.body = {
        name: 'Updated Service',
        price: 55.0
      };
      
      prisma.service.findUnique.mockResolvedValueOnce({ id: '1' });
      
      const mockUpdatedService = {
        id: '1',
        name: 'Updated Service',
        price: 55.0,
        availableAddOns: []
      };
      
      prisma.service.update.mockResolvedValue({ id: '1', name: 'Updated Service', price: 55.0 });
      prisma.service.findUnique.mockResolvedValueOnce(mockUpdatedService);

      // Execute
      await serviceController.updateService(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated Service', price: 55.0 }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockUpdatedService
      });
    });

    it('should return 404 if service to update not found', async () => {
      // Setup
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { name: 'Updated Service' };
      prisma.service.findUnique.mockResolvedValue(null);

      // Execute
      await serviceController.updateService(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Service not found'
      }));
    });
  });

  describe('deleteService', () => {
    it('should delete a service with no active reservations', async () => {
      // Setup
      mockReq.params = { id: '1' };
      prisma.service.findUnique.mockResolvedValue({ id: '1' });
      prisma.reservation.count.mockResolvedValue(0);
      mockRes.send = jest.fn(); // Mock the send method
      mockRes.status = jest.fn().mockReturnThis();
      
      // Implement the transaction mock directly for this test
      prisma.$transaction.mockImplementation(async (operations: any[]) => {
        // Just return success for the transaction
        return [{ count: 1 }, { id: '1' }];
      });

      // Execute
      await serviceController.deleteService(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should not delete a service with active reservations', async () => {
      // Setup
      mockReq.params = { id: '1' };
      prisma.service.findUnique.mockResolvedValue({ id: '1' });
      prisma.reservation.count.mockResolvedValue(2);

      // Execute
      await serviceController.deleteService(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Cannot delete service with active reservations'
      }));
      expect(prisma.service.delete).not.toHaveBeenCalled();
    });
  });

  describe('deactivateService', () => {
    it('should deactivate a service', async () => {
      // Setup
      mockReq.params = { id: '1' };
      prisma.service.findUnique.mockResolvedValue({ id: '1' });
      
      const mockDeactivatedService = {
        id: '1',
        isActive: false
      };
      
      prisma.service.update.mockResolvedValue(mockDeactivatedService);

      // Execute
      await serviceController.deactivateService(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockDeactivatedService
      });
    });
  });

  describe('getServiceAddOns', () => {
    it('should return add-ons for a service', async () => {
      // Setup
      mockReq.params = { id: '1' };
      prisma.service.findUnique.mockResolvedValue({ id: '1' });
      
      const mockAddOns = [
        { id: '101', name: 'Add-on 1', price: 10.0, serviceId: '1' },
        { id: '102', name: 'Add-on 2', price: 15.0, serviceId: '1' }
      ];
      
      prisma.addOnService.findMany.mockResolvedValue(mockAddOns);

      // Execute
      await serviceController.getServiceAddOns(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.addOnService.findMany).toHaveBeenCalledWith({
        where: { serviceId: '1' },
        orderBy: { name: 'asc' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        data: mockAddOns
      });
    });
  });

  describe('getServiceReservations', () => {
    it('should return reservations for a service', async () => {
      // Setup
      mockReq.params = { id: '1' };
      mockReq.query = {
        status: 'CONFIRMED',
        page: '1',
        limit: '10'
      };
      
      prisma.service.findUnique.mockResolvedValue({ id: '1' });
      
      const mockReservations = [
        { id: '201', startDate: new Date(), endDate: new Date(), status: 'CONFIRMED' }
      ];
      
      prisma.reservation.findMany.mockResolvedValue(mockReservations);
      prisma.reservation.count.mockResolvedValue(1);

      // Execute
      await serviceController.getServiceReservations(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(prisma.reservation.findMany).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        totalPages: 1,
        currentPage: 1,
        data: mockReservations
      });
    });
  });
});
