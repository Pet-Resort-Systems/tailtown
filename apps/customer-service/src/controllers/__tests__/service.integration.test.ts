/**
 * Service Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Response, NextFunction } from 'express';
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from '../../test/setup-test-db';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  deactivateService,
} from '../service.controller';
import { TenantRequest } from '../../middleware/tenant.middleware';

describe('Service Controller Integration Tests', () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testServiceIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`service-test-${Date.now()}`);

    // Create test services
    const service1 = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: 'Boarding Service',
        serviceCategory: 'BOARDING',
        price: 50,
        duration: 1440,
        isActive: true,
      },
    });
    testServiceIds.push(service1.id);

    const service2 = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: 'Grooming Service',
        serviceCategory: 'GROOMING',
        price: 75,
        duration: 60,
        isActive: true,
      },
    });
    testServiceIds.push(service2.id);

    const service3 = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: 'Inactive Service',
        serviceCategory: 'DAYCARE',
        price: 35,
        duration: 480,
        isActive: false,
      },
    });
    testServiceIds.push(service3.id);
  });

  afterAll(async () => {
    // Clean up services
    for (const serviceId of testServiceIds) {
      await prisma.service.delete({ where: { id: serviceId } }).catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllServices', () => {
    it('should return all services for tenant', async () => {
      const req = {
        tenantId: testTenantId,
        query: {},
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllServices(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(2);
    });

    it('should filter by category', async () => {
      const req = {
        tenantId: testTenantId,
        query: { category: 'BOARDING' },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllServices(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      responseData.data.forEach((service: any) => {
        expect(service.serviceCategory).toBe('BOARDING');
      });
    });

    it('should return services including active ones', async () => {
      const req = {
        tenantId: testTenantId,
        query: {},
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllServices(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      // At least some services should be returned
      expect(responseData.results).toBeGreaterThanOrEqual(1);
    });

    it('should include inactive when requested', async () => {
      const req = {
        tenantId: testTenantId,
        query: { includeInactive: 'true' },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllServices(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(3);
    });

    it('should search by name', async () => {
      const req = {
        tenantId: testTenantId,
        query: { search: 'Boarding' },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllServices(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getServiceById', () => {
    it('should return service by ID', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: testServiceIds[0] },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getServiceById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.id).toBe(testServiceIds[0]);
      expect(responseData.data.name).toBe('Boarding Service');
    });

    it('should return 404 for non-existent service', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: '00000000-0000-0000-0000-000000000000' },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getServiceById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('not found');
    });
  });

  describe('createService', () => {
    it('should create a new service', async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          name: `New Service ${Date.now()}`,
          serviceCategory: 'TRAINING',
          price: 100,
          duration: 60,
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createService(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.serviceCategory).toBe('TRAINING');
      testServiceIds.push(responseData.data.id);
    });

    it('should reject service without name', async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          serviceCategory: 'BOARDING',
          price: 50,
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createService(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('updateService', () => {
    let updateServiceId: string;

    beforeAll(async () => {
      const service = await prisma.service.create({
        data: {
          tenantId: testTenantId,
          name: 'Update Test Service',
          serviceCategory: 'BOARDING',
          price: 60,
          duration: 1440,
          isActive: true,
        },
      });
      updateServiceId = service.id;
      testServiceIds.push(updateServiceId);
    });

    it('should update service fields', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: updateServiceId },
        query: {},
        body: {
          name: 'Updated Service Name',
          price: 80,
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateService(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.name).toBe('Updated Service Name');
      expect(responseData.data.price).toBe(80);
    });

    it('should return 404 for non-existent service', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: '00000000-0000-0000-0000-000000000000' },
        query: {},
        body: { name: 'Test' },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateService(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('deactivateService', () => {
    let deactivateServiceId: string;

    beforeAll(async () => {
      const service = await prisma.service.create({
        data: {
          tenantId: testTenantId,
          name: 'Deactivate Test Service',
          serviceCategory: 'GROOMING',
          price: 45,
          duration: 45,
          isActive: true,
        },
      });
      deactivateServiceId = service.id;
      testServiceIds.push(deactivateServiceId);
    });

    it('should deactivate service', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: deactivateServiceId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deactivateService(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify service is deactivated
      const service = await prisma.service.findUnique({
        where: { id: deactivateServiceId },
      });
      expect(service?.isActive).toBe(false);
    });

    it('should return 404 for non-existent service', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: '00000000-0000-0000-0000-000000000000' },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deactivateService(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('deleteService', () => {
    let deleteServiceId: string;

    beforeAll(async () => {
      const service = await prisma.service.create({
        data: {
          tenantId: testTenantId,
          name: 'Delete Test Service',
          serviceCategory: 'DAYCARE',
          price: 30,
          duration: 480,
          isActive: true,
        },
      });
      deleteServiceId = service.id;
      testServiceIds.push(deleteServiceId);
    });

    it('should delete service', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: deleteServiceId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deleteService(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 for non-existent service', async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: '00000000-0000-0000-0000-000000000000' },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deleteService(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
