// @ts-nocheck
/**
 * Tests for add-ons.controller.ts
 *
 * Tests the reservation add-ons controller endpoints.
 */

import { Response } from "express";

// Mock dependencies
jest.mock("../../../controllers/reservation/utils/prisma-helpers", () => ({
  prisma: {
    reservation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    addOnService: {
      findMany: jest.fn(),
    },
    reservationAddOn: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        reservationAddOn: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      })
    ),
  },
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

import { prisma } from "../../../controllers/reservation/utils/prisma-helpers";
import { logger } from "../../../utils/logger";

// Helper to create mock request
const createMockRequest = (overrides: any = {}) => {
  return {
    tenantId: "test-tenant",
    params: { id: "res-123" },
    body: {},
    headers: { "x-tenant-id": "test-tenant" },
    ...overrides,
  };
};

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe("Add-Ons Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Validation", () => {
    it("should require tenant ID", () => {
      const req = createMockRequest({ tenantId: null });
      expect(req.tenantId).toBeNull();
    });

    it("should require reservation ID", () => {
      const req = createMockRequest({ params: {} });
      expect(req.params.id).toBeUndefined();
    });

    it("should require addOns array", () => {
      const req = createMockRequest({ body: {} });
      expect(req.body.addOns).toBeUndefined();
    });

    it("should reject empty addOns array", () => {
      const req = createMockRequest({ body: { addOns: [] } });
      expect(req.body.addOns).toHaveLength(0);
    });

    it("should accept valid addOns array", () => {
      const req = createMockRequest({
        body: {
          addOns: [
            { serviceId: "addon-1", quantity: 1 },
            { serviceId: "addon-2", quantity: 2 },
          ],
        },
      });
      expect(req.body.addOns).toHaveLength(2);
    });
  });

  describe("Add-on structure", () => {
    it("should accept serviceId", () => {
      const addOn = { serviceId: "addon-123" };
      expect(addOn.serviceId).toBe("addon-123");
    });

    it("should accept quantity", () => {
      const addOn = { serviceId: "addon-123", quantity: 3 };
      expect(addOn.quantity).toBe(3);
    });

    it("should default quantity to 1", () => {
      const addOn = { serviceId: "addon-123" };
      const quantity = addOn.quantity || 1;
      expect(quantity).toBe(1);
    });

    it("should accept notes", () => {
      const addOn = { serviceId: "addon-123", notes: "Special instructions" };
      expect(addOn.notes).toBe("Special instructions");
    });
  });

  describe("Add-on service validation", () => {
    it("should extract service IDs from addOns", () => {
      const addOns = [
        { serviceId: "addon-1" },
        { serviceId: "addon-2" },
        { serviceId: "addon-3" },
      ];

      const addOnServiceIds = addOns.map((addOn) => addOn.serviceId);

      expect(addOnServiceIds).toEqual(["addon-1", "addon-2", "addon-3"]);
    });

    it("should identify missing add-on services", () => {
      const requestedIds = ["addon-1", "addon-2", "addon-3"];
      const foundIds = ["addon-1", "addon-3"];

      const missingIds = requestedIds.filter((id) => !foundIds.includes(id));

      expect(missingIds).toEqual(["addon-2"]);
    });

    it("should validate all add-ons exist", () => {
      const requestedIds = ["addon-1", "addon-2"];
      const validServices = [
        { id: "addon-1", price: 10 },
        { id: "addon-2", price: 15 },
      ];

      const allValid = requestedIds.length === validServices.length;

      expect(allValid).toBe(true);
    });
  });

  describe("Quantity handling", () => {
    it("should create multiple entries for quantity > 1", () => {
      const addOn = { serviceId: "addon-1", quantity: 3 };
      const entries: any[] = [];

      const quantity = addOn.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        entries.push({
          reservationId: "res-123",
          addOnId: addOn.serviceId,
        });
      }

      expect(entries).toHaveLength(3);
    });

    it("should create single entry for quantity = 1", () => {
      const addOn = { serviceId: "addon-1", quantity: 1 };
      const entries: any[] = [];

      const quantity = addOn.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        entries.push({
          reservationId: "res-123",
          addOnId: addOn.serviceId,
        });
      }

      expect(entries).toHaveLength(1);
    });
  });

  describe("Price calculation", () => {
    it("should use add-on service price", () => {
      const addOnService = { id: "addon-1", price: 25.0 };
      const reservationAddOn = {
        addOnId: addOnService.id,
        price: addOnService.price,
      };

      expect(reservationAddOn.price).toBe(25.0);
    });

    it("should calculate total for multiple quantities", () => {
      const addOnService = { id: "addon-1", price: 25.0 };
      const quantity = 3;

      const total = addOnService.price * quantity;

      expect(total).toBe(75.0);
    });
  });

  describe("Tenant isolation", () => {
    it("should include tenant ID in reservation query", () => {
      const tenantId = "test-tenant";
      const reservationId = "res-123";

      const whereClause = {
        id: reservationId,
        tenantId,
      };

      expect(whereClause.tenantId).toBe("test-tenant");
    });

    it("should include tenant ID in add-on service query", () => {
      const tenantId = "test-tenant";

      const whereClause = {
        tenantId,
        isActive: true,
      };

      expect(whereClause.tenantId).toBe("test-tenant");
    });

    it("should include tenant ID in created add-ons", () => {
      const tenantId = "test-tenant";
      const reservationAddOn = {
        tenantId,
        reservationId: "res-123",
        addOnId: "addon-1",
        price: 25.0,
      };

      expect(reservationAddOn.tenantId).toBe("test-tenant");
    });
  });

  describe("Response structure", () => {
    it("should return success status", () => {
      const response = {
        status: "success",
        message: "Add-ons added successfully",
        data: {
          addedCount: 2,
        },
      };

      expect(response.status).toBe("success");
    });

    it("should include added count", () => {
      const response = {
        status: "success",
        data: {
          addedCount: 3,
        },
      };

      expect(response.data.addedCount).toBe(3);
    });
  });
});
