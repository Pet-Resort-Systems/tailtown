/**
 * Reports Controller Tests
 *
 * Tests reporting accuracy, financial calculations, date filtering,
 * and export functionality
 */

import { Request, Response, NextFunction } from "express";
import {
  getDailySales,
  getMonthlySales,
  getTopCustomersReport,
  getTaxBreakdownReport,
} from "../reports";
import {
  getSalesByService,
  getCustomerReport,
} from "../analytics-fixed.controller";

// Mock Prisma
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    reservation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
  })),
}));

describe("Reports Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {
        "x-tenant-id": "test-tenant",
      },
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    mockNext = jest.fn();

    const { PrismaClient } = require("@prisma/client");
    mockPrisma = new PrismaClient();
  });

  describe("getDailySales", () => {
    it("should calculate daily sales correctly", async () => {
      mockRequest.query = {
        startDate: "2025-10-25",
        endDate: "2025-10-25",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-1",
          totalAmount: 100.0,
          createdAt: new Date("2025-10-25T10:00:00"),
          service: { name: "Boarding" },
        },
        {
          id: "inv-2",
          totalAmount: 150.0,
          createdAt: new Date("2025-10-25T14:00:00"),
          service: { name: "Daycare" },
        },
      ]);

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          data: expect.objectContaining({
            totalSales: 250.0,
            transactionCount: 2,
          }),
        })
      );
    });

    it("should filter by date range correctly", async () => {
      mockRequest.query = {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
      };

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it("should group by service type", async () => {
      mockRequest.query = {
        startDate: "2025-10-25",
        endDate: "2025-10-25",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-1",
          totalAmount: 100.0,
          service: { name: "Boarding", serviceCategory: "BOARDING" },
        },
        {
          id: "inv-2",
          totalAmount: 150.0,
          service: { name: "Boarding", serviceCategory: "BOARDING" },
        },
        {
          id: "inv-3",
          totalAmount: 75.0,
          service: { name: "Daycare", serviceCategory: "DAYCARE" },
        },
      ]);

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            byService: expect.arrayContaining([
              expect.objectContaining({
                category: "BOARDING",
                total: 250.0,
              }),
              expect.objectContaining({
                category: "DAYCARE",
                total: 75.0,
              }),
            ]),
          }),
        })
      );
    });

    it("should handle empty results", async () => {
      mockRequest.query = {
        startDate: "2025-10-25",
        endDate: "2025-10-25",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalSales: 0,
            transactionCount: 0,
          }),
        })
      );
    });
  });

  describe("getMonthlySales", () => {
    it("should calculate monthly revenue accurately", async () => {
      mockRequest.query = {
        year: "2025",
        month: "10",
      };

      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: "pay-1",
          amount: 200.0,
          status: "COMPLETED",
          createdAt: new Date("2025-10-15"),
        },
        {
          id: "pay-2",
          amount: 300.0,
          status: "COMPLETED",
          createdAt: new Date("2025-10-20"),
        },
      ]);

      await getMonthlySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalRevenue: 500.0,
          }),
        })
      );
    });

    it("should include all payment types", async () => {
      mockRequest.query = {
        year: "2025",
        month: "10",
      };

      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: "pay-1",
          amount: 200.0,
          paymentMethod: "CREDIT_CARD",
          status: "COMPLETED",
        },
        {
          id: "pay-2",
          amount: 100.0,
          paymentMethod: "CASH",
          status: "COMPLETED",
        },
        {
          id: "pay-3",
          amount: 150.0,
          paymentMethod: "CHECK",
          status: "COMPLETED",
        },
      ]);

      await getMonthlySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            byPaymentMethod: expect.objectContaining({
              CREDIT_CARD: 200.0,
              CASH: 100.0,
              CHECK: 150.0,
            }),
          }),
        })
      );
    });

    it("should handle refunds correctly", async () => {
      mockRequest.query = {
        year: "2025",
        month: "10",
      };

      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: "pay-1",
          amount: 200.0,
          status: "COMPLETED",
        },
        {
          id: "pay-2",
          amount: -50.0,
          status: "REFUNDED",
        },
      ]);

      await getMonthlySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalRevenue: 150.0,
            refunds: 50.0,
          }),
        })
      );
    });

    it("should exclude pending payments", async () => {
      mockRequest.query = {
        year: "2025",
        month: "10",
      };

      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: "pay-1",
          amount: 200.0,
          status: "COMPLETED",
        },
        {
          id: "pay-2",
          amount: 100.0,
          status: "PENDING",
        },
      ]);

      await getMonthlySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should only count completed payments
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalRevenue: 200.0,
          }),
        })
      );
    });
  });

  describe("getSalesByService", () => {
    it("should calculate revenue by service type", async () => {
      mockRequest.query = {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-1",
          totalAmount: 300.0,
          service: {
            id: "svc-1",
            name: "Overnight Boarding",
            serviceCategory: "BOARDING",
          },
        },
        {
          id: "inv-2",
          totalAmount: 200.0,
          service: {
            id: "svc-1",
            name: "Overnight Boarding",
            serviceCategory: "BOARDING",
          },
        },
        {
          id: "inv-3",
          totalAmount: 150.0,
          service: {
            id: "svc-2",
            name: "Full Grooming",
            serviceCategory: "GROOMING",
          },
        },
      ]);

      await getSalesByService(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              serviceCategory: "BOARDING",
              totalRevenue: 500.0,
              transactionCount: 2,
            }),
            expect.objectContaining({
              serviceCategory: "GROOMING",
              totalRevenue: 150.0,
              transactionCount: 1,
            }),
          ]),
        })
      );
    });

    it("should sort by revenue descending", async () => {
      mockRequest.query = {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          totalAmount: 100.0,
          service: { serviceCategory: "DAYCARE" },
        },
        {
          totalAmount: 500.0,
          service: { serviceCategory: "BOARDING" },
        },
        {
          totalAmount: 200.0,
          service: { serviceCategory: "GROOMING" },
        },
      ]);

      await getSalesByService(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0]
        .data;
      expect(responseData[0].totalRevenue).toBeGreaterThanOrEqual(
        responseData[1].totalRevenue
      );
    });
  });

  describe("getCustomerReport", () => {
    it("should calculate customer lifetime value", async () => {
      mockRequest.query = {};

      mockPrisma.customer.findMany.mockResolvedValue([
        {
          id: "cust-1",
          firstName: "John",
          lastName: "Doe",
          invoices: [{ totalAmount: 200.0 }, { totalAmount: 150.0 }],
        },
        {
          id: "cust-2",
          firstName: "Jane",
          lastName: "Smith",
          invoices: [{ totalAmount: 300.0 }],
        },
      ]);

      await getCustomerReport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              customerId: "cust-1",
              totalSpent: 350.0,
              transactionCount: 2,
            }),
            expect.objectContaining({
              customerId: "cust-2",
              totalSpent: 300.0,
              transactionCount: 1,
            }),
          ]),
        })
      );
    });

    it("should track retention rate", async () => {
      mockRequest.query = {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };

      mockPrisma.customer.findMany.mockResolvedValue([
        {
          id: "cust-1",
          createdAt: new Date("2024-01-01"),
          reservations: [{ startDate: new Date("2025-06-01") }],
        },
        {
          id: "cust-2",
          createdAt: new Date("2024-01-01"),
          reservations: [],
        },
      ]);

      await getCustomerReport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retentionRate: 50.0, // 1 out of 2 returned
          }),
        })
      );
    });
  });

  describe("getTaxBreakdownReport", () => {
    it("should calculate monthly tax totals", async () => {
      mockRequest.query = {
        year: "2025",
        month: "10",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-1",
          subtotal: 100.0,
          taxAmount: 8.0,
          totalAmount: 108.0,
        },
        {
          id: "inv-2",
          subtotal: 200.0,
          taxAmount: 16.0,
          totalAmount: 216.0,
        },
      ]);

      await getTaxBreakdownReport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalTaxCollected: 24.0,
            totalSales: 300.0,
            totalWithTax: 324.0,
          }),
        })
      );
    });

    it("should separate taxable vs non-taxable", async () => {
      mockRequest.query = {
        year: "2025",
        month: "10",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-1",
          subtotal: 100.0,
          taxAmount: 8.0,
          isTaxable: true,
        },
        {
          id: "inv-2",
          subtotal: 50.0,
          taxAmount: 0,
          isTaxable: false,
        },
      ]);

      await getTaxBreakdownReport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxableSales: 100.0,
            nonTaxableSales: 50.0,
          }),
        })
      );
    });

    it("should calculate average tax rate", async () => {
      mockRequest.query = {
        year: "2025",
        month: "10",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          subtotal: 100.0,
          taxAmount: 8.0,
        },
        {
          subtotal: 200.0,
          taxAmount: 16.0,
        },
      ]);

      await getTaxBreakdownReport(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            averageTaxRate: 8.0, // (24 / 300) * 100
          }),
        })
      );
    });
  });

  describe("Export Functionality", () => {
    it("should generate valid CSV format", async () => {
      mockRequest.query = {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
        format: "csv",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-1",
          invoiceNumber: "INV-001",
          totalAmount: 100.0,
          createdAt: new Date("2025-10-15"),
          customer: { firstName: "John", lastName: "Doe" },
        },
      ]);

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment")
      );
    });

    it("should generate valid PDF format", async () => {
      mockRequest.query = {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
        format: "pdf",
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-1",
          totalAmount: 100.0,
        },
      ]);

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid date ranges", async () => {
      mockRequest.query = {
        startDate: "2025-10-31",
        endDate: "2025-10-01",
      };

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid date range"),
        })
      );
    });

    it("should handle database errors gracefully", async () => {
      mockRequest.query = {
        startDate: "2025-10-01",
        endDate: "2025-10-31",
      };

      mockPrisma.invoice.findMany.mockRejectedValue(
        new Error("Database connection failed")
      );

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should require date parameters", async () => {
      mockRequest.query = {};

      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("required"),
        })
      );
    });
  });

  describe("Performance", () => {
    it("should handle large datasets efficiently", async () => {
      mockRequest.query = {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };

      // Mock 1000 invoices
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `inv-${i}`,
        totalAmount: 100.0,
        createdAt: new Date("2025-06-15"),
      }));

      mockPrisma.invoice.findMany.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      await getDailySales(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      const endTime = Date.now();

      // Should complete in reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
