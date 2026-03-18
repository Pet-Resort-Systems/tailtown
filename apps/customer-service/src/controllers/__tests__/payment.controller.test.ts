/**
 * Payment Controller Tests
 *
 * Tests for payment creation and processing.
 * Critical for checkout flow - validates payment amounts and invoice updates.
 */

import { Request, Response, NextFunction } from 'express';

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    payment: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
    },
    invoice: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  })),
}));

// Import after mocking
import {
  getCustomerPayments,
  getPaymentById,
  createPayment,
} from '../payment.controller';

describe('Payment Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getCustomerPayments', () => {
    it('should return payments for a customer', async () => {
      const customerId = 'customer-123';
      const mockPayments = [
        {
          id: 'pay-1',
          customerId,
          amount: 100,
          method: 'CREDIT_CARD',
          status: 'PAID',
          invoice: {
            id: 'inv-1',
            invoiceNumber: 'INV-001',
            status: 'PAID',
            total: 100,
          },
        },
      ];

      mockReq = { params: { customerId } };
      mockFindMany.mockResolvedValue(mockPayments);

      await getCustomerPayments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { customerId },
        include: expect.objectContaining({
          invoice: expect.any(Object),
        }),
        orderBy: { paymentDate: 'desc' },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: mockPayments,
      });
    });

    it('should return error if customerId is missing', async () => {
      mockReq = { params: {} };

      await getCustomerPayments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Customer ID is required');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('getPaymentById', () => {
    it('should return payment with invoice and customer', async () => {
      const paymentId = 'pay-123';
      const mockPayment = {
        id: paymentId,
        amount: 100,
        method: 'CREDIT_CARD',
        invoice: { id: 'inv-1' },
        customer: { id: 'cust-1', firstName: 'John', lastName: 'Doe' },
      };

      mockReq = { params: { id: paymentId } };
      mockFindUnique.mockResolvedValue(mockPayment);

      await getPaymentById(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: mockPayment,
      });
    });

    it('should return 404 if payment not found', async () => {
      mockReq = { params: { id: 'non-existent' } };
      mockFindUnique.mockResolvedValue(null);

      await getPaymentById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Payment not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('createPayment', () => {
    it('should create payment and update invoice status when fully paid', async () => {
      const invoiceId = 'inv-123';
      const customerId = 'cust-123';
      const amount = 100;

      mockReq = {
        body: {
          invoiceId,
          customerId,
          amount,
          method: 'CREDIT_CARD',
        },
      };

      // Invoice with no previous payments
      mockFindUnique.mockResolvedValue({
        id: invoiceId,
        total: 100,
        payments: [],
      });

      mockCreate.mockResolvedValue({
        id: 'pay-new',
        invoiceId,
        customerId,
        amount: 100,
        method: 'CREDIT_CARD',
        status: 'PAID',
      });

      await createPayment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoiceId,
          customerId,
          amount: 100,
          method: 'CREDIT_CARD',
          status: 'PAID',
        }),
      });

      // Should update invoice to PAID
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: { status: 'PAID' },
      });

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should reject payment exceeding remaining balance', async () => {
      const invoiceId = 'inv-123';

      mockReq = {
        body: {
          invoiceId,
          customerId: 'cust-123',
          amount: 150, // More than remaining
          method: 'CREDIT_CARD',
        },
      };

      // Invoice with $50 already paid
      mockFindUnique.mockResolvedValue({
        id: invoiceId,
        total: 100,
        payments: [{ id: 'pay-1', amount: 50, status: 'PAID' }],
      });

      await createPayment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain(
        'Payment amount exceeds remaining balance'
      );
    });

    it('should allow partial payments', async () => {
      const invoiceId = 'inv-123';

      mockReq = {
        body: {
          invoiceId,
          customerId: 'cust-123',
          amount: 50, // Partial payment
          method: 'CREDIT_CARD',
        },
      };

      mockFindUnique.mockResolvedValue({
        id: invoiceId,
        total: 100,
        payments: [],
      });

      mockCreate.mockResolvedValue({
        id: 'pay-new',
        amount: 50,
        status: 'PAID',
      });

      await createPayment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCreate).toHaveBeenCalled();
      // Should NOT update invoice to PAID (only partial)
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 404 if invoice not found', async () => {
      mockReq = {
        body: {
          invoiceId: 'non-existent',
          customerId: 'cust-123',
          amount: 100,
          method: 'CREDIT_CARD',
        },
      };

      mockFindUnique.mockResolvedValue(null);

      await createPayment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invoice not found');
      expect(error.statusCode).toBe(404);
    });

    it('should require all mandatory fields', async () => {
      mockReq = {
        body: {
          invoiceId: 'inv-123',
          // Missing customerId, amount, method
        },
      };

      await createPayment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('required');
    });
  });

  describe('Payment Amount Calculations', () => {
    it('should handle floating point precision correctly', () => {
      // Test the rounding logic used in the controller
      const total = 99.99;
      const paidAmount = 49.995; // Could happen with multiple payments
      const remainingBalance = Math.round((total - paidAmount) * 100) / 100;

      expect(remainingBalance).toBe(50); // Should round to nearest penny
    });

    it('should calculate remaining balance correctly with multiple payments', () => {
      const total = 100;
      const payments = [
        { amount: 30, status: 'PAID' },
        { amount: 20, status: 'PAID' },
        { amount: 10, status: 'REFUNDED' }, // Should not count
      ];

      const paidAmount = payments.reduce((sum, payment) => {
        if (payment.status === 'PAID') {
          return sum + payment.amount;
        }
        return sum;
      }, 0);

      expect(paidAmount).toBe(50);
      expect(total - paidAmount).toBe(50);
    });
  });
});
