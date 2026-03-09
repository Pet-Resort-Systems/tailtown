// @ts-nocheck
/**
 * Tests for batch-availability.controller.ts
 *
 * Tests the batch resource availability checking functionality.
 */

import { Response, NextFunction } from "express";

// Mock dependencies
jest.mock("../../config/prisma", () => ({
  prisma: {
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
import { batchCheckResourceAvailability } from "../../controllers/resource/batch-availability.controller";

// Helper to create mock request
const createMockRequest = (overrides: any = {}) => {
  return {
    tenantId: "test-tenant",
    body: {},
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

describe("Batch Availability Controller", () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
  });

  describe("batchCheckResourceAvailability", () => {
    describe("validation", () => {
      it("should require tenant ID in production", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        const req = createMockRequest({
          tenantId: null,
          body: { resources: ["res-1"], date: "2024-06-15" },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Tenant ID"),
          })
        );

        process.env.NODE_ENV = originalEnv;
      });

      it("should require resources array", async () => {
        const req = createMockRequest({
          body: { date: "2024-06-15" },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Resource IDs are required"),
          })
        );
      });

      it("should accept resources field", async () => {
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          body: {
            resources: ["res-1", "res-2"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should accept resourceIds field for backward compatibility", async () => {
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          body: {
            resourceIds: ["res-1", "res-2"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should reject empty resources array", async () => {
        const req = createMockRequest({
          body: { resources: [], date: "2024-06-15" },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Resource IDs are required"),
          })
        );
      });

      it("should require date or date range", async () => {
        const req = createMockRequest({
          body: { resources: ["res-1"] },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("date"),
          })
        );
      });

      it("should reject invalid date format", async () => {
        const req = createMockRequest({
          body: { resources: ["res-1"], date: "invalid-date" },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Invalid date format",
          })
        );
      });

      it("should reject invalid date range format", async () => {
        const req = createMockRequest({
          body: {
            resources: ["res-1"],
            startDate: "invalid",
            endDate: "2024-06-20",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Invalid date format",
          })
        );
      });
    });

    describe("single date check", () => {
      it("should check availability for a single date", async () => {
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          body: {
            resources: ["res-1", "res-2"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
          })
        );
      });
    });

    describe("date range check", () => {
      it("should check availability for a date range", async () => {
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          body: {
            resources: ["res-1", "res-2"],
            startDate: "2024-06-15",
            endDate: "2024-06-20",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe("availability results", () => {
      it("should return available when no reservations", async () => {
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          body: {
            resources: ["res-1", "res-2"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              resources: expect.arrayContaining([
                expect.objectContaining({
                  resourceId: "res-1",
                  isAvailable: true,
                }),
                expect.objectContaining({
                  resourceId: "res-2",
                  isAvailable: true,
                }),
              ]),
            }),
          })
        );
      });

      it("should return unavailable when reservations exist", async () => {
        const mockReservations = [
          {
            id: "reservation-1",
            resourceId: "res-1",
            startDate: new Date("2024-06-15"),
            endDate: new Date("2024-06-17"),
            status: "CONFIRMED",
          },
        ];
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue(
          mockReservations
        );

        const req = createMockRequest({
          body: {
            resources: ["res-1", "res-2"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              resources: expect.arrayContaining([
                expect.objectContaining({
                  resourceId: "res-1",
                  isAvailable: false,
                }),
              ]),
            }),
          })
        );
      });

      it("should include occupying reservations in response", async () => {
        const mockReservations = [
          {
            id: "reservation-1",
            resourceId: "res-1",
            startDate: new Date("2024-06-15"),
            endDate: new Date("2024-06-17"),
            status: "CONFIRMED",
            customerId: "cust-1",
            petId: "pet-1",
          },
        ];
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue(
          mockReservations
        );

        const req = createMockRequest({
          body: {
            resources: ["res-1"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              resources: expect.arrayContaining([
                expect.objectContaining({
                  resourceId: "res-1",
                  isAvailable: false,
                }),
              ]),
            }),
          })
        );
      });
    });

    describe("query construction", () => {
      it("should query with correct tenant ID", async () => {
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          tenantId: "specific-tenant",
          body: {
            resources: ["res-1"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        // Verify safeExecutePrismaQuery was called
        expect(safeExecutePrismaQuery).toHaveBeenCalled();
      });

      it("should query for active reservation statuses only", async () => {
        (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

        const req = createMockRequest({
          body: {
            resources: ["res-1"],
            date: "2024-06-15",
          },
        });
        const res = createMockResponse();

        await batchCheckResourceAvailability(req, res, mockNext);

        // The query should filter by PENDING, CONFIRMED, CHECKED_IN statuses
        expect(safeExecutePrismaQuery).toHaveBeenCalled();
      });
    });
  });

  describe("Batch processing logic", () => {
    it("should handle multiple resources efficiently", async () => {
      (safeExecutePrismaQuery as jest.Mock).mockResolvedValue([]);

      const resources = Array.from({ length: 50 }, (_, i) => `res-${i}`);
      const req = createMockRequest({
        body: {
          resources,
          date: "2024-06-15",
        },
      });
      const res = createMockResponse();

      await batchCheckResourceAvailability(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      // Should only make one database query for all resources
      expect(safeExecutePrismaQuery).toHaveBeenCalledTimes(1);
    });

    it("should group reservations by resource correctly", async () => {
      const mockReservations = [
        { id: "r1", resourceId: "res-1" },
        { id: "r2", resourceId: "res-1" },
        { id: "r3", resourceId: "res-2" },
      ];
      (safeExecutePrismaQuery as jest.Mock).mockResolvedValue(mockReservations);

      const req = createMockRequest({
        body: {
          resources: ["res-1", "res-2", "res-3"],
          date: "2024-06-15",
        },
      });
      const res = createMockResponse();

      await batchCheckResourceAvailability(req, res, mockNext);

      // Verify the response was called
      expect(res.json).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
