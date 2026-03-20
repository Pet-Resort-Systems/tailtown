/**
 * Invoice Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Request, Response, NextFunction } from 'express';
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from '../../test/setup-test-db';
import {
  getCustomerInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
} from '../invoice.controller';
import { TenantRequest } from '../../middleware/tenant.middleware';
import { InvoiceStatus } from '@prisma/client';

describe('Invoice Controller Integration Tests', () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerId: string;
  let testReservationId: string;
  let testInvoiceIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`invoice-test-${Date.now()}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: 'Invoice',
        lastName: 'Test',
        email: `invoice-test-${Date.now()}@example.com`,
        phone: '555-0200',
      },
    });
    testCustomerId = customer.id;

    // Create test pet
    const pet = await prisma.pet.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        name: 'InvoiceTestPet',
        type: 'DOG',
        breed: 'Test Breed',
      },
    });

    // Create test service
    const service = await prisma.service.create({
      data: {
        tenantId: testTenantId,
        name: 'Invoice Test Service',
        serviceCategory: 'BOARDING',
        price: 50,
        duration: 1440,
        isActive: true,
      },
    });

    // Create test resource
    const resource = await prisma.resource.create({
      data: {
        tenantId: testTenantId,
        name: 'Invoice Test Suite',
        type: 'STANDARD_SUITE',
        isActive: true,
      },
    });

    // Create test reservation
    const reservation = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: pet.id,
        serviceId: service.id,
        resourceId: resource.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
      },
    });
    testReservationId = reservation.id;
  });

  afterAll(async () => {
    // Clean up invoices first (due to FK constraints)
    for (const invoiceId of testInvoiceIds) {
      await prisma.invoiceLineItem
        .deleteMany({ where: { invoiceId } })
        .catch(() => {});
      await prisma.invoice.delete({ where: { id: invoiceId } }).catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerInvoices', () => {
    beforeAll(async () => {
      // Create test invoice
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          invoiceNumber: `INV-CUST-${Date.now()}`,
          customerId: testCustomerId,
          subtotal: 100,
          total: 100,
          status: InvoiceStatus.SENT,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      testInvoiceIds.push(invoice.id);
    });

    it('should return invoices for a valid customer', async () => {
      const req = {
        params: { customerId: testCustomerId },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getCustomerInvoices(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: expect.any(Number),
          data: expect.any(Array),
        })
      );
    });

    it('should call next with error for missing customerId', async () => {
      const req = {
        params: {},
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getCustomerInvoices(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Customer ID is required');
    });
  });

  describe('getInvoiceById', () => {
    let testInvoiceId: string;

    beforeAll(async () => {
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          invoiceNumber: `INV-BYID-${Date.now()}`,
          customerId: testCustomerId,
          subtotal: 150,
          total: 150,
          status: InvoiceStatus.SENT,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      testInvoiceId = invoice.id;
      testInvoiceIds.push(testInvoiceId);
    });

    it('should return invoice by ID with relations', async () => {
      const req = {
        params: { id: testInvoiceId },
      } as unknown as Request;
      const res = createMockResponse();

      await getInvoiceById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            id: testInvoiceId,
            total: 150,
          }),
        })
      );
    });

    it('should call next with 404 for non-existent invoice', async () => {
      const req = {
        params: { id: '00000000-0000-0000-0000-000000000000' },
      } as unknown as Request;
      const res = createMockResponse();

      await getInvoiceById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invoice not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with line items', async () => {
      const req = {
        body: {
          customerId: testCustomerId,
          reservationId: testReservationId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subtotal: 100,
          total: 100,
          lineItems: [
            {
              description: 'Boarding - 2 nights',
              quantity: 2,
              unitPrice: 50,
              amount: 100,
            },
          ],
        },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createInvoice(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            customerId: testCustomerId,
            total: 100,
          }),
        })
      );

      // Track for cleanup
      const createdInvoice = (res.json as jest.Mock).mock.calls[0][0].data;
      testInvoiceIds.push(createdInvoice.id);
    });

    it('should reject invoice with invalid reservation', async () => {
      const req = {
        body: {
          customerId: testCustomerId,
          reservationId: '00000000-0000-0000-0000-000000000000',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subtotal: 100,
          total: 100,
          lineItems: [
            { description: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
          ],
        },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createInvoice(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('Reservation not found');
    });

    it('should reject invoice without line items', async () => {
      const req = {
        body: {
          customerId: testCustomerId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subtotal: 100,
          total: 100,
          lineItems: [],
        },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createInvoice(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('line item');
    });

    it('should reject invoice without customerId', async () => {
      const req = {
        body: {
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subtotal: 100,
          total: 100,
          lineItems: [
            { description: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
          ],
        },
        tenantId: testTenantId,
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createInvoice(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('Customer ID is required');
    });
  });

  describe('updateInvoice', () => {
    let updateTestInvoiceId: string;

    beforeAll(async () => {
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: testTenantId,
          invoiceNumber: `INV-UPDATE-${Date.now()}`,
          customerId: testCustomerId,
          subtotal: 200,
          total: 200,
          status: InvoiceStatus.DRAFT,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      updateTestInvoiceId = invoice.id;
      testInvoiceIds.push(updateTestInvoiceId);
    });

    it('should update invoice status', async () => {
      const req = {
        params: { id: updateTestInvoiceId },
        body: { status: 'SENT' },
      } as unknown as Request;
      const res = createMockResponse();

      await updateInvoice(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            id: updateTestInvoiceId,
            status: 'SENT',
          }),
        })
      );
    });

    it('should call next with 404 for non-existent invoice', async () => {
      const req = {
        params: { id: '00000000-0000-0000-0000-000000000000' },
        body: { status: 'SENT' },
      } as unknown as Request;
      const res = createMockResponse();

      await updateInvoice(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invoice not found');
    });
  });
});
