/**
 * Financial Report Service
 * Generates financial reports for business analysis
 */

import { PrismaClient } from '@prisma/client';
import {
  RevenueData,
  ProfitLossData,
  OutstandingBalance,
  RefundData,
  ReconciliationData,
  ReconciliationTransaction,
} from '../types/reports.types';

const prisma = new PrismaClient();

/**
 * Get revenue report for date range
 */
export const getRevenueReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<RevenueData> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get all paid invoices in date range
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: start,
        lte: end,
      },
      status: 'PAID',
    },
    include: {
      lineItems: true,
    },
  });

  let totalRevenue = 0;
  let serviceRevenue = 0;
  let productRevenue = 0;
  let addOnRevenue = 0;

  const categoryMap = new Map<string, { amount: number; percentage: number }>();

  for (const invoice of invoices) {
    totalRevenue += invoice.total;

    for (const lineItem of invoice.lineItems) {
      const type = (lineItem as any).type || 'SERVICE';
      const category = lineItem.description;

      // Aggregate by type
      if (type === 'SERVICE') {
        serviceRevenue += lineItem.amount;
      } else if (type === 'PRODUCT') {
        productRevenue += lineItem.amount;
      } else if (type === 'ADD_ON') {
        addOnRevenue += lineItem.amount;
      }

      // Aggregate by category
      const existing = categoryMap.get(category);
      if (existing) {
        existing.amount += lineItem.amount;
      } else {
        categoryMap.set(category, {
          amount: lineItem.amount,
          percentage: 0,
        });
      }
    }
  }

  // Calculate percentages
  const revenueByCategory = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
    })
  );

  return {
    period: `${startDate} to ${endDate}`,
    totalRevenue,
    serviceRevenue,
    productRevenue,
    addOnRevenue,
    revenueByCategory,
  };
};

/**
 * Get profit & loss report
 */
export const getProfitLossReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<ProfitLossData> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get all paid invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: start,
        lte: end,
      },
      status: 'PAID',
    },
    include: {
      lineItems: true,
    },
  });

  let revenue = 0;
  let costOfGoodsSold = 0;

  for (const invoice of invoices) {
    revenue += invoice.total;

    // Calculate COGS for products (assuming 40% cost)
    for (const lineItem of invoice.lineItems) {
      const type = (lineItem as any).type || 'SERVICE';
      if (type === 'PRODUCT') {
        costOfGoodsSold += lineItem.amount * 0.4; // 40% cost assumption
      }
    }
  }

  const grossProfit = revenue - costOfGoodsSold;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Operating expenses (would come from expense tracking - placeholder for now)
  const operatingExpenses = 0;
  const netProfit = grossProfit - operatingExpenses;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    period: `${startDate} to ${endDate}`,
    revenue,
    costOfGoodsSold,
    grossProfit,
    grossMargin,
    operatingExpenses,
    netProfit,
    netMargin,
  };
};

/**
 * Get outstanding balances report
 */
export const getOutstandingBalances = async (
  tenantId: string
): Promise<OutstandingBalance[]> => {
  // Get all invoices that are not fully paid
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: {
        in: ['SENT', 'OVERDUE'],
      },
    },
    include: {
      customer: true,
      payments: true,
    },
    orderBy: {
      dueDate: 'asc',
    },
  });

  const outstandingBalances: OutstandingBalance[] = [];

  for (const invoice of invoices) {
    const amountPaid = invoice.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const amountDue = invoice.total - amountPaid;

    if (amountDue > 0) {
      const daysOverdue =
        invoice.dueDate < new Date()
          ? Math.floor(
              (new Date().getTime() - invoice.dueDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

      outstandingBalances.push({
        customerId: invoice.customerId,
        customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.issueDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        amount: invoice.total,
        amountPaid,
        amountDue,
        daysOverdue,
        status: invoice.status,
      });
    }
  }

  return outstandingBalances;
};

/**
 * Get refunds report
 */
export const getRefundsReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<RefundData[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get all refunded invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: 'REFUNDED',
      updatedAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      customer: true,
      payments: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const refunds: RefundData[] = [];

  for (const invoice of invoices) {
    // Find refund payments (negative amounts)
    const refundPayments = invoice.payments.filter((p) => p.amount < 0);

    for (const refundPayment of refundPayments) {
      refunds.push({
        date: refundPayment.paymentDate.toISOString().split('T')[0],
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        originalAmount: invoice.total,
        refundAmount: Math.abs(refundPayment.amount),
        refundReason: refundPayment.notes || 'No reason provided',
        refundMethod: refundPayment.method,
      });
    }
  }

  return refunds;
};

/**
 * Get end-of-day reconciliation report
 */
export const getReconciliationReport = async (
  tenantId: string,
  date: string
): Promise<ReconciliationData> => {
  const reportDate = new Date(date);
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all payments for the day
  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      paymentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: {
      paymentDate: 'asc',
    },
  });

  // Initialize tracking variables
  let cashSales = 0;
  let cardSales = 0;
  let otherSales = 0;
  let tipsCollected = 0;
  let refundsIssued = 0;
  const paymentMethodMap = new Map<string, { count: number; amount: number }>();
  const transactions: ReconciliationTransaction[] = [];

  for (const payment of payments) {
    const method = payment.method || 'OTHER';
    const amount = payment.amount;
    const tip = (payment as any).tipAmount || 0;

    // Track refunds separately
    if (amount < 0) {
      refundsIssued += Math.abs(amount);
      continue;
    }

    // Categorize by payment method
    if (method === 'CASH') {
      cashSales += amount;
    } else if (['CARD', 'CREDIT_CARD', 'DEBIT_CARD'].includes(method)) {
      cardSales += amount;
    } else {
      otherSales += amount;
    }

    tipsCollected += tip;

    // Update payment method breakdown
    const existing = paymentMethodMap.get(method);
    if (existing) {
      existing.count += 1;
      existing.amount += amount + tip;
    } else {
      paymentMethodMap.set(method, { count: 1, amount: amount + tip });
    }

    // Build transaction record
    transactions.push({
      time: payment.paymentDate.toISOString(),
      invoiceNumber: payment.invoice?.invoiceNumber || 'N/A',
      customerName: payment.invoice?.customer
        ? `${payment.invoice.customer.firstName} ${payment.invoice.customer.lastName}`
        : 'Walk-in',
      paymentMethod: method,
      amount: amount,
      tip: tip,
      total: amount + tip,
      staffName: (payment as any).staffName || 'N/A',
    });
  }

  const totalSales = cashSales + cardSales + otherSales;
  const netRevenue = totalSales + tipsCollected - refundsIssued;

  // Build payment breakdown array
  const paymentBreakdown = Array.from(paymentMethodMap.entries()).map(
    ([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
    })
  );

  // Expected drawer = opening balance + cash sales + cash tips - cash refunds
  const openingBalance = 200; // Default opening drawer amount
  const expectedDrawer = openingBalance + cashSales;

  return {
    date,
    openingBalance,
    closingBalance: 0, // To be entered by staff
    expectedDrawer,
    transactions,
    summary: {
      cashSales,
      cardSales,
      otherSales,
      totalSales,
      tipsCollected,
      refundsIssued,
      netRevenue,
      transactionCount: transactions.length,
    },
    paymentBreakdown,
  };
};
