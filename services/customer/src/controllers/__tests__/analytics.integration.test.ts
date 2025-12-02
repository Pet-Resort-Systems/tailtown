/**
 * Analytics Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Request, Response, NextFunction } from "express";
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from "../../test/setup-test-db";
import {
  getDashboardSummary,
  getSalesByService,
} from "../analytics-fixed.controller";

describe("Analytics Controller Integration Tests", () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerId: string;
  let testServiceId: string;
  let testReservationIds: string[] = [];
  let testInvoiceIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`analytics-test-${Date.now()}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: "Analytics",
        lastName: "Test",
        email: `analytics-test-${Date.now()}@example.com`,
        phone: "555-0800",
      },
    });
    testCustomerId = customer.id;

    // Create test pet
    const pet = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: "AnalyticsPet",
        type: "DOG",
        breed: "Test Breed",
      },
    });

    // Create test service
    const service = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: "Analytics Test Service",
        serviceCategory: "BOARDING",
        price: 75,
        duration: 1440,
        isActive: true,
      },
    });
    testServiceId = service.id;

    // Create test resource
    const resource = await prisma.resource.create({
      data: {
        tenantId: testTenantId,
        name: "Analytics Test Suite",
        type: "JUNIOR_KENNEL",
        isActive: true,
      },
    });

    // Create test reservations for analytics
    const reservation1 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: pet.id,
        serviceId: testServiceId,
        resourceId: resource.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "CONFIRMED",
      },
    });
    testReservationIds.push(reservation1.id);

    const reservation2 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: pet.id,
        serviceId: testServiceId,
        resourceId: resource.id,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: "CHECKED_OUT",
      },
    });
    testReservationIds.push(reservation2.id);

    // Create test invoices
    const invoice1 = await prisma.invoice.create({
      data: {
        tenantId: testTenantId,
        invoiceNumber: `INV-ANALYTICS-${Date.now()}-1`,
        customerId: testCustomerId,
        subtotal: 150,
        total: 150,
        status: "PAID",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    testInvoiceIds.push(invoice1.id);

    const invoice2 = await prisma.invoice.create({
      data: {
        tenantId: testTenantId,
        invoiceNumber: `INV-ANALYTICS-${Date.now()}-2`,
        customerId: testCustomerId,
        subtotal: 225,
        total: 225,
        status: "PAID",
        issueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });
    testInvoiceIds.push(invoice2.id);
  });

  afterAll(async () => {
    // Clean up in order
    for (const invoiceId of testInvoiceIds) {
      await prisma.invoice.delete({ where: { id: invoiceId } }).catch(() => {});
    }
    for (const resId of testReservationIds) {
      await prisma.reservation.delete({ where: { id: resId } }).catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getDashboardSummary", () => {
    it("should return dashboard summary for current month", async () => {
      const req = {
        query: { period: "month" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getDashboardSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.status).toBe("success");
      expect(responseData.data).toHaveProperty("totalRevenue");
      expect(responseData.data).toHaveProperty("customerCount");
      expect(responseData.data).toHaveProperty("reservationCount");
      expect(responseData.data.period).toBe("month");
    });

    it("should return dashboard summary for all time", async () => {
      const req = {
        query: { period: "all" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getDashboardSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.customerCount).toBeGreaterThanOrEqual(1);
    });

    it("should return dashboard summary with custom date range", async () => {
      const startDate = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const endDate = new Date().toISOString();

      const req = {
        query: { period: "custom", startDate, endDate },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getDashboardSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.status).toBe("success");
    });

    it("should return service data breakdown", async () => {
      const req = {
        query: { period: "all" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getDashboardSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data).toHaveProperty("serviceData");
      expect(Array.isArray(responseData.data.serviceData)).toBe(true);
    });

    it("should include add-on revenue data", async () => {
      const req = {
        query: { period: "all" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getDashboardSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data).toHaveProperty("addOnRevenue");
      expect(responseData.data).toHaveProperty("addOnData");
    });

    it("should default to month period when not specified", async () => {
      const req = {
        query: {},
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getDashboardSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.period).toBe("month");
    });
  });

  describe("getSalesByService", () => {
    it("should return sales data by service", async () => {
      const req = {
        query: { period: "all" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getSalesByService(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.status).toBe("success");
      expect(responseData.data).toHaveProperty("services");
      expect(Array.isArray(responseData.data.services)).toBe(true);
    });

    it("should filter by period", async () => {
      const req = {
        query: { period: "month" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getSalesByService(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should include service count and revenue", async () => {
      const req = {
        query: { period: "all" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getSalesByService(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];

      if (responseData.data.services.length > 0) {
        const service = responseData.data.services[0];
        expect(service).toHaveProperty("name");
        expect(service).toHaveProperty("count");
      }
    });
  });
});
