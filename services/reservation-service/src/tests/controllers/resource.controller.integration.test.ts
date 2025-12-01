// @ts-nocheck
/**
 * Integration tests for resource.controller.ts
 *
 * Tests the resource CRUD operations with mocked Prisma.
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClient, ResourceType } from "@prisma/client";

// Mock the Prisma client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    resource: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback()),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    ResourceType: {
      JUNIOR_KENNEL: "JUNIOR_KENNEL",
      STANDARD_KENNEL: "STANDARD_KENNEL",
      LARGE_KENNEL: "LARGE_KENNEL",
      SUITE: "SUITE",
      STANDARD_SUITE: "STANDARD_SUITE",
      STANDARD_PLUS_SUITE: "STANDARD_PLUS_SUITE",
      VIP_SUITE: "VIP_SUITE",
    },
  };
});

// Get the mocked Prisma client
const prisma = new PrismaClient();

// Mock the catchAsync middleware
jest.mock("../../middleware/errorHandler", () => ({
  catchAsync: (fn: any) => fn,
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock AppError
class MockAppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
  static validationError(msg: string) {
    return new MockAppError(msg, 400);
  }
  static notFoundError(msg: string) {
    return new MockAppError(msg, 404);
  }
  static authorizationError(msg: string) {
    return new MockAppError(msg, 403);
  }
}

jest.mock("../../utils/appError", () => ({
  AppError: MockAppError,
}));

// Mock prisma-helpers
jest.mock("../../controllers/reservation/utils/prisma-helpers", () => ({
  prisma: prisma,
  safeExecutePrismaQuery: jest.fn().mockImplementation(async (fn, fallback) => {
    try {
      return await fn();
    } catch (error) {
      return fallback;
    }
  }),
}));

// Import after mocks
import {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} from "../../controllers/resource/resource.controller";

describe("Resource Controller - Integration", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: {},
      body: {},
      query: {},
      headers: { "x-tenant-id": "tenant-1" },
    };
    (mockRequest as any).tenantId = "tenant-1";

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("getAllResources", () => {
    it("should return all resources for tenant", async () => {
      const mockResources = [
        {
          id: "resource-1",
          name: "Kennel 1",
          type: "JUNIOR_KENNEL",
          tenantId: "tenant-1",
          capacity: 1,
          isActive: true,
        },
        {
          id: "resource-2",
          name: "Kennel 2",
          type: "STANDARD_KENNEL",
          tenantId: "tenant-1",
          capacity: 1,
          isActive: true,
        },
      ];

      (prisma.resource.count as jest.Mock).mockResolvedValue(2);
      (prisma.resource.findMany as jest.Mock).mockResolvedValue(mockResources);

      await getAllResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          results: 2,
        })
      );
    });

    it("should filter by resource type", async () => {
      mockRequest.query = { type: "JUNIOR_KENNEL" };

      const mockResources = [
        {
          id: "resource-1",
          name: "Kennel 1",
          type: "JUNIOR_KENNEL",
          tenantId: "tenant-1",
        },
      ];

      (prisma.resource.count as jest.Mock).mockResolvedValue(1);
      (prisma.resource.findMany as jest.Mock).mockResolvedValue(mockResources);

      await getAllResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "JUNIOR_KENNEL",
          }),
        })
      );
    });

    it("should handle pagination", async () => {
      mockRequest.query = { page: "2", limit: "10" };

      (prisma.resource.count as jest.Mock).mockResolvedValue(25);
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);

      await getAllResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it("should search by name", async () => {
      mockRequest.query = { search: "VIP" };

      (prisma.resource.count as jest.Mock).mockResolvedValue(1);
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);

      await getAllResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: "VIP",
            }),
          }),
        })
      );
    });

    it("should require tenant ID", async () => {
      (mockRequest as any).tenantId = undefined;
      process.env.NODE_ENV = "production";

      await expect(
        getAllResources(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow("Tenant ID is required");

      process.env.NODE_ENV = "test";
    });
  });

  describe("getResourceById", () => {
    it("should return a resource when found", async () => {
      mockRequest.params = { id: "resource-1" };

      const mockResource = {
        id: "resource-1",
        name: "Kennel 1",
        type: "JUNIOR_KENNEL",
        tenantId: "tenant-1",
        capacity: 1,
        isActive: true,
      };

      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(mockResource);

      await getResourceById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "resource-1",
            tenantId: "tenant-1",
          }),
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
        })
      );
    });

    it("should return 404 when resource not found", async () => {
      mockRequest.params = { id: "non-existent" };

      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        getResourceById(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow();
    });
  });

  describe("createResource", () => {
    it("should create a new resource", async () => {
      mockRequest.body = {
        name: "New Kennel",
        type: "JUNIOR_KENNEL",
        capacity: 1,
        location: "Building A",
      };

      const mockCreatedResource = {
        id: "resource-new",
        name: "New Kennel",
        type: "JUNIOR_KENNEL",
        tenantId: "tenant-1",
        capacity: 1,
        location: "Building A",
        isActive: true,
      };

      (prisma.resource.create as jest.Mock).mockResolvedValue(
        mockCreatedResource
      );

      await createResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Kennel",
            type: "JUNIOR_KENNEL",
            tenantId: "tenant-1",
          }),
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should require name field", async () => {
      mockRequest.body = {
        type: "JUNIOR_KENNEL",
      };

      await expect(
        createResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow("Name is required");
    });

    it("should require type field", async () => {
      mockRequest.body = {
        name: "New Kennel",
      };

      await expect(
        createResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow("Type is required");
    });
  });

  describe("updateResource", () => {
    it("should update an existing resource", async () => {
      mockRequest.params = { id: "resource-1" };
      mockRequest.body = {
        name: "Updated Kennel",
        capacity: 2,
      };

      const mockExistingResource = {
        id: "resource-1",
        name: "Kennel 1",
        type: "JUNIOR_KENNEL",
        tenantId: "tenant-1",
      };

      const mockUpdatedResource = {
        ...mockExistingResource,
        name: "Updated Kennel",
        capacity: 2,
      };

      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(
        mockExistingResource
      );
      (prisma.resource.update as jest.Mock).mockResolvedValue(
        mockUpdatedResource
      );

      await updateResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "resource-1" },
          data: expect.objectContaining({
            name: "Updated Kennel",
            capacity: 2,
          }),
        })
      );
    });

    it("should return 404 when resource to update not found", async () => {
      mockRequest.params = { id: "non-existent" };
      mockRequest.body = { name: "Updated" };

      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        updateResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteResource", () => {
    it("should delete a resource", async () => {
      mockRequest.params = { id: "resource-1" };

      const mockResource = {
        id: "resource-1",
        name: "Kennel 1",
        type: "JUNIOR_KENNEL",
        tenantId: "tenant-1",
      };

      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(mockResource);
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      // deleteMany returns count
      (prisma.resource.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await deleteResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.deleteMany).toHaveBeenCalled();
    });

    it("should return 404 when resource to delete not found", async () => {
      mockRequest.params = { id: "non-existent" };

      (prisma.resource.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        deleteResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow();
    });
  });

  describe("Tenant Isolation", () => {
    it("should scope all queries to tenant", async () => {
      (mockRequest as any).tenantId = "specific-tenant";

      (prisma.resource.count as jest.Mock).mockResolvedValue(0);
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);

      await getAllResources(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: "specific-tenant",
          }),
        })
      );
    });
  });
});
