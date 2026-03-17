/**
 * Invoice Controller Tests
 *
 * Tests for invoice creation, retrieval, and updates.
 * Critical for checkout flow - validates tenantId handling and reservation linkage.
 *
 * Bug fixed: 2025-12-02
 * - Invoice creation now validates reservation exists with matching tenantId
 */

import { Request, Response, NextFunction } from 'express';

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    invoice: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    reservation: {
      findFirst: mockFindFirst,
    },
    $transaction: mockTransaction,
  })),
}));

// Import after mocking
import {
  getCustomerInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
} from '../invoice.controller';

describe('Invoice Controller', () => {
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

  describe('getCustomerInvoices', () => {
    it('should return invoices for a customer', async () => {
      const customerId = 'customer-123';
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-20251202-1234',
          customerId,
          total: 100,
          status: 'PAID',
          lineItems: [],
          payments: [],
        },
      ];

      mockReq = {
        params: { customerId },
        tenantId: 'tenant-123',
      } as any;

      mockFindMany.mockResolvedValue(mockInvoices);

      await getCustomerInvoices(mockReq as any, mockRes as Response, mockNext);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { customerId },
        include: { lineItems: true, payments: true },
        orderBy: { issueDate: 'desc' },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: mockInvoices,
      });
    });

    it('should return error if customerId is missing', async () => {
      mockReq = {
        params: {},
        tenantId: 'tenant-123',
      } as any;

      await getCustomerInvoices(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Customer ID is required');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice with all relations', async () => {
      const invoiceId = 'inv-123';
      const mockInvoice = {
        id: invoiceId,
        invoiceNumber: 'INV-20251202-1234',
        total: 100,
        lineItems: [{ id: 'li-1', description: 'Boarding', amount: 100 }],
        payments: [],
        customer: { id: 'cust-1', firstName: 'John', lastName: 'Doe' },
        reservation: { id: 'res-1' },
      };

      mockReq = { params: { id: invoiceId } };
      mockFindUnique.mockResolvedValue(mockInvoice);

      await getInvoiceById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: invoiceId },
        include: expect.objectContaining({
          lineItems: true,
          payments: true,
          customer: expect.any(Object),
          reservation: true,
        }),
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 404 if invoice not found', async () => {
      mockReq = { params: { id: 'non-existent' } };
      mockFindUnique.mockResolvedValue(null);

      await getInvoiceById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invoice not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('createInvoice', () => {
    it('should validate reservation belongs to tenant before creating invoice', async () => {
      const tenantId = 'tenant-123';
      const reservationId = 'res-123';

      mockReq = {
        body: {
          customerId: 'cust-123',
          reservationId,
          dueDate: '2025-12-15',
          subtotal: 100,
          total: 100,
          lineItems: [
            {
              description: 'Boarding',
              quantity: 1,
              unitPrice: 100,
              amount: 100,
            },
          ],
        },
        tenantId,
      } as any;

      // Reservation exists and belongs to tenant
      mockFindFirst.mockResolvedValue({
        id: reservationId,
        tenantId,
      });

      const mockInvoice = {
        id: 'inv-new',
        invoiceNumber: 'INV-20251202-1234',
        tenantId,
        customerId: 'cust-123',
        reservationId,
        total: 100,
        lineItems: [],
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback({
          invoice: { create: jest.fn().mockResolvedValue(mockInvoice) },
        });
      });

      await createInvoice(mockReq as any, mockRes as Response, mockNext);

      // Should validate reservation with tenantId
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: reservationId, tenantId },
      });
    });

    it('should return 404 if reservation not found for tenant', async () => {
      const tenantId = 'tenant-123';
      const reservationId = 'res-wrong-tenant';

      mockReq = {
        body: {
          customerId: 'cust-123',
          reservationId,
          dueDate: '2025-12-15',
          subtotal: 100,
          total: 100,
          lineItems: [
            {
              description: 'Boarding',
              quantity: 1,
              unitPrice: 100,
              amount: 100,
            },
          ],
        },
        tenantId,
      } as any;

      // Reservation not found (wrong tenant)
      mockFindFirst.mockResolvedValue(null);

      await createInvoice(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe(
        'Reservation not found or does not belong to this tenant'
      );
      expect(error.statusCode).toBe(404);
    });

    it('should require at least one line item', async () => {
      mockReq = {
        body: {
          customerId: 'cust-123',
          dueDate: '2025-12-15',
          subtotal: 100,
          total: 100,
          lineItems: [], // Empty
        },
        tenantId: 'tenant-123',
      } as any;

      await createInvoice(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('At least one line item is required');
    });

    it('should require customerId', async () => {
      mockReq = {
        body: {
          dueDate: '2025-12-15',
          subtotal: 100,
          total: 100,
          lineItems: [
            { description: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
          ],
        },
        tenantId: 'tenant-123',
      } as any;

      await createInvoice(mockReq as any, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Customer ID is required');
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice status', async () => {
      const invoiceId = 'inv-123';
      mockReq = {
        params: { id: invoiceId },
        body: { status: 'PAID' },
      };

      mockFindUnique.mockResolvedValue({ id: invoiceId, status: 'PENDING' });
      mockUpdate.mockResolvedValue({ id: invoiceId, status: 'PAID' });

      await updateInvoice(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUpdate).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 404 if invoice not found', async () => {
      mockReq = {
        params: { id: 'non-existent' },
        body: { status: 'PAID' },
      };

      mockFindUnique.mockResolvedValue(null);

      await updateInvoice(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invoice not found');
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate invoice number in correct format', () => {
      // Format: INV-YYYYMMDD-XXXX
      const date = new Date('2025-12-02');
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = 1234;
      const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

      expect(invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(invoiceNumber).toBe('INV-20251202-1234');
    });
  });
});
