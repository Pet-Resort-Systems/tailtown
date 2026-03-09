/**
 * Reservation CRUD Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Response, NextFunction } from "express";
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from "../../test/setup-test-db";
import {
  createReservation,
  updateReservation,
  deleteReservation,
} from "../reservation/reservation-crud.controller";
import { TenantRequest } from "../../middleware/tenant.middleware";

describe("Reservation CRUD Controller Integration Tests", () => {
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
    testTenantId = await createTestTenant(
      `reservation-crud-test-${Date.now()}`
    );

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: "Reservation",
        lastName: "Test",
        email: `reservation-crud-${Date.now()}@example.com`,
        phone: "555-0700",
      },
    });
    testCustomerId = customer.id;

    // Create test pet
    const pet = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: "ReservationPet",
        type: "DOG",
        breed: "Test Breed",
      },
    });
    testPetId = pet.id;

    // Create test service
    const service = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: "Reservation Test Service",
        serviceCategory: "BOARDING",
        price: 50,
        duration: 1440,
        isActive: true,
      },
    });
    testServiceId = service.id;

    // Create test resource (JUNIOR_KENNEL matches default for BOARDING)
    const resource = await prisma.resource.create({
      data: {
        tenantId: testTenantId,
        name: "Reservation Test Kennel",
        type: "JUNIOR_KENNEL",
        isActive: true,
      },
    });
    testResourceId = resource.id;
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

  describe("createReservation", () => {
    it("should create a new reservation", async () => {
      const startDate = new Date("2025-12-15");
      const endDate = new Date("2025-12-18");

      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceId,
          resourceId: testResourceId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: "PENDING",
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createReservation(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.customerId).toBe(testCustomerId);
      expect(responseData.data.petId).toBe(testPetId);
      expect(responseData.data.status).toBe("PENDING");
      testReservationIds.push(responseData.data.id);
    });

    it("should reject reservation without serviceId", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          customerId: testCustomerId,
          petId: testPetId,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createReservation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain("Service ID is required");
    });

    it("should reject reservation with non-existent customer", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          customerId: "00000000-0000-0000-0000-000000000000",
          petId: testPetId,
          serviceId: testServiceId,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createReservation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain("Customer not found");
    });

    it("should reject reservation with non-existent pet", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          customerId: testCustomerId,
          petId: "00000000-0000-0000-0000-000000000000",
          serviceId: testServiceId,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createReservation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain("Pet not found");
    });
  });

  describe("updateReservation", () => {
    let updateReservationId: string;

    beforeAll(async () => {
      const reservation = await prisma.reservation.create({
        data: {
          tenantId: testTenantId,
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceId,
          resourceId: testResourceId,
          startDate: new Date("2025-12-20"),
          endDate: new Date("2025-12-22"),
          status: "PENDING",
        },
      });
      updateReservationId = reservation.id;
      testReservationIds.push(updateReservationId);
    });

    it("should update reservation status", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: updateReservationId },
        query: {},
        body: {
          status: "CONFIRMED",
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateReservation(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.status).toBe("CONFIRMED");
    });

    it("should update reservation dates", async () => {
      const newStartDate = new Date("2025-12-21");
      const newEndDate = new Date("2025-12-24");

      const req = {
        tenantId: testTenantId,
        params: { id: updateReservationId },
        query: {},
        body: {
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateReservation(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle non-existent reservation gracefully", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: { status: "CONFIRMED" },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateReservation(req, res, mockNext);

      // Either next is called with error or Prisma throws
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("deleteReservation", () => {
    let deleteReservationId: string;

    beforeAll(async () => {
      const reservation = await prisma.reservation.create({
        data: {
          tenantId: testTenantId,
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceId,
          resourceId: testResourceId,
          startDate: new Date("2025-12-25"),
          endDate: new Date("2025-12-27"),
          status: "PENDING",
        },
      });
      deleteReservationId = reservation.id;
      testReservationIds.push(deleteReservationId);
    });

    it("should delete reservation (hard delete)", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: deleteReservationId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deleteReservation(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(204);

      // Verify reservation is deleted
      const reservation = await prisma.reservation.findUnique({
        where: { id: deleteReservationId },
      });
      expect(reservation).toBeNull();
    });

    it("should handle non-existent reservation on delete", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deleteReservation(req, res, mockNext);

      // Prisma throws error for non-existent record
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
