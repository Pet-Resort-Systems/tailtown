/**
 * Payment Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 * These tests exercise the full code path to increase coverage.
 */

import { Request, Response, NextFunction } from "express";
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from "../../test/setup-test-db";
import {
  getCustomerPayments,
  getPaymentById,
  createPayment,
} from "../payment.controller";
import { InvoiceStatus } from "@prisma/client";

describe("Payment Controller Integration Tests", () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerId: string;
  let testInvoiceId: string;
  let testPaymentIds: string[] = [];

  // Mock response
  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    // Create test tenant
    testTenantId = await createTestTenant(`payment-test-${Date.now()}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: "Payment",
        lastName: "Test",
        email: `payment-test-${Date.now()}@example.com`,
        phone: "555-0100",
      },
    });
    testCustomerId = customer.id;

    // Create test invoice
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: testTenantId,
        invoiceNumber: `INV-PAY-${Date.now()}`,
        customerId: testCustomerId,
        subtotal: 100,
        total: 100,
        status: InvoiceStatus.SENT,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    testInvoiceId = invoice.id;
  });

  afterAll(async () => {
    // Clean up test data
    for (const paymentId of testPaymentIds) {
      await prisma.payment.delete({ where: { id: paymentId } }).catch(() => {});
    }
    await prisma.invoice
      .delete({ where: { id: testInvoiceId } })
      .catch(() => {});
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCustomerPayments", () => {
    it("should return payments for a valid customer", async () => {
      const req = {
        params: { customerId: testCustomerId },
      } as unknown as Request;
      const res = createMockResponse();

      await getCustomerPayments(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          results: expect.any(Number),
          data: expect.any(Array),
        })
      );
    });

    it("should call next with error for missing customerId", async () => {
      const req = {
        params: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getCustomerPayments(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe("Customer ID is required");
    });
  });

  describe("getPaymentById", () => {
    let createdPaymentId: string;

    beforeAll(async () => {
      // Create a test payment
      const payment = await prisma.payment.create({
        data: {
          invoiceId: testInvoiceId,
          customerId: testCustomerId,
          amount: 50,
          method: "CREDIT_CARD",
          status: "PAID",
        },
      });
      createdPaymentId = payment.id;
      testPaymentIds.push(createdPaymentId);
    });

    it("should return payment by ID", async () => {
      const req = {
        params: { id: createdPaymentId },
      } as unknown as Request;
      const res = createMockResponse();

      await getPaymentById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          data: expect.objectContaining({
            id: createdPaymentId,
            amount: 50,
          }),
        })
      );
    });

    it("should call next with 404 for non-existent payment", async () => {
      const req = {
        params: { id: "00000000-0000-0000-0000-000000000000" },
      } as unknown as Request;
      const res = createMockResponse();

      await getPaymentById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe("Payment not found");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("createPayment", () => {
    it("should create a payment successfully", async () => {
      // Create a fresh invoice for this test
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          invoiceNumber: `INV-CREATE-${Date.now()}`,
          customerId: testCustomerId,
          subtotal: 100,
          total: 100,
          status: InvoiceStatus.SENT,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const req = {
        body: {
          invoiceId: invoice.id,
          customerId: testCustomerId,
          amount: 100,
          method: "CREDIT_CARD",
        },
      } as unknown as Request;
      const res = createMockResponse();

      await createPayment(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          data: expect.objectContaining({
            amount: 100,
            method: "CREDIT_CARD",
            status: "PAID",
          }),
        })
      );

      // Track for cleanup
      const createdPayment = (res.json as jest.Mock).mock.calls[0][0].data;
      testPaymentIds.push(createdPayment.id);

      // Verify invoice was marked as PAID
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.status).toBe("PAID");

      // Clean up
      await prisma.invoice
        .delete({ where: { id: invoice.id } })
        .catch(() => {});
    });

    it("should reject payment exceeding invoice balance", async () => {
      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          invoiceNumber: `INV-EXCEED-${Date.now()}`,
          customerId: testCustomerId,
          subtotal: 100,
          total: 100,
          status: InvoiceStatus.SENT,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Create partial payment
      const partialPayment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          customerId: testCustomerId,
          amount: 80,
          method: "CREDIT_CARD",
          status: "PAID",
        },
      });
      testPaymentIds.push(partialPayment.id);

      const req = {
        body: {
          invoiceId: invoice.id,
          customerId: testCustomerId,
          amount: 50, // Exceeds remaining $20
          method: "CREDIT_CARD",
        },
      } as unknown as Request;
      const res = createMockResponse();

      await createPayment(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain("exceeds");

      // Clean up
      await prisma.invoice
        .delete({ where: { id: invoice.id } })
        .catch(() => {});
    });

    it("should reject payment for non-existent invoice", async () => {
      const req = {
        body: {
          invoiceId: "00000000-0000-0000-0000-000000000000",
          customerId: testCustomerId,
          amount: 100,
          method: "CREDIT_CARD",
        },
      } as unknown as Request;
      const res = createMockResponse();

      await createPayment(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe("Invoice not found");
    });

    it("should reject payment with missing required fields", async () => {
      const req = {
        body: {
          invoiceId: testInvoiceId,
          // Missing customerId, amount, method
        },
      } as unknown as Request;
      const res = createMockResponse();

      await createPayment(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain("required");
    });
  });
});
