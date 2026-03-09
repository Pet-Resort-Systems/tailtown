/**
 * Financial Report Service Tests
 */

import { PrismaClient } from '@prisma/client';
import {
  getRevenueReport,
  getProfitLossReport,
  getOutstandingBalances,
  getRefundsReport
} from '../financialReportService';

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    invoice: {
      findMany: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

const prisma = new PrismaClient();

describe('FinancialReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueReport', () => {
    it('should calculate total revenue correctly', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 100,
          lineItems: [
            { type: 'SERVICE', description: 'Service', amount: 100 }
          ]
        },
        {
          id: '2',
          total: 50,
          lineItems: [
            { type: 'PRODUCT', description: 'Product', amount: 50 }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getRevenueReport('dev', '2025-10-01', '2025-10-31');

      expect(result.totalRevenue).toBe(150);
      expect(result.serviceRevenue).toBe(100);
      expect(result.productRevenue).toBe(50);
    });

    it('should break down revenue by category', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 150,
          lineItems: [
            { type: 'SERVICE', description: 'Grooming', amount: 100 },
            { type: 'PRODUCT', description: 'Shampoo', amount: 50 }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getRevenueReport('dev', '2025-10-01', '2025-10-31');

      expect(result.revenueByCategory).toHaveLength(2);
      const grooming = result.revenueByCategory.find(c => c.category === 'Grooming');
      const shampoo = result.revenueByCategory.find(c => c.category === 'Shampoo');

      expect(grooming?.amount).toBe(100);
      expect(grooming?.percentage).toBeCloseTo(66.67, 1);
      expect(shampoo?.amount).toBe(50);
      expect(shampoo?.percentage).toBeCloseTo(33.33, 1);
    });

    it('should handle add-on revenue', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 120,
          lineItems: [
            { type: 'SERVICE', description: 'Service', amount: 100 },
            { type: 'ADD_ON', description: 'Add-on', amount: 20 }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getRevenueReport('dev', '2025-10-01', '2025-10-31');

      expect(result.addOnRevenue).toBe(20);
    });
  });

  describe('getProfitLossReport', () => {
    it('should calculate profit and loss correctly', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 100,
          lineItems: [
            { type: 'SERVICE', description: 'Service', amount: 60 },
            { type: 'PRODUCT', description: 'Product', amount: 40 }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getProfitLossReport('dev', '2025-10-01', '2025-10-31');

      expect(result.revenue).toBe(100);
      expect(result.costOfGoodsSold).toBe(16); // 40% of product revenue (40 * 0.4)
      expect(result.grossProfit).toBe(84);
      expect(result.grossMargin).toBeCloseTo(84, 0);
    });

    it('should calculate margins as percentages', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 200,
          lineItems: [
            { type: 'SERVICE', description: 'Service', amount: 200 }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getProfitLossReport('dev', '2025-10-01', '2025-10-31');

      expect(result.grossMargin).toBe(100); // No COGS for services
      expect(result.netMargin).toBe(100); // No operating expenses
    });

    it('should handle zero revenue', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getProfitLossReport('dev', '2025-10-01', '2025-10-31');

      expect(result.revenue).toBe(0);
      expect(result.grossMargin).toBe(0);
      expect(result.netMargin).toBe(0);
    });
  });

  describe('getOutstandingBalances', () => {
    it('should list invoices with outstanding balances', async () => {
      const mockInvoices = [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          customerId: 'c1',
          issueDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-08'),
          total: 100,
          status: 'SENT',
          customer: { firstName: 'John', lastName: 'Doe' },
          payments: [{ amount: 50 }]
        },
        {
          id: '2',
          invoiceNumber: 'INV-002',
          customerId: 'c2',
          issueDate: new Date('2025-10-15'),
          dueDate: new Date('2025-10-22'),
          total: 75,
          status: 'OVERDUE',
          customer: { firstName: 'Jane', lastName: 'Smith' },
          payments: []
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getOutstandingBalances('dev');

      expect(result).toHaveLength(2);
      expect(result[0].amountDue).toBe(50);
      expect(result[1].amountDue).toBe(75);
    });

    it('should calculate days overdue correctly', async () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 10);

      const mockInvoices = [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          customerId: 'c1',
          issueDate: new Date('2025-10-01'),
          dueDate: pastDueDate,
          total: 100,
          status: 'OVERDUE',
          customer: { firstName: 'John', lastName: 'Doe' },
          payments: []
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getOutstandingBalances('dev');

      expect(result[0].daysOverdue).toBeGreaterThanOrEqual(10);
    });

    it('should exclude fully paid invoices', async () => {
      const mockInvoices = [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          customerId: 'c1',
          issueDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-08'),
          total: 100,
          status: 'SENT',
          customer: { firstName: 'John', lastName: 'Doe' },
          payments: [{ amount: 100 }] // Fully paid
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getOutstandingBalances('dev');

      expect(result).toHaveLength(0);
    });
  });

  describe('getRefundsReport', () => {
    it('should list refunded invoices', async () => {
      const mockInvoices = [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          customerId: 'c1',
          total: 100,
          status: 'REFUNDED',
          updatedAt: new Date('2025-10-15'),
          customer: { firstName: 'John', lastName: 'Doe' },
          payments: [
            { amount: 100, paymentDate: new Date('2025-10-01'), method: 'CREDIT_CARD', notes: null },
            { amount: -100, paymentDate: new Date('2025-10-15'), method: 'CREDIT_CARD', notes: 'Customer requested' }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getRefundsReport('dev', '2025-10-01', '2025-10-31');

      expect(result).toHaveLength(1);
      expect(result[0].refundAmount).toBe(100);
      expect(result[0].refundReason).toBe('Customer requested');
    });

    it('should handle multiple refunds on same invoice', async () => {
      const mockInvoices = [
        {
          id: '1',
          invoiceNumber: 'INV-001',
          customerId: 'c1',
          total: 100,
          status: 'REFUNDED',
          updatedAt: new Date('2025-10-15'),
          customer: { firstName: 'John', lastName: 'Doe' },
          payments: [
            { amount: 100, paymentDate: new Date('2025-10-01'), method: 'CREDIT_CARD', notes: null },
            { amount: -50, paymentDate: new Date('2025-10-10'), method: 'CREDIT_CARD', notes: 'Partial refund 1' },
            { amount: -50, paymentDate: new Date('2025-10-15'), method: 'CREDIT_CARD', notes: 'Partial refund 2' }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getRefundsReport('dev', '2025-10-01', '2025-10-31');

      expect(result).toHaveLength(2);
      expect(result[0].refundAmount).toBe(50);
      expect(result[1].refundAmount).toBe(50);
    });
  });
});
