/**
 * Suite Controller Integration Tests
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
  getAllSuites,
  updateSuiteCleaning,
  getSuiteStats,
} from "../suite.controller";

describe("Suite Controller Integration Tests", () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testSuiteIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`suite-test-${Date.now()}`);

    // Create test suites
    const suite1 = await prisma.resource.create({
      data: {
        tenantId: testTenantId,
        name: "Suite A",
        type: "STANDARD_SUITE",
        isActive: true,
      },
    });
    testSuiteIds.push(suite1.id);

    const suite2 = await prisma.resource.create({
      data: {
        tenantId: testTenantId,
        name: "Suite B",
        type: "VIP_SUITE",
        isActive: true,
      },
    });
    testSuiteIds.push(suite2.id);

    const suite3 = await prisma.resource.create({
      data: {
        tenantId: testTenantId,
        name: "Suite C",
        type: "STANDARD_PLUS_SUITE",
        isActive: false, // Inactive suite
      },
    });
    testSuiteIds.push(suite3.id);
  });

  afterAll(async () => {
    // Clean up suites
    for (const suiteId of testSuiteIds) {
      await prisma.resource.delete({ where: { id: suiteId } }).catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllSuites", () => {
    it("should return all active suites", async () => {
      const req = {
        query: {},
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getAllSuites(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.status).toBe("success");
      expect(Array.isArray(responseData.data)).toBe(true);
    });

    it("should filter by suite type", async () => {
      const req = {
        query: { type: "VIP_SUITE" },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getAllSuites(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      responseData.data.forEach((suite: any) => {
        expect(suite.type).toBe("VIP_SUITE");
      });
    });

    it("should filter by date", async () => {
      const today = new Date().toISOString().split("T")[0];
      const req = {
        query: { date: today },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getAllSuites(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("updateSuiteCleaning", () => {
    let cleaningSuiteId: string;

    beforeAll(async () => {
      const suite = await prisma.resource.create({
        data: {
          tenantId: testTenantId,
          name: "Cleaning Test Suite",
          type: "STANDARD_SUITE",
          isActive: true,
        },
      });
      cleaningSuiteId = suite.id;
      testSuiteIds.push(cleaningSuiteId);
    });

    it("should update suite cleaning status", async () => {
      const req = {
        params: { id: cleaningSuiteId },
        query: {},
        body: {
          cleaningStatus: "CLEAN",
        },
      } as unknown as Request;
      const res = createMockResponse();

      await updateSuiteCleaning(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle non-existent suite", async () => {
      const req = {
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: { cleaningStatus: "CLEAN" },
      } as unknown as Request;
      const res = createMockResponse();

      await updateSuiteCleaning(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("getSuiteStats", () => {
    it("should return suite statistics", async () => {
      const req = {
        query: {},
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getSuiteStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.status).toBe("success");
    });

    it("should filter stats by date", async () => {
      const today = new Date().toISOString().split("T")[0];
      const req = {
        query: { date: today },
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getSuiteStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
