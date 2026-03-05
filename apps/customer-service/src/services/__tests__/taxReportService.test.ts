/**
 * Tax Report Service Tests
 */

import { PrismaClient } from '@prisma/client';
import {
  getMonthlyTaxReport,
  getQuarterlyTaxReport,
  getAnnualTaxReport,
  getTaxBreakdown
} from '../taxReportService';

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

describe('TaxReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlyTaxReport', () => {
    it('should calculate monthly tax correctly', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 100,
          taxAmount: 8,
          taxRate: 8.0,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Service',
              amount: 100,
              taxable: true
            }
          ]
        },
        {
          id: '2',
          subtotal: 50,
          taxAmount: 4,
          taxRate: 8.0,
          lineItems: [
            {
              type: 'PRODUCT',
              description: 'Product',
              amount: 50,
              taxable: true
            }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getMonthlyTaxReport('dev', 2025, 10);

      expect(result.month).toBe('2025-10');
      expect(result.taxableRevenue).toBe(150);
      expect(result.taxCollected).toBe(12);
      expect(result.taxRate).toBeCloseTo(8.0, 1);
    });

    it('should separate taxable and non-taxable items', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 100,
          taxAmount: 8,
          taxRate: 8.0,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Taxable Service',
              amount: 80,
              taxable: true
            },
            {
              type: 'SERVICE',
              description: 'Non-Taxable Service',
              amount: 20,
              taxable: false
            }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getMonthlyTaxReport('dev', 2025, 10);

      expect(result.taxableRevenue).toBe(100);
      expect(result.nonTaxableRevenue).toBe(20);
      expect(result.totalRevenue).toBe(120);
    });

    it('should handle zero tax rate', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 100,
          taxAmount: 0,
          taxRate: 0,
          lineItems: [
            {
              type: 'SERVICE',
              description: 'Service',
              amount: 100,
              taxable: false
            }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getMonthlyTaxReport('dev', 2025, 10);

      expect(result.taxCollected).toBe(0);
      expect(result.taxRate).toBe(0);
    });
  });

  describe('getQuarterlyTaxReport', () => {
    it('should aggregate quarterly data from monthly reports', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 100,
          taxAmount: 8,
          taxRate: 8.0,
          lineItems: [{ type: 'SERVICE', description: 'Service', amount: 100, taxable: true }]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getQuarterlyTaxReport('dev', 2025, 4);

      expect(result.quarter).toBe(4);
      expect(result.quarterName).toBe('Q4 2025');
      expect(result.monthlyBreakdown).toHaveLength(3);
    });

    it('should calculate correct quarter months', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const q1 = await getQuarterlyTaxReport('dev', 2025, 1);
      const q2 = await getQuarterlyTaxReport('dev', 2025, 2);
      const q3 = await getQuarterlyTaxReport('dev', 2025, 3);
      const q4 = await getQuarterlyTaxReport('dev', 2025, 4);

      expect(q1.monthlyBreakdown).toHaveLength(3); // Jan, Feb, Mar
      expect(q2.monthlyBreakdown).toHaveLength(3); // Apr, May, Jun
      expect(q3.monthlyBreakdown).toHaveLength(3); // Jul, Aug, Sep
      expect(q4.monthlyBreakdown).toHaveLength(3); // Oct, Nov, Dec
    });
  });

  describe('getAnnualTaxReport', () => {
    it('should aggregate annual data from quarterly reports', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 1000,
          taxAmount: 80,
          taxRate: 8.0,
          lineItems: [{ type: 'SERVICE', description: 'Service', amount: 1000, taxable: true }]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getAnnualTaxReport('dev', 2025);

      expect(result.year).toBe(2025);
      expect(result.quarterlyBreakdown).toHaveLength(4);
    });

    it('should calculate category breakdown for the year', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 100,
          taxAmount: 8,
          taxRate: 8.0,
          lineItems: [
            { type: 'SERVICE', description: 'Service', amount: 60, taxable: true },
            { type: 'PRODUCT', description: 'Product', amount: 40, taxable: true }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getAnnualTaxReport('dev', 2025);

      expect(result.categoryBreakdown.length).toBeGreaterThan(0);
    });
  });

  describe('getTaxBreakdown', () => {
    it('should break down tax by category', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 100,
          taxAmount: 8,
          taxRate: 8.0,
          lineItems: [
            { type: 'SERVICE', description: 'Service', amount: 60, taxable: true },
            { type: 'PRODUCT', description: 'Product', amount: 40, taxable: true }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getTaxBreakdown('dev', '2025-10-01', '2025-10-31');

      expect(result.length).toBeGreaterThan(0);
      const serviceCategory = result.find(r => r.category === 'SERVICE');
      const productCategory = result.find(r => r.category === 'PRODUCT');

      expect(serviceCategory).toBeDefined();
      expect(productCategory).toBeDefined();
    });

    it('should handle mixed taxable and non-taxable items', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 100,
          taxAmount: 8,
          taxRate: 8.0,
          lineItems: [
            { type: 'SERVICE', description: 'Taxable', amount: 100, taxable: true },
            { type: 'SERVICE', description: 'Non-Taxable', amount: 50, taxable: false }
          ]
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getTaxBreakdown('dev', '2025-10-01', '2025-10-31');

      const serviceCategory = result.find(r => r.category === 'SERVICE');
      expect(serviceCategory?.taxableAmount).toBe(100);
      expect(serviceCategory?.nonTaxableAmount).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty invoice list', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getMonthlyTaxReport('dev', 2025, 10);

      expect(result.taxableRevenue).toBe(0);
      expect(result.taxCollected).toBe(0);
      expect(result.taxRate).toBe(0);
    });

    it('should handle division by zero in tax rate calculation', async () => {
      const mockInvoices = [
        {
          id: '1',
          subtotal: 0,
          taxAmount: 0,
          taxRate: 0,
          lineItems: []
        }
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await getMonthlyTaxReport('dev', 2025, 10);

      expect(result.taxRate).toBe(0);
      expect(() => result.taxRate).not.toThrow();
    });

    it('should format month names correctly', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getMonthlyTaxReport('dev', 2025, 10);

      expect(result.monthName).toContain('October');
      expect(result.monthName).toContain('2025');
    });
  });
});
