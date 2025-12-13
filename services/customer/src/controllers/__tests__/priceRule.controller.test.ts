/**
 * Price Rule Controller Tests
 *
 * Critical tests to ensure pricing calculations are always correct
 */

import { Request, Response, NextFunction } from "express";

// NOTE: must be `var` so it's hoisted before jest.mock() is evaluated.
// We mutate this object in tests so the controller's PrismaClient instance
// always points at the latest mock implementation.
var prismaMock: any = {};

// Mock Prisma
jest.mock("@prisma/client", () => {
  const actual = jest.requireActual("@prisma/client");
  return {
    ...actual,
    PrismaClient: jest.fn(() => prismaMock),
  };
});

const {
  getAllPriceRules,
  getPriceRuleById,
  createPriceRule,
  updatePriceRule,
  deletePriceRule,
  calculatePrice,
} = require("../priceRule.controller");

describe("Price Rule Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockPrisma: any;

  beforeEach(() => {
    mockRequest = {
      query: {},
      params: {},
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Mock Prisma client
    mockPrisma = {
      priceRule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      service: {
        findUnique: jest.fn(),
      },
      priceRuleServiceCategory: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      priceRuleService: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    // Mutate the existing object so the controller keeps the same reference.
    Object.keys(prismaMock).forEach((key) => delete prismaMock[key]);
    Object.assign(prismaMock, mockPrisma);
  });

  describe("Price Calculation Tests", () => {
    describe("Single Rule Application", () => {
      it("should apply percentage discount correctly", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Test Discount",
          ruleType: "MULTI_DAY",
          adjustmentType: "DISCOUNT",
          discountType: "PERCENTAGE",
          discountValue: 20,
          minQuantity: 3,
          maxQuantity: null,
          isActive: true,
          priority: 10,
          serviceCategories: [],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([rule]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-04", // 3 days
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              basePrice: 150, // 50 * 3 days
              finalPrice: 120, // 150 - 20%
              discount: 30,
            }),
          })
        );
      });

      it("should apply fixed amount discount correctly", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Fixed Discount",
          ruleType: "MULTI_PET",
          adjustmentType: "DISCOUNT",
          discountType: "FIXED_AMOUNT",
          discountValue: 25,
          minQuantity: 2,
          isActive: true,
          priority: 10,
          serviceCategories: [],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([rule]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-02", // 1 day
          petCount: 2,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              basePrice: 100, // 50 * 1 day * 2 pets
              finalPrice: 75, // 100 - 25
              discount: 25,
            }),
          })
        );
      });

      it("should apply surcharge correctly", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Weekend Surcharge",
          ruleType: "DAY_OF_WEEK",
          adjustmentType: "SURCHARGE",
          discountType: "PERCENTAGE",
          discountValue: 15,
          daysOfWeek: "[5,6]", // Friday, Saturday
          isActive: true,
          priority: 10,
          serviceCategories: [],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([rule]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-10-31", // Friday
          endDate: "2025-11-01", // 1 day
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              basePrice: 50,
              finalPrice: 57.5, // 50 + 15%
              discount: -7.5, // Negative discount = surcharge
            }),
          })
        );
      });
    });

    describe("Multiple Rule Application", () => {
      it("should apply multiple rules correctly (one per type)", async () => {
        const service = {
          id: "service-1",
          price: 100,
          serviceCategory: "BOARDING",
        };

        const rules = [
          {
            id: "rule-1",
            name: "Multi-Day Discount",
            ruleType: "MULTI_DAY",
            adjustmentType: "DISCOUNT",
            discountType: "PERCENTAGE",
            discountValue: 10,
            minQuantity: 5,
            isActive: true,
            priority: 20,
            serviceCategories: [],
            services: [],
          },
          {
            id: "rule-2",
            name: "Multi-Pet Discount",
            ruleType: "MULTI_PET",
            adjustmentType: "DISCOUNT",
            discountType: "FIXED_AMOUNT",
            discountValue: 50,
            minQuantity: 2,
            isActive: true,
            priority: 15,
            serviceCategories: [],
            services: [],
          },
        ];

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue(rules);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-06", // 5 days
          petCount: 2,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              basePrice: 1000, // 100 * 5 days * 2 pets
              finalPrice: 850, // 1000 - 10% (100) - $50
              discount: 150,
              appliedRules: expect.arrayContaining([
                expect.objectContaining({ ruleName: "Multi-Day Discount" }),
                expect.objectContaining({ ruleName: "Multi-Pet Discount" }),
              ]),
            }),
          })
        );
      });

      it("should not stack rules of the same type", async () => {
        const service = {
          id: "service-1",
          price: 100,
          serviceCategory: "BOARDING",
        };

        const rules = [
          {
            id: "rule-1",
            name: "Multi-Day 10%",
            ruleType: "MULTI_DAY",
            adjustmentType: "DISCOUNT",
            discountType: "PERCENTAGE",
            discountValue: 10,
            minQuantity: 3,
            isActive: true,
            priority: 20, // Higher priority
            serviceCategories: [],
            services: [],
          },
          {
            id: "rule-2",
            name: "Multi-Day 15%",
            ruleType: "MULTI_DAY",
            adjustmentType: "DISCOUNT",
            discountType: "PERCENTAGE",
            discountValue: 15,
            minQuantity: 5,
            isActive: true,
            priority: 10, // Lower priority
            serviceCategories: [],
            services: [],
          },
        ];

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue(rules);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-06", // 5 days (matches both rules)
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        const response = (mockResponse.json as jest.Mock).mock.calls[0][0];

        // Should only apply one rule (the higher priority one)
        expect(response.data.appliedRules).toHaveLength(1);
        expect(response.data.appliedRules[0].ruleName).toBe("Multi-Day 10%");
        expect(response.data.finalPrice).toBe(450); // 500 - 10%, not both discounts
      });
    });

    describe("Edge Cases", () => {
      it("should not allow negative final price", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Huge Discount",
          ruleType: "PROMOTIONAL",
          adjustmentType: "DISCOUNT",
          discountType: "FIXED_AMOUNT",
          discountValue: 200, // More than base price
          isActive: true,
          priority: 10,
          serviceCategories: [],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([rule]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-02",
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              finalPrice: 0, // Should be 0, not negative
            }),
          })
        );
      });

      it("should handle zero-day duration", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-01", // Same day
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              basePrice: 50, // Should still charge for 1 day minimum
              durationInDays: 1,
            }),
          })
        );
      });

      it("should handle zero pets", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-02",
          petCount: 0,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              basePrice: 0,
              finalPrice: 0,
            }),
          })
        );
      });
    });

    describe("Rule Conditions", () => {
      it("should not apply rule if minQuantity not met", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Multi-Day Discount",
          ruleType: "MULTI_DAY",
          adjustmentType: "DISCOUNT",
          discountType: "PERCENTAGE",
          discountValue: 20,
          minQuantity: 7, // Requires 7+ days
          isActive: true,
          priority: 10,
          serviceCategories: [],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([rule]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-04", // Only 3 days
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              basePrice: 150,
              finalPrice: 150, // No discount applied
              discount: 0,
              appliedRules: [],
            }),
          })
        );
      });

      it("should not apply rule if maxQuantity exceeded", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Short Stay Discount",
          ruleType: "MULTI_DAY",
          adjustmentType: "DISCOUNT",
          discountType: "PERCENTAGE",
          discountValue: 10,
          minQuantity: 1,
          maxQuantity: 3, // Only for 1-3 days
          isActive: true,
          priority: 10,
          serviceCategories: [],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([rule]);

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-06", // 5 days (exceeds max)
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              finalPrice: 250, // No discount
              appliedRules: [],
            }),
          })
        );
      });

      it("should not apply inactive rules", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Inactive Discount",
          ruleType: "MULTI_DAY",
          adjustmentType: "DISCOUNT",
          discountType: "PERCENTAGE",
          discountValue: 50,
          minQuantity: 1,
          isActive: false, // Inactive
          priority: 10,
          serviceCategories: [],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([]); // Should not return inactive rules

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-04",
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              finalPrice: 150, // No discount
              appliedRules: [],
            }),
          })
        );
      });
    });

    describe("Service Category Filtering", () => {
      it("should apply rule only to matching service category", async () => {
        const service = {
          id: "service-1",
          price: 50,
          serviceCategory: "BOARDING",
        };

        const rule = {
          id: "rule-1",
          name: "Grooming Discount",
          ruleType: "PROMOTIONAL",
          adjustmentType: "DISCOUNT",
          discountType: "PERCENTAGE",
          discountValue: 20,
          isActive: true,
          priority: 10,
          serviceCategories: [
            { serviceCategory: "GROOMING" }, // Only for grooming
          ],
          services: [],
        };

        mockPrisma.service.findUnique.mockResolvedValue(service);
        mockPrisma.priceRule.findMany.mockResolvedValue([]); // Should not match

        mockRequest.body = {
          serviceId: "service-1",
          startDate: "2025-11-01",
          endDate: "2025-11-02",
          petCount: 1,
        };

        await calculatePrice(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              finalPrice: 50, // No discount
              appliedRules: [],
            }),
          })
        );
      });
    });
  });

  describe("Validation Tests", () => {
    it("should require name when creating rule", async () => {
      mockRequest.body = {
        ruleType: "MULTI_DAY",
        discountType: "PERCENTAGE",
        discountValue: 10,
      };

      await createPriceRule(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Missing required fields",
        })
      );
    });

    it("should validate percentage discount range", async () => {
      mockRequest.body = {
        name: "Test",
        ruleType: "MULTI_DAY",
        discountType: "PERCENTAGE",
        discountValue: 150, // Invalid: > 100%
      };

      await createPriceRule(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Percentage discount must be between 0 and 100",
        })
      );
    });

    it("should require daysOfWeek for DAY_OF_WEEK rule", async () => {
      mockRequest.body = {
        name: "Weekend Rule",
        ruleType: "DAY_OF_WEEK",
        discountType: "PERCENTAGE",
        discountValue: 10,
        // Missing daysOfWeek
      };

      await createPriceRule(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Days of week are required for DAY_OF_WEEK rule type",
        })
      );
    });
  });
});
