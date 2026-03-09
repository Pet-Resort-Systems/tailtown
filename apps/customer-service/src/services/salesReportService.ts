/**
 * Sales Report Service
 * Generates sales analytics and reports
 */

import { PrismaClient } from '@prisma/client';
import {
  DailySalesData,
  WeeklySalesData,
  MonthlySalesData,
  YTDSalesData,
  ServiceSales,
  PaymentMethodSales,
  TopCustomer,
  ReportFilters
} from '../types/reports.types';

const prisma = new PrismaClient();

/**
 * Get daily sales report
 */
export const getDailySalesReport = async (
  tenantId: string,
  date: string
): Promise<DailySalesData> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Get all invoices for the day
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: {
        in: ['PAID', 'SENT']
      }
    },
    include: {
      lineItems: true,
      payments: true
    }
  });
  
  // Calculate totals
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const transactionCount = invoices.length;
  const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;
  
  // Service breakdown
  const serviceMap = new Map<string, ServiceSales>();
  
  for (const invoice of invoices) {
    for (const lineItem of invoice.lineItems) {
      if (lineItem.type === 'SERVICE' || lineItem.type === 'ADD_ON') {
        const key = lineItem.description;
        const existing = serviceMap.get(key);
        
        if (existing) {
          existing.revenue += lineItem.amount;
          existing.count += lineItem.quantity;
        } else {
          serviceMap.set(key, {
            serviceName: lineItem.description,
            serviceType: lineItem.type,
            serviceId: lineItem.serviceId || '',
            revenue: lineItem.amount,
            count: lineItem.quantity,
            percentage: 0
          });
        }
      }
    }
  }
  
  const serviceBreakdown = Array.from(serviceMap.values()).map(service => ({
    ...service,
    percentage: totalSales > 0 ? (service.revenue / totalSales) * 100 : 0
  }));
  
  // Payment method breakdown
  const paymentMap = new Map<string, PaymentMethodSales>();
  
  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      const method = payment.method;
      const existing = paymentMap.get(method);
      
      if (existing) {
        existing.amount += payment.amount;
        existing.count += 1;
      } else {
        paymentMap.set(method, {
          method,
          amount: payment.amount,
          count: 1,
          percentage: 0
        });
      }
    }
  }
  
  const paymentMethodBreakdown = Array.from(paymentMap.values()).map(pm => ({
    ...pm,
    percentage: totalSales > 0 ? (pm.amount / totalSales) * 100 : 0
  }));
  
  return {
    date,
    totalSales,
    transactionCount,
    averageTransaction,
    serviceBreakdown,
    paymentMethodBreakdown
  };
};

/**
 * Get weekly sales report
 */
export const getWeeklySalesReport = async (
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<WeeklySalesData> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get daily breakdown
  const dailyBreakdown: DailySalesData[] = [];
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dailyData = await getDailySalesReport(tenantId, dateStr);
    dailyBreakdown.push(dailyData);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Aggregate weekly totals
  const totalSales = dailyBreakdown.reduce((sum, day) => sum + day.totalSales, 0);
  const transactionCount = dailyBreakdown.reduce((sum, day) => sum + day.transactionCount, 0);
  const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;
  
  // Get week number
  const weekNumber = getWeekNumber(start);
  
  return {
    weekStart: startDate,
    weekEnd: endDate,
    weekNumber,
    totalSales,
    transactionCount,
    averageTransaction,
    dailyBreakdown
  };
};

/**
 * Get monthly sales report
 */
export const getMonthlySalesReport = async (
  tenantId: string,
  year: number,
  month: number
): Promise<MonthlySalesData> => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);
  
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get all invoices for the month
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ['PAID', 'SENT']
      }
    },
    include: {
      lineItems: true,
      payments: true
    }
  });
  
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const transactionCount = invoices.length;
  const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;
  
  // Service breakdown (aggregate for month)
  const serviceMap = new Map<string, ServiceSales>();
  
  for (const invoice of invoices) {
    for (const lineItem of invoice.lineItems) {
      if (lineItem.type === 'SERVICE' || lineItem.type === 'ADD_ON') {
        const key = lineItem.description;
        const existing = serviceMap.get(key);
        
        if (existing) {
          existing.revenue += lineItem.amount;
          existing.count += lineItem.quantity;
        } else {
          serviceMap.set(key, {
            serviceName: lineItem.description,
            serviceType: lineItem.type,
            serviceId: lineItem.serviceId || '',
            revenue: lineItem.amount,
            count: lineItem.quantity,
            percentage: 0
          });
        }
      }
    }
  }
  
  const serviceBreakdown = Array.from(serviceMap.values()).map(service => ({
    ...service,
    percentage: totalSales > 0 ? (service.revenue / totalSales) * 100 : 0
  }));
  
  // Payment method breakdown
  const paymentMap = new Map<string, PaymentMethodSales>();
  
  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      const method = payment.method;
      const existing = paymentMap.get(method);
      
      if (existing) {
        existing.amount += payment.amount;
        existing.count += 1;
      } else {
        paymentMap.set(method, {
          method,
          amount: payment.amount,
          count: 1,
          percentage: 0
        });
      }
    }
  }
  
  const paymentMethodBreakdown = Array.from(paymentMap.values()).map(pm => ({
    ...pm,
    percentage: totalSales > 0 ? (pm.amount / totalSales) * 100 : 0
  }));
  
  // Weekly breakdown (simplified - just get weeks)
  const weeklyBreakdown: WeeklySalesData[] = [];
  // TODO: Implement weekly breakdown if needed
  
  return {
    month: monthStr,
    monthName,
    totalSales,
    transactionCount,
    averageTransaction,
    weeklyBreakdown,
    serviceBreakdown,
    paymentMethodBreakdown
  };
};

/**
 * Get year-to-date sales report
 */
export const getYTDSalesReport = async (
  tenantId: string,
  year: number
): Promise<YTDSalesData> => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date();
  
  // Get all invoices for the year
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ['PAID', 'SENT']
      }
    },
    include: {
      lineItems: true,
      payments: true
    }
  });
  
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const transactionCount = invoices.length;
  const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;
  
  // Monthly breakdown
  const monthlyBreakdown: MonthlySalesData[] = [];
  const currentMonth = new Date().getMonth() + 1;
  
  for (let month = 1; month <= currentMonth; month++) {
    const monthData = await getMonthlySalesReport(tenantId, year, month);
    monthlyBreakdown.push(monthData);
  }
  
  // Top services (aggregate)
  const serviceMap = new Map<string, ServiceSales>();
  
  for (const invoice of invoices) {
    for (const lineItem of invoice.lineItems) {
      if (lineItem.type === 'SERVICE' || lineItem.type === 'ADD_ON') {
        const key = lineItem.description;
        const existing = serviceMap.get(key);
        
        if (existing) {
          existing.revenue += lineItem.amount;
          existing.count += lineItem.quantity;
        } else {
          serviceMap.set(key, {
            serviceName: lineItem.description,
            serviceType: lineItem.type,
            serviceId: lineItem.serviceId || '',
            revenue: lineItem.amount,
            count: lineItem.quantity,
            percentage: 0
          });
        }
      }
    }
  }
  
  const topServices = Array.from(serviceMap.values())
    .map(service => ({
      ...service,
      percentage: totalSales > 0 ? (service.revenue / totalSales) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // Top payment methods
  const paymentMap = new Map<string, PaymentMethodSales>();
  
  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      const method = payment.method;
      const existing = paymentMap.get(method);
      
      if (existing) {
        existing.amount += payment.amount;
        existing.count += 1;
      } else {
        paymentMap.set(method, {
          method,
          amount: payment.amount,
          count: 1,
          percentage: 0
        });
      }
    }
  }
  
  const topPaymentMethods = Array.from(paymentMap.values())
    .map(pm => ({
      ...pm,
      percentage: totalSales > 0 ? (pm.amount / totalSales) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);
  
  return {
    year,
    totalSales,
    transactionCount,
    averageTransaction,
    monthlyBreakdown,
    topServices,
    topPaymentMethods
  };
};

/**
 * Get top customers by revenue
 */
export const getTopCustomers = async (
  tenantId: string,
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<TopCustomer[]> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get all invoices in date range
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: {
        gte: start,
        lte: end
      },
      status: {
        in: ['PAID', 'SENT']
      }
    },
    include: {
      customer: true
    }
  });
  
  // Aggregate by customer
  const customerMap = new Map<string, TopCustomer>();
  
  for (const invoice of invoices) {
    const customerId = invoice.customerId;
    const existing = customerMap.get(customerId);
    
    if (existing) {
      existing.totalSpent += invoice.total;
      existing.transactionCount += 1;
      if (new Date(invoice.issueDate) > new Date(existing.lastVisit)) {
        existing.lastVisit = invoice.issueDate.toISOString().split('T')[0];
      }
    } else {
      customerMap.set(customerId, {
        customerId,
        customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        totalSpent: invoice.total,
        transactionCount: 1,
        averageTransaction: 0,
        lastVisit: invoice.issueDate.toISOString().split('T')[0]
      });
    }
  }
  
  // Calculate averages and sort
  const topCustomers = Array.from(customerMap.values())
    .map(customer => ({
      ...customer,
      averageTransaction: customer.totalSpent / customer.transactionCount
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
  
  return topCustomers;
};

/**
 * Helper: Get week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
