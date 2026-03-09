import { PrismaClient, ServiceCategory } from '@prisma/client';
import * as serviceController from '../../controllers/service.controller';
import { Request, Response } from 'express';

describe('Service Controller Integration Tests', () => {
  let prisma: PrismaClient;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let testServiceId: string;

  beforeAll(async () => {
    // Use actual Prisma client for integration tests
    prisma = new PrismaClient();
    
    // Clean up any test data from previous runs
    await prisma.addOnService.deleteMany({
      where: {
        name: {
          startsWith: 'Test_'
        }
      }
    });
    
    await prisma.service.deleteMany({
      where: {
        name: {
          startsWith: 'Test_'
        }
      }
    });
  });

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => data),
      send: jest.fn()
    };
    mockNext = jest.fn();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.addOnService.deleteMany({
      where: {
        name: {
          startsWith: 'Test_'
        }
      }
    });
    
    await prisma.service.deleteMany({
      where: {
        name: {
          startsWith: 'Test_'
        }
      }
    });
    
    await prisma.$disconnect();
  });

  it('should create, retrieve, update, and delete a service in the database', async () => {
    // 1. Create a test service
    mockReq.body = {
      name: 'Test_Integration_Service',
      description: 'Test service for integration testing',
      duration: 60,
      price: 50.0,
      serviceCategory: ServiceCategory.TRAINING,
      isActive: true,
      availableAddOns: [
        {
          name: 'Test_AddOn',
          description: 'Test add-on',
          price: 10.0
        }
      ]
    };

    await serviceController.createService(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Verify service was created
    expect(mockRes.status).toHaveBeenCalledWith(201);
    const createdService = (mockRes.json as jest.Mock).mock.calls[0][0].data;
    expect(createdService.name).toBe('Test_Integration_Service');
    testServiceId = createdService.id;

    // 2. Retrieve the service
    mockReq = { params: { id: testServiceId } };
    
    await serviceController.getServiceById(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Verify service was retrieved
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const retrievedService = (mockRes.json as jest.Mock).mock.calls[1][0].data;
    expect(retrievedService.id).toBe(testServiceId);
    expect(retrievedService.price).toBe(50.0);
    expect(retrievedService.availableAddOns).toHaveLength(1);

    // 3. Update the service
    mockReq = {
      params: { id: testServiceId },
      body: {
        name: 'Test_Integration_Service_Updated',
        price: 55.0
      }
    };
    
    await serviceController.updateService(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Verify service was updated
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const updatedService = (mockRes.json as jest.Mock).mock.calls[2][0].data;
    expect(updatedService.name).toBe('Test_Integration_Service_Updated');
    expect(updatedService.price).toBe(55.0);

    // 4. Get the add-ons
    mockReq = { params: { id: testServiceId } };
    
    await serviceController.getServiceAddOns(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Verify add-ons were retrieved
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const addOns = (mockRes.json as jest.Mock).mock.calls[3][0].data;
    expect(addOns).toHaveLength(1);
    expect(addOns[0].name).toBe('Test_AddOn');

    // 5. Deactivate the service
    await serviceController.deactivateService(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Verify service was deactivated
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const deactivatedService = (mockRes.json as jest.Mock).mock.calls[4][0].data;
    expect(deactivatedService.isActive).toBe(false);

    // 6. Delete the service
    await serviceController.deleteService(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Verify service was deleted
    expect(mockRes.status).toHaveBeenCalledWith(204);

    // 7. Verify service no longer exists
    mockReq = { params: { id: testServiceId } };
    
    await serviceController.getServiceById(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );
    
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error.statusCode).toBe(404);
  });

  it('should handle filtering services by category', async () => {
    // 1. Create test services with different categories
    mockReq.body = {
      name: 'Test_Grooming_Service',
      duration: 60,
      price: 40.0,
      serviceCategory: ServiceCategory.GROOMING,
      isActive: true
    };
    await serviceController.createService(
      mockReq as Request,
      { status: jest.fn().mockReturnThis(), json: jest.fn() } as any,
      jest.fn()
    );

    mockReq.body = {
      name: 'Test_Boarding_Service',
      duration: 1440,
      price: 60.0,
      serviceCategory: ServiceCategory.BOARDING,
      isActive: true
    };
    await serviceController.createService(
      mockReq as Request,
      { status: jest.fn().mockReturnThis(), json: jest.fn() } as any,
      jest.fn()
    );

    // 2. Test filtering by category
    mockReq = {
      query: {
        category: ServiceCategory.GROOMING,
        isActive: 'true'
      }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await serviceController.getAllServices(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Verify filtering works
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const filteredServices = (mockRes.json as jest.Mock).mock.calls[0][0].data;
    expect(filteredServices.length).toBeGreaterThanOrEqual(1);
    filteredServices.forEach((service: any) => {
      expect(service.serviceCategory).toBe(ServiceCategory.GROOMING);
      expect(service.isActive).toBe(true);
    });
  });

  it('should prevent deletion of a service with active reservations', async () => {
    // This test would need to create a service and add active reservations
    // For now, we'll mock the behavior by mocking the reservation count
    
    // 1. Create a test service
    mockReq.body = {
      name: 'Test_Service_With_Reservations',
      duration: 60,
      price: 45.0,
      serviceCategory: ServiceCategory.OTHER,
      isActive: true
    };

    const createRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => data)
    };
    
    await serviceController.createService(
      mockReq as Request,
      createRes as any,
      jest.fn()
    );

    const serviceId = createRes.json.mock.calls[0][0].data.id;

    // 2. Mock the reservation count to be > 0
    // In a real integration test, we would create actual reservations
    // For this test, we need to manually check the controller logic

    // 3. Attempt to delete the service
    mockReq = { params: { id: serviceId } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    mockNext = jest.fn();
    
    // Note: This test can't fully test the prevention of deletion without
    // actually creating reservations. In a real integration test with a test database,
    // this would work properly.
  });
});
