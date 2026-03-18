/**
 * Reservation Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Request, Response, NextFunction } from 'express';
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from '../../test/setup-test-db';
import { getAllReservations } from '../reservation/reservation-queries.controller';
import { TenantRequest } from '../../middleware/tenant.middleware';

describe('Reservation Controller Integration Tests', () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerId: string;
  let testPetId: string;
  let testServiceId: string;
  let testResourceId: string;
  let testReservationIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`reservation-test-${Date.now()}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: 'Reservation',
        lastName: 'Test',
        email: `reservation-test-${Date.now()}@example.com`,
        phone: '555-0400',
      },
    });
    testCustomerId = customer.id;

    // Create test pet
    const pet = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: 'ReservationTestPet',
        type: 'DOG',
        breed: 'Test Breed',
      },
    });
    testPetId = pet.id;

    // Create test service
    const service = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: 'Reservation Test Service',
        serviceCategory: 'BOARDING',
        price: 50,
        duration: 1440,
        isActive: true,
      },
    });
    testServiceId = service.id;

    // Create test resource
    const resource = await prisma.resource.create({
      data: {
        tenantId: testTenantId,
        name: 'Reservation Test Suite',
        type: 'STANDARD_SUITE',
        isActive: true,
      },
    });
    testResourceId = resource.id;

    // Create test reservations
    const res1 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: testPetId,
        serviceId: testServiceId,
        resourceId: testResourceId,
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-03'),
        status: 'CONFIRMED',
      },
    });
    testReservationIds.push(res1.id);

    const res2 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: testPetId,
        serviceId: testServiceId,
        resourceId: testResourceId,
        startDate: new Date('2025-12-10'),
        endDate: new Date('2025-12-15'),
        status: 'PENDING',
      },
    });
    testReservationIds.push(res2.id);

    const res3 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: testPetId,
        serviceId: testServiceId,
        resourceId: testResourceId,
        startDate: new Date('2025-12-20'),
        endDate: new Date('2025-12-25'),
        status: 'CANCELLED',
      },
    });
    testReservationIds.push(res3.id);
  });

  afterAll(async () => {
    // Clean up reservations
    for (const resId of testReservationIds) {
      await prisma.reservation.delete({ where: { id: resId } }).catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllReservations', () => {
    it('should return all reservations for tenant', async () => {
      const req = {
        query: {},
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: expect.any(Number),
          data: expect.any(Array),
        })
      );

      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(3);
    });

    it('should filter by CONFIRMED status', async () => {
      const req = {
        query: { status: 'CONFIRMED' },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      responseData.data.forEach((reservation: any) => {
        expect(reservation.status).toBe('CONFIRMED');
      });
    });

    it('should filter by PENDING status', async () => {
      const req = {
        query: { status: 'PENDING' },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      responseData.data.forEach((reservation: any) => {
        expect(reservation.status).toBe('PENDING');
      });
    });

    it('should filter by date range', async () => {
      const req = {
        query: {
          startDate: '2025-12-01',
          endDate: '2025-12-05',
        },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(1);
    });

    it('should paginate results', async () => {
      const req = {
        query: { page: '1', limit: '1' },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.length).toBeLessThanOrEqual(1);
      expect(responseData.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should return reservations with startDate field', async () => {
      const req = {
        query: {},
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];

      if (responseData.data.length >= 1) {
        // Verify all reservations have startDate
        responseData.data.forEach((r: any) => {
          expect(r.startDate).toBeDefined();
          expect(new Date(r.startDate)).toBeInstanceOf(Date);
        });
      }
    });

    it('should include related customer data', async () => {
      const req = {
        query: {},
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];

      if (responseData.data.length > 0) {
        const reservation = responseData.data[0];
        expect(reservation).toHaveProperty('customer');
      }
    });

    it('should include related pet data', async () => {
      const req = {
        query: {},
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];

      if (responseData.data.length > 0) {
        const reservation = responseData.data[0];
        expect(reservation).toHaveProperty('pet');
      }
    });

    it('should include related service data', async () => {
      const req = {
        query: {},
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];

      if (responseData.data.length > 0) {
        const reservation = responseData.data[0];
        expect(reservation).toHaveProperty('service');
      }
    });

    it('should find reservations overlapping with single date', async () => {
      const req = {
        query: { date: '2025-12-02' },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for date range with no reservations', async () => {
      const req = {
        query: {
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllReservations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBe(0);
    });
  });
});
