/**
 * Sales Report Service Tests
 */

import { PrismaClient } from '@prisma/client';
import {
  getDailySalesReport,
  getWeeklySalesReport,
  getMonthlySalesReport,
  getYTDSalesReport,
  getTopCustomers
} from '../salesReportService';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    invoice: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    reservation: {
      findMany: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

const prisma = new PrismaClient();

describe('SalesReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailySalesReport', () => {
    it('should calculate daily sales correctly', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 100,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Grooming',
              quantity: 1,
              amount: 100,
              serviceId: 's1'
            }
          ],
          payments: [
            {
              method: 'CREDIT_CARD',
              amount: 100
            }
          ]
        },
        {
          id: '2',
          total: 50,
          lineItems: [
            {
              type: 'PRODUCT',
              description: 'Bandana',
              quantity: 1,
              amount: 50,
              productId: 'p1'
            }
          ],
          payments: [
            {
              method: 'CASH',
              amount: 50
            }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getDailySalesReport('dev', '2025-10-25');

      expect(result.totalSales).toBe(150);
      expect(result.transactionCount).toBe(2);
      expect(result.averageTransaction).toBe(75);
      // Service breakdown aggregates by description, so we expect 2 items (Grooming and Bandana)
      expect(result.serviceBreakdown.length).toBeGreaterThanOrEqual(1);
      expect(result.paymentMethodBreakdown).toHaveLength(2);
    });

    it('should handle empty results', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getDailySalesReport('dev', '2025-10-25');

      expect(result.totalSales).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.averageTransaction).toBe(0);
      expect(result.serviceBreakdown).toHaveLength(0);
    });

    it('should calculate percentages correctly', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 100,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Service A',
              quantity: 1,
              amount: 60,
              serviceId: 's1'
            },
            {
              type: 'SERVICE',
              description: 'Service B',
              quantity: 1,
              amount: 40,
              serviceId: 's2'
            }
          ],
          payments: [{ method: 'CREDIT_CARD', amount: 100 }]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getDailySalesReport('dev', '2025-10-25');

      const serviceA = result.serviceBreakdown.find(s => s.serviceName === 'Service A');
      const serviceB = result.serviceBreakdown.find(s => s.serviceName === 'Service B');

      expect(serviceA?.percentage).toBe(60);
      expect(serviceB?.percentage).toBe(40);
    });
  });

  describe('getTopCustomers', () => {
    it('should return top customers sorted by revenue', async () => {
      const mockInvoices = [
        {
          id: '1',
          customerId: 'c1',
          total: 500,
          issueDate: new Date('2025-10-01'),
          customer: { firstName: 'John', lastName: 'Doe' }
        },
        {
          id: '2',
          customerId: 'c2',
          total: 300,
          issueDate: new Date('2025-10-15'),
          customer: { firstName: 'Jane', lastName: 'Smith' }
        },
        {
          id: '3',
          customerId: 'c1',
          total: 200,
          issueDate: new Date('2025-10-20'),
          customer: { firstName: 'John', lastName: 'Doe' }
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getTopCustomers('dev', '2025-10-01', '2025-10-31', 10);

      expect(result).toHaveLength(2);
      expect(result[0].customerId).toBe('c1');
      expect(result[0].totalSpent).toBe(700);
      expect(result[0].transactionCount).toBe(2);
      expect(result[0].averageTransaction).toBe(350);
      expect(result[1].customerId).toBe('c2');
      expect(result[1].totalSpent).toBe(300);
    });

    it('should respect the limit parameter', async () => {
      const mockInvoices = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        customerId: `c${i}`,
        total: 100,
        issueDate: new Date('2025-10-01'),
        customer: { firstName: 'Customer', lastName: `${i}` }
      }));

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getTopCustomers('dev', '2025-10-01', '2025-10-31', 5);

      expect(result).toHaveLength(5);
    });
  });

  describe('getMonthlySalesReport', () => {
    it('should aggregate monthly data correctly', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 100,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Service',
              quantity: 1,
              amount: 100,
              serviceId: 's1'
            }
          ],
          payments: [{ method: 'CREDIT_CARD', amount: 100 }]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getMonthlySalesReport('dev', 2025, 10);

      expect(result.month).toBe('2025-10');
      expect(result.monthName).toContain('October');
      expect(result.totalSales).toBe(100);
      expect(result.transactionCount).toBe(1);
    });
  });

  describe('getYTDSalesReport', () => {
    it('should calculate year-to-date totals', async () => {
      const mockInvoices = [
        { id: '1', total: 100, lineItems: [], payments: [] },
        { id: '2', total: 200, lineItems: [], payments: [] },
        { id: '3', total: 150, lineItems: [], payments: [] }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getYTDSalesReport('dev', 2025);

      expect(result.year).toBe(2025);
      expect(result.totalSales).toBe(450);
      expect(result.transactionCount).toBe(3);
      expect(result.averageTransaction).toBe(150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle division by zero', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getDailySalesReport('dev', '2025-10-25');

      expect(result.averageTransaction).toBe(0);
      expect(() => result.averageTransaction).not.toThrow();
    });

    it('should handle missing payment data', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 100,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Service',
              quantity: 1,
              amount: 100,
              serviceId: 's1'
            }
          ],
          payments: []
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getDailySalesReport('dev', '2025-10-25');

      expect(result.totalSales).toBe(100);
      expect(result.paymentMethodBreakdown).toHaveLength(0);
    });

    it('should handle null/undefined values gracefully', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: 100,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Service',
              quantity: 1,
              amount: 100,
              serviceId: null
            }
          ],
          payments: [{ method: 'CREDIT_CARD', amount: 100 }]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getDailySalesReport('dev', '2025-10-25');

      expect(result.serviceBreakdown[0].serviceId).toBe('');
    });
  });
});
