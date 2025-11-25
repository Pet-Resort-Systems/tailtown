// @ts-nocheck
/**
 * Reservation Pagination Tests
 * Tests for API pagination limits and filtering
 */

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getAllReservations } from "../../controllers/reservation/get-reservation.controller";

// Mock the Prisma client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    reservation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback()),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Get the mocked Prisma client
const prisma = new PrismaClient();

// Mock the catchAsync middleware to just execute the function
jest.mock("../../middleware/catchAsync", () => ({
  catchAsync: (fn: any) => fn,
}));

// Mock AppError
jest.mock("../../utils/service", () => ({
  AppError: {
    authorizationError: jest.fn((msg) => new Error(msg)),
    validationError: jest.fn((msg) => new Error(msg)),
  },
}));

describe("Reservation Pagination", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      query: {},
      params: {},
    };
    // Add tenantId
    (mockRequest as any).tenantId = "tenant-1";

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Default mock for count
    (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
  });

  describe("GET /api/reservations - Pagination Limits", () => {
    it("should default to limit of 10 when no limit specified", async () => {
      mockRequest.query = {};
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it("should accept custom limit", async () => {
      mockRequest.query = { limit: "50" };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it("should handle page parameter for offset", async () => {
      mockRequest.query = { page: "2", limit: "10" };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * limit 10
          take: 10,
        })
      );
    });

    it("should return empty array when no reservations exist", async () => {
      mockRequest.query = {};
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          data: expect.objectContaining({
            reservations: [],
          }),
        })
      );
    });

    it("should return reservations with pagination metadata", async () => {
      const mockReservations = [
        { id: "res-1", startDate: new Date("2026-06-10") },
        { id: "res-2", startDate: new Date("2026-06-11") },
      ];
      mockRequest.query = { limit: "10" };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue(
        mockReservations
      );
      (prisma.reservation.count as jest.Mock).mockResolvedValue(2);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          data: expect.objectContaining({
            reservations: mockReservations,
          }),
        })
      );
    });
  });

  describe("GET /api/reservations - Filtering", () => {
    it("should filter by status", async () => {
      mockRequest.query = { status: "CONFIRMED" };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "CONFIRMED",
          }),
        })
      );
    });

    it("should filter by startDate", async () => {
      mockRequest.query = { startDate: "2026-06-10" };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: expect.any(Object),
          }),
        })
      );
    });

    it("should filter by customerId", async () => {
      mockRequest.query = { customerId: "customer-1" };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: "customer-1",
          }),
        })
      );
    });

    it("should filter by resourceId", async () => {
      mockRequest.query = { resourceId: "resource-1" };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resourceId: "resource-1",
          }),
        })
      );
    });

    it("should always filter by tenantId", async () => {
      mockRequest.query = {};
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await getAllReservations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: "tenant-1",
          }),
        })
      );
    });
  });
});
