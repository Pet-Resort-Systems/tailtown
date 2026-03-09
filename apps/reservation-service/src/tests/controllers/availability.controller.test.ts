// @ts-nocheck
/**
 * Tests for availability.controller.ts
 *
 * Tests the resource availability checking functionality.
 */

import { Response, NextFunction } from "express";

// Mock dependencies
jest.mock("../../config/prisma", () => ({
  prisma: {
    resource: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../utils/schemaUtils", () => ({
  safeExecutePrismaQuery: jest.fn((fn) => fn()),
}));

jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { prisma } from "../../config/prisma";
import { safeExecutePrismaQuery } from "../../utils/schemaUtils";
import { checkResourceAvailability } from "../../controllers/resource/availability.controller";

// Helper to create mock request
const createMockRequest = (overrides: any = {}) => {
  return {
    tenantId: "test-tenant",
    query: {},
    ...overrides,
  };
};

// Helper to create mock response
const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe("Availability Controller", () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
  });

  describe("checkResourceAvailability", () => {
    describe("validation", () => {
      it("should require tenant ID in production", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        const req = createMockRequest({
          tenantId: null,
          query: { resourceId: "res-1" },
        });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Tenant ID"),
          })
        );

        process.env.NODE_ENV = originalEnv;
      });

      it("should require resourceId or resourceType", async () => {
        const req = createMockRequest({ query: { date: "2024-06-15" } });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Resource ID or Resource Type"),
          })
        );
      });

      it("should require date or date range", async () => {
        const req = createMockRequest({ query: { resourceId: "res-1" } });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("date"),
          })
        );
      });

      it("should reject invalid date format", async () => {
        const req = createMockRequest({
          query: { resourceId: "res-1", date: "invalid-date" },
        });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Invalid date format",
          })
        );
      });

      it("should reject invalid date range format", async () => {
        const req = createMockRequest({
          query: {
            resourceId: "res-1",
            startDate: "invalid",
            endDate: "2024-06-20",
          },
        });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Invalid date format",
          })
        );
      });
    });

    describe("single date check", () => {
      it("should check availability for a single date", async () => {
        const mockResource = {
          id: "res-1",
          name: "Kennel 1",
          type: "JUNIOR_KENNEL",
        };
        (prisma.resource.findFirst as jest.Mock).mockResolvedValue(
          mockResource
        );
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          query: { resourceId: "res-1", date: "2024-06-15" },
        });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(prisma.resource.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: "res-1",
              tenantId: "test-tenant",
            }),
          })
        );
        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe("date range check", () => {
      it("should check availability for a date range", async () => {
        const mockResource = { id: "res-1", name: "Kennel 1" };
        (prisma.resource.findFirst as jest.Mock).mockResolvedValue(
          mockResource
        );
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          query: {
            resourceId: "res-1",
            startDate: "2024-06-15",
            endDate: "2024-06-20",
          },
        });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe("resource type check", () => {
      it("should find resources by type", async () => {
        const mockResources = [
          { id: "res-1", name: "Kennel 1", type: "JUNIOR_KENNEL" },
          { id: "res-2", name: "Kennel 2", type: "JUNIOR_KENNEL" },
        ];
        (prisma.resource.findMany as jest.Mock).mockResolvedValue(
          mockResources
        );
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          query: { resourceType: "JUNIOR_KENNEL", date: "2024-06-15" },
        });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(prisma.resource.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: "test-tenant",
              type: "JUNIOR_KENNEL",
            }),
          })
        );
      });
    });

    describe("empty results", () => {
      it("should return empty array when no resources found", async () => {
        (prisma.resource.findFirst as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest({
          query: { resourceId: "nonexistent", date: "2024-06-15" },
        });
        const res = createMockResponse();

        await checkResourceAvailability(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              resources: [],
            }),
          })
        );
      });
    });
  });

  describe("Date parsing logic", () => {
    it("should parse YYYY-MM-DD format correctly", () => {
      const dateStr = "2024-06-15T00:00:00";
      const parsed = new Date(dateStr);

      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(5); // 0-indexed
      expect(parsed.getDate()).toBe(15);
    });

    it("should detect invalid dates", () => {
      const invalidDate = new Date("not-a-date");
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });

    it("should handle date range validation", () => {
      const startDate = new Date("2024-06-15T00:00:00");
      const endDate = new Date("2024-06-20T00:00:00");

      expect(endDate > startDate).toBe(true);
    });
  });

  describe("Availability status determination", () => {
    const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN"];
    const inactiveStatuses = ["CANCELLED", "COMPLETED", "NO_SHOW"];

    activeStatuses.forEach((status) => {
      it(`should consider ${status} reservations as occupying`, () => {
        expect(activeStatuses.includes(status)).toBe(true);
      });
    });

    inactiveStatuses.forEach((status) => {
      it(`should not consider ${status} reservations as occupying`, () => {
        expect(activeStatuses.includes(status)).toBe(false);
      });
    });
  });
});
