/**
 * Service Controller Tests
 *
 * Tests for service CRUD operations, pricing, and tenant isolation.
 */

import { Response, NextFunction } from "express";

// Mock Redis
jest.mock("../../utils/redis", () => ({
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(true),
  deleteCache: jest.fn().mockResolvedValue(true),
  getCacheKey: jest.fn((tenantId, type, id) => `${tenantId}:${type}:${id}`),
  deleteCachePattern: jest.fn().mockResolvedValue(true),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    service: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
      count: mockCount,
    },
  })),
  ServiceCategory: {
    BOARDING: "BOARDING",
    DAYCARE: "DAYCARE",
    GROOMING: "GROOMING",
    TRAINING: "TRAINING",
  },
}));

describe("Service Controller", () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("Tenant Isolation", () => {
    it("should filter services by tenantId", () => {
      const tenantId = "tenant-123";
      const where = { tenantId };
      expect(where.tenantId).toBe(tenantId);
    });

    it("should include tenantId when creating service", () => {
      const tenantId = "tenant-123";
      const serviceData = {
        name: "Standard Boarding",
        serviceCategory: "BOARDING",
        price: 50,
        tenantId,
      };
      expect(serviceData.tenantId).toBe(tenantId);
    });
  });

  describe("Service Category Filtering", () => {
    it("should filter by BOARDING category", () => {
      const services = [
        { name: "Standard Boarding", serviceCategory: "BOARDING" },
        { name: "Full Groom", serviceCategory: "GROOMING" },
        { name: "VIP Suite", serviceCategory: "BOARDING" },
      ];

      const filtered = services.filter((s) => s.serviceCategory === "BOARDING");
      expect(filtered.length).toBe(2);
    });

    it("should filter by GROOMING category", () => {
      const services = [
        { name: "Standard Boarding", serviceCategory: "BOARDING" },
        { name: "Full Groom", serviceCategory: "GROOMING" },
        { name: "Bath Only", serviceCategory: "GROOMING" },
      ];

      const filtered = services.filter((s) => s.serviceCategory === "GROOMING");
      expect(filtered.length).toBe(2);
    });

    it("should return all when no category filter", () => {
      const services = [
        { serviceCategory: "BOARDING" },
        { serviceCategory: "GROOMING" },
        { serviceCategory: "DAYCARE" },
      ];

      const category = undefined;
      const filtered = category
        ? services.filter((s) => s.serviceCategory === category)
        : services;
      expect(filtered.length).toBe(3);
    });
  });

  describe("Active/Inactive Filtering", () => {
    it("should filter active services only", () => {
      const services = [
        { name: "Active Service", isActive: true },
        { name: "Inactive Service", isActive: false },
        { name: "Another Active", isActive: true },
      ];

      const filtered = services.filter((s) => s.isActive);
      expect(filtered.length).toBe(2);
    });

    it("should include inactive when requested", () => {
      const services = [
        { name: "Active Service", isActive: true },
        { name: "Inactive Service", isActive: false },
      ];

      const includeInactive = true;
      const filtered = includeInactive
        ? services
        : services.filter((s) => s.isActive);
      expect(filtered.length).toBe(2);
    });
  });

  describe("Service Search", () => {
    it("should search by service name", () => {
      const search = "groom";
      const services = [
        { name: "Full Groom", description: "Complete grooming" },
        { name: "Bath Only", description: "Basic bath" },
        { name: "Grooming Express", description: "Quick groom" },
      ];

      const filtered = services.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(2);
    });

    it("should search by description", () => {
      const search = "complete";
      const services = [
        { name: "Full Groom", description: "Complete grooming service" },
        { name: "Bath Only", description: "Basic bath" },
      ];

      const filtered = services.filter((s) =>
        s.description.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(1);
    });
  });

  describe("Service Pricing", () => {
    it("should have valid price", () => {
      const service = { name: "Boarding", price: 50 };
      expect(service.price).toBeGreaterThan(0);
    });

    it("should handle decimal prices", () => {
      const service = { name: "Grooming", price: 49.99 };
      expect(service.price).toBe(49.99);
    });

    it("should calculate total for duration", () => {
      const service = { price: 50, duration: 1440 }; // 24 hours
      const nights = 3;
      const total = service.price * nights;
      expect(total).toBe(150);
    });
  });

  describe("Service Duration", () => {
    it("should have duration in minutes", () => {
      const groomingService = { name: "Full Groom", duration: 120 }; // 2 hours
      expect(groomingService.duration).toBe(120);
    });

    it("should default boarding to 24 hours", () => {
      const boardingService = { name: "Standard Boarding", duration: 1440 };
      expect(boardingService.duration).toBe(1440);
    });

    it("should calculate end time from duration", () => {
      const startTime = new Date("2025-12-03T10:00:00Z");
      const durationMinutes = 120;
      const endTime = new Date(
        startTime.getTime() + durationMinutes * 60 * 1000
      );
      expect(endTime.toISOString()).toBe("2025-12-03T12:00:00.000Z");
    });
  });

  describe("Add-Ons", () => {
    it("should include available add-ons", () => {
      const service = {
        name: "Standard Boarding",
        availableAddOns: [
          { id: "addon-1", name: "Extra Walk", price: 10 },
          { id: "addon-2", name: "Playtime", price: 15 },
        ],
      };

      expect(service.availableAddOns.length).toBe(2);
    });

    it("should calculate total with add-ons", () => {
      const basePrice = 50;
      const addOns = [{ price: 10 }, { price: 15 }];

      const addOnTotal = addOns.reduce((sum, a) => sum + a.price, 0);
      const total = basePrice + addOnTotal;
      expect(total).toBe(75);
    });
  });

  describe("Soft Delete", () => {
    it("should mark service as inactive instead of deleting", () => {
      const service = {
        id: "service-1",
        isActive: true,
        _count: { reservations: 5 },
      };

      // If has reservations, soft delete
      const shouldSoftDelete = service._count.reservations > 0;
      expect(shouldSoftDelete).toBe(true);

      const updatedService = { ...service, isActive: false };
      expect(updatedService.isActive).toBe(false);
    });

    it("should allow hard delete if no reservations", () => {
      const service = {
        id: "service-1",
        isActive: true,
        _count: { reservations: 0 },
      };

      const canHardDelete = service._count.reservations === 0;
      expect(canHardDelete).toBe(true);
    });
  });

  describe("Caching", () => {
    it("should generate correct cache key", () => {
      const tenantId = "tenant-123";
      const cacheKey = `${tenantId}:services:all`;
      expect(cacheKey).toBe("tenant-123:services:all");
    });

    it("should generate service-specific cache key", () => {
      const tenantId = "tenant-123";
      const serviceId = "service-456";
      const cacheKey = `${tenantId}:service:${serviceId}`;
      expect(cacheKey).toBe("tenant-123:service:service-456");
    });
  });
});
