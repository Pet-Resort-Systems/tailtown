/**
 * Tax Report Service
 * Generates tax reports for compliance and filing
 */

import { PrismaClient } from '@prisma/client';
import {
  MonthlyTaxData,
  QuarterlyTaxData,
  AnnualTaxData,
  TaxBreakdown
} from '../types/reports.types';

const prisma = new PrismaClient();

/**
 * Get monthly tax report
 */
export const getMonthlyTaxReport = async (
  tenantId: string,
  year: number,
  month: number
): Promise<MonthlyTaxData> => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);
  
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get all paid invoices for the month
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: startDate,
        lte: endDate
      },
      status: 'PAID'
    },
    include: {
      lineItems: true
    }
  });
  
  let taxableRevenue = 0;
  let nonTaxableRevenue = 0;
  let taxCollected = 0;
  const categoryMap = new Map<string, TaxBreakdown>();
  
  for (const invoice of invoices) {
    // Use invoice-level tax data
    taxableRevenue += invoice.subtotal;
    taxCollected += invoice.taxAmount;
    
    // Break down by line item category
    for (const lineItem of invoices[0]?.lineItems || []) {
      const category = (lineItem as any).type || 'SERVICE';
      const existing = categoryMap.get(category);
      
      if (lineItem.taxable) {
        if (existing) {
          existing.taxableAmount += lineItem.amount;
          existing.taxAmount += lineItem.amount * (invoice.taxRate / 100);
        } else {
          categoryMap.set(category, {
            category,
            taxableAmount: lineItem.amount,
            nonTaxableAmount: 0,
            taxAmount: lineItem.amount * (invoice.taxRate / 100),
            taxRate: invoice.taxRate
          });
        }
      } else {
        nonTaxableRevenue += lineItem.amount;
        if (existing) {
          existing.nonTaxableAmount += lineItem.amount;
        } else {
          categoryMap.set(category, {
            category,
            taxableAmount: 0,
            nonTaxableAmount: lineItem.amount,
            taxAmount: 0,
            taxRate: 0
          });
        }
      }
    }
  }
  
  const totalRevenue = taxableRevenue + nonTaxableRevenue;
  const averageTaxRate = taxableRevenue > 0 ? (taxCollected / taxableRevenue) * 100 : 0;
  
  const breakdown = Array.from(categoryMap.values());
  
  return {
    month: monthStr,
    monthName,
    taxableRevenue,
    nonTaxableRevenue,
    totalRevenue,
    taxRate: averageTaxRate,
    taxCollected,
    breakdown
  };
};

/**
 * Get quarterly tax report
 */
export const getQuarterlyTaxReport = async (
  tenantId: string,
  year: number,
  quarter: number
): Promise<QuarterlyTaxData> => {
  // Determine months in quarter
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  
  const quarterName = `Q${quarter} ${year}`;
  
  // Get monthly breakdowns
  const monthlyBreakdown: MonthlyTaxData[] = [];
  let totalTaxableRevenue = 0;
  let totalNonTaxableRevenue = 0;
  let totalTaxCollected = 0;
  
  for (let month = startMonth; month <= endMonth; month++) {
    const monthData = await getMonthlyTaxReport(tenantId, year, month);
    monthlyBreakdown.push(monthData);
    totalTaxableRevenue += monthData.taxableRevenue;
    totalNonTaxableRevenue += monthData.nonTaxableRevenue;
    totalTaxCollected += monthData.taxCollected;
  }
  
  const totalRevenue = totalTaxableRevenue + totalNonTaxableRevenue;
  const averageTaxRate = totalTaxableRevenue > 0 ? (totalTaxCollected / totalTaxableRevenue) * 100 : 0;
  
  return {
    year,
    quarter,
    quarterName,
    taxableRevenue: totalTaxableRevenue,
    nonTaxableRevenue: totalNonTaxableRevenue,
    totalRevenue,
    averageTaxRate,
    taxCollected: totalTaxCollected,
    monthlyBreakdown
  };
};

/**
 * Get annual tax report
 */
export const getAnnualTaxReport = async (
  tenantId: string,
  year: number
): Promise<AnnualTaxData> => {
  // Get quarterly breakdowns
  const quarterlyBreakdown: QuarterlyTaxData[] = [];
  let totalTaxableRevenue = 0;
  let totalNonTaxableRevenue = 0;
  let totalTaxCollected = 0;
  
  for (let quarter = 1; quarter <= 4; quarter++) {
    const quarterData = await getQuarterlyTaxReport(tenantId, year, quarter);
    quarterlyBreakdown.push(quarterData);
    totalTaxableRevenue += quarterData.taxableRevenue;
    totalNonTaxableRevenue += quarterData.nonTaxableRevenue;
    totalTaxCollected += quarterData.taxCollected;
  }
  
  const totalRevenue = totalTaxableRevenue + totalNonTaxableRevenue;
  const averageTaxRate = totalTaxableRevenue > 0 ? (totalTaxCollected / totalTaxableRevenue) * 100 : 0;
  
  // Aggregate category breakdown for the year
  const categoryMap = new Map<string, TaxBreakdown>();
  
  for (const quarter of quarterlyBreakdown) {
    for (const month of quarter.monthlyBreakdown) {
      for (const breakdown of month.breakdown) {
        const existing = categoryMap.get(breakdown.category);
        
        if (existing) {
          existing.taxableAmount += breakdown.taxableAmount;
          existing.nonTaxableAmount += breakdown.nonTaxableAmount;
          existing.taxAmount += breakdown.taxAmount;
        } else {
          categoryMap.set(breakdown.category, { ...breakdown });
        }
      }
    }
  }
  
  const categoryBreakdown = Array.from(categoryMap.values()).map(cat => ({
    ...cat,
    taxRate: cat.taxableAmount > 0 ? (cat.taxAmount / cat.taxableAmount) * 100 : 0
  }));
  
  return {
    year,
    taxableRevenue: totalTaxableRevenue,
    nonTaxableRevenue: totalNonTaxableRevenue,
    totalRevenue,
    averageTaxRate,
    taxCollected: totalTaxCollected,
    quarterlyBreakdown,
    categoryBreakdown
  };
};

/**
 * Get tax breakdown for custom date range
 */
export const getTaxBreakdown = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<TaxBreakdown[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: start,
        lte: end
      },
      status: 'PAID'
    },
    include: {
      lineItems: true
    }
  });
  
  const categoryMap = new Map<string, TaxBreakdown>();
  
  for (const invoice of invoices) {
    for (const lineItem of invoice.lineItems) {
      const category = (lineItem as any).type || 'SERVICE';
      const existing = categoryMap.get(category);
      
      if (lineItem.taxable) {
        const taxAmount = lineItem.amount * (invoice.taxRate / 100);
        
        if (existing) {
          existing.taxableAmount += lineItem.amount;
          existing.taxAmount += taxAmount;
        } else {
          categoryMap.set(category, {
            category,
            taxableAmount: lineItem.amount,
            nonTaxableAmount: 0,
            taxAmount,
            taxRate: invoice.taxRate
          });
        }
      } else {
        if (existing) {
          existing.nonTaxableAmount += lineItem.amount;
        } else {
          categoryMap.set(category, {
            category,
            taxableAmount: 0,
            nonTaxableAmount: lineItem.amount,
            taxAmount: 0,
            taxRate: 0
          });
        }
      }
    }
  }
  
  return Array.from(categoryMap.values()).map(cat => ({
    ...cat,
    taxRate: cat.taxableAmount > 0 ? (cat.taxAmount / cat.taxableAmount) * 100 : 0
  }));
};
