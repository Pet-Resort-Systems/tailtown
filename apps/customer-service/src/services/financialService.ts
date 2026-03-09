/**
 * Financial Service
 * 
 * Single source of truth for all financial data in the application.
 * This service centralizes all financial calculations and queries to ensure
 * consistent reporting across all parts of the application.
 */

import { PrismaClient, InvoiceStatus, ReservationStatus, PaymentStatus } from '@prisma/client';
import { DateRange } from '../types/common';

const prisma = new PrismaClient();

// Standardized filter constants
const VALID_INVOICE_STATUSES = ['SENT', 'PAID', 'OVERDUE'] as InvoiceStatus[];
const INVALID_INVOICE_STATUSES = ['DRAFT', 'CANCELLED', 'REFUNDED'] as InvoiceStatus[];
const VALID_RESERVATION_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'] as ReservationStatus[];
const INVALID_RESERVATION_STATUSES = ['CANCELLED', 'NO_SHOW', 'PENDING'] as ReservationStatus[];
const VALID_PAYMENT_STATUSES = ['PAID'] as PaymentStatus[];
const INVALID_PAYMENT_STATUSES = ['PENDING', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as PaymentStatus[];

export interface FinancialSummary {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  outstandingInvoiceCount: number;
  avgInvoiceValue: number;
  taxCollected: number;
}

export interface ServiceRevenue {
  id: string;
  name: string;
  count: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface AddOnRevenue {
  id: string;
  name: string;
  count: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface CustomerRevenue {
  id: string;
  name: string;
  email: string;
  totalSpend: number;
  invoiceCount: number;
  serviceBreakdown: ServiceRevenue[];
  addOnBreakdown: AddOnRevenue[];
  addOnTotal: number;
}

/**
 * Get date filter for queries based on period string
 */
export function getDateRangeFilter(period: string, startDate?: string, endDate?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let start: Date;
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  switch (period) {
    case 'day':
      start = today;
      break;
      
    case 'week':
      // Start of current week (Sunday)
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      break;
      
    case 'month':
      // Start of current month
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
      
    case 'year':
      // Start of current year
      start = new Date(today.getFullYear(), 0, 1);
      break;
      
    case 'custom':
      // Custom date range
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        // Default to all-time if custom dates not provided
        start = new Date(0); // Unix epoch
      }
      break;
      
    case 'all':
    default:
      // All time
      start = new Date(0); // Unix epoch
      break;
  }
  
  return { gte: start, lte: end };
}

/**
 * Gets invoice data, consistently filtered by status and date range
 * CRITICAL: Must include tenantId to ensure proper data isolation
 */
export async function getInvoicesInRange(dateRange: DateRange, tenantId: string) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: dateRange,
      status: {
        notIn: INVALID_INVOICE_STATUSES
      }
    },
    include: {
      lineItems: true,
      payments: true,
      reservation: {
        include: {
          addOnServices: {
            include: {
              addOn: true
            }
          },
          service: true
        }
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
}

/**
 * Gets financial summary data for a date range
 */
export async function getFinancialSummary(dateRange: DateRange, tenantId: string): Promise<FinancialSummary> {
  const invoices = await getInvoicesInRange(dateRange, tenantId);
  
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  const outstandingInvoices = invoices.filter(inv => inv.status !== 'PAID');
  
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const taxCollected = invoices.reduce((sum, inv) => sum + inv.taxAmount, 0);
  
  return {
    totalRevenue,
    totalPaid,
    totalOutstanding,
    invoiceCount: invoices.length,
    paidInvoiceCount: paidInvoices.length,
    outstandingInvoiceCount: outstandingInvoices.length,
    avgInvoiceValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
    taxCollected
  };
}

/**
 * Gets revenue breakdown by service
 */
export async function getServiceRevenue(dateRange: DateRange, tenantId: string): Promise<ServiceRevenue[]> {
  const invoices = await getInvoicesInRange(dateRange, tenantId);
  
  const serviceMap = new Map<string, ServiceRevenue>();
  let importedRevenue = 0;
  let importedCount = 0;
  
  // Process invoices to extract service revenue
  for (const invoice of invoices) {
    if (invoice.reservation?.service) {
      const service = invoice.reservation.service;
      
      if (!serviceMap.has(service.id)) {
        serviceMap.set(service.id, {
          id: service.id,
          name: service.name,
          count: 0,
          revenue: 0,
          percentageOfTotal: 0
        });
      }
      
      // Calculate the base service revenue (excluding add-ons)
      // First, get the total of all known add-ons
      const addOnTotal = invoice.reservation.addOnServices?.reduce(
        (sum, addOn) => sum + addOn.price, 0
      ) || 0;
      
      // The service revenue is the invoice total minus add-ons
      const serviceRevenue = invoice.total - addOnTotal;
      
      const data = serviceMap.get(service.id)!;
      data.count += 1;
      data.revenue += serviceRevenue;
      serviceMap.set(service.id, data);
    } else {
      // Invoice without reservation - likely imported from external system
      // Add to "Historical Services" category
      importedRevenue += invoice.total;
      importedCount += 1;
    }
  }
  
  // Add imported services as a separate category if there's any
  if (importedRevenue > 0) {
    serviceMap.set('imported-services', {
      id: 'imported-services',
      name: 'Historical Services (Imported)',
      count: importedCount,
      revenue: importedRevenue,
      percentageOfTotal: 0
    });
  }
  
  // Convert map to array
  const serviceRevenueData = Array.from(serviceMap.values());
  
  // Calculate total revenue to determine percentages
  const totalRevenue = serviceRevenueData.reduce((sum, service) => sum + service.revenue, 0);
  
  // Calculate percentages
  if (totalRevenue > 0) {
    for (const service of serviceRevenueData) {
      service.percentageOfTotal = (service.revenue / totalRevenue) * 100;
    }
  }
  
  // Sort by revenue (highest first)
  return serviceRevenueData.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Gets revenue breakdown by add-on
 */
export async function getAddOnRevenue(dateRange: DateRange, tenantId: string): Promise<AddOnRevenue[]> {
  const invoices = await getInvoicesInRange(dateRange, tenantId);
  
  const addOnMap = new Map<string, AddOnRevenue>();
  
  // Process invoices to extract add-on revenue
  for (const invoice of invoices) {
    if (invoice.reservation?.addOnServices) {
      for (const addOnService of invoice.reservation.addOnServices) {
        const addOn = addOnService.addOn;
        
        if (!addOnMap.has(addOn.id)) {
          addOnMap.set(addOn.id, {
            id: addOn.id,
            name: addOn.name,
            count: 0,
            revenue: 0,
            percentageOfTotal: 0
          });
        }
        
        const data = addOnMap.get(addOn.id)!;
        data.count += 1;
        data.revenue += addOnService.price;
        addOnMap.set(addOn.id, data);
      }
    }
  }
  
  // Convert map to array
  const addOnRevenueData = Array.from(addOnMap.values());
  
  // Calculate total revenue to determine percentages
  const totalRevenue = addOnRevenueData.reduce((sum, addOn) => sum + addOn.revenue, 0);
  
  // Calculate percentages
  if (totalRevenue > 0) {
    for (const addOn of addOnRevenueData) {
      addOn.percentageOfTotal = (addOn.revenue / totalRevenue) * 100;
    }
  }
  
  // Sort by revenue (highest first)
  return addOnRevenueData.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Gets revenue breakdown by customer
 */
export async function getCustomerRevenue(dateRange: DateRange, tenantId: string): Promise<CustomerRevenue[]> {
  const invoices = await getInvoicesInRange(dateRange, tenantId);
  
  // Group invoices by customer
  const customerMap = new Map<string, {
    id: string;
    name: string;
    email: string;
    invoices: typeof invoices;
  }>();
  
  for (const invoice of invoices) {
    if (invoice.customer) {
      const customerId = invoice.customer.id;
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          id: customerId,
          name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
          email: invoice.customer.email,
          invoices: []
        });
      }
      
      const customerData = customerMap.get(customerId)!;
      customerData.invoices.push(invoice);
      customerMap.set(customerId, customerData);
    }
  }
  
  // Process customer data to calculate revenue
  const customerRevenueData: CustomerRevenue[] = [];
  
  for (const [_, customerData] of customerMap.entries()) {
    // Process services
    const serviceMap = new Map<string, ServiceRevenue>();
    
    // Process add-ons
    const addOnMap = new Map<string, AddOnRevenue>();
    
    let totalSpend = 0;
    
    for (const invoice of customerData.invoices) {
      totalSpend += invoice.total;
      
      // Process service
      if (invoice.reservation?.service) {
        const service = invoice.reservation.service;
        
        if (!serviceMap.has(service.id)) {
          serviceMap.set(service.id, {
            id: service.id,
            name: service.name,
            count: 0,
            revenue: 0,
            percentageOfTotal: 0
          });
        }
        
        // Calculate the base service revenue (excluding add-ons)
        const addOnTotal = invoice.reservation.addOnServices?.reduce(
          (sum, addOn) => sum + addOn.price, 0
        ) || 0;
        
        const serviceRevenue = invoice.total - addOnTotal;
        
        const data = serviceMap.get(service.id)!;
        data.count += 1;
        data.revenue += serviceRevenue;
        serviceMap.set(service.id, data);
      }
      
      // Process add-ons
      if (invoice.reservation?.addOnServices) {
        for (const addOnService of invoice.reservation.addOnServices) {
          const addOn = addOnService.addOn;
          
          if (!addOnMap.has(addOn.id)) {
            addOnMap.set(addOn.id, {
              id: addOn.id,
              name: addOn.name,
              count: 0,
              revenue: 0,
              percentageOfTotal: 0
            });
          }
          
          const data = addOnMap.get(addOn.id)!;
          data.count += 1;
          data.revenue += addOnService.price;
          addOnMap.set(addOn.id, data);
        }
      }
    }
    
    // Calculate service percentages
    const serviceRevenues = Array.from(serviceMap.values());
    const serviceTotal = serviceRevenues.reduce((sum, service) => sum + service.revenue, 0);
    
    if (serviceTotal > 0) {
      for (const service of serviceRevenues) {
        service.percentageOfTotal = (service.revenue / serviceTotal) * 100;
      }
    }
    
    // Calculate add-on percentages
    const addOnRevenues = Array.from(addOnMap.values());
    const addOnTotal = addOnRevenues.reduce((sum, addOn) => sum + addOn.revenue, 0);
    
    if (addOnTotal > 0) {
      for (const addOn of addOnRevenues) {
        addOn.percentageOfTotal = (addOn.revenue / addOnTotal) * 100;
      }
    }
    
    // Add customer data
    customerRevenueData.push({
      id: customerData.id,
      name: customerData.name,
      email: customerData.email,
      totalSpend,
      invoiceCount: customerData.invoices.length,
      serviceBreakdown: serviceRevenues.sort((a, b) => b.revenue - a.revenue),
      addOnBreakdown: addOnRevenues.sort((a, b) => b.revenue - a.revenue),
      addOnTotal
    });
  }
  
  // Sort by total spend (highest first)
  return customerRevenueData.sort((a, b) => b.totalSpend - a.totalSpend);
}

/**
 * Gets daily revenue for a date range
 */
export async function getDailyRevenue(dateRange: DateRange, tenantId: string): Promise<{date: string; revenue: number}[]> {
  const invoices = await getInvoicesInRange(dateRange, tenantId);
  
  // Group invoices by date
  const dailyRevenueMap = new Map<string, number>();
  
  for (const invoice of invoices) {
    const dateStr = invoice.issueDate.toISOString().split('T')[0];
    const currentTotal = dailyRevenueMap.get(dateStr) || 0;
    dailyRevenueMap.set(dateStr, currentTotal + invoice.total);
  }
  
  // Convert map to array
  const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([date, revenue]) => ({
    date,
    revenue
  }));
  
  // Sort by date (ascending)
  return dailyRevenue.sort((a, b) => a.date.localeCompare(b.date));
}

export default {
  getDateRangeFilter,
  getFinancialSummary,
  getServiceRevenue,
  getAddOnRevenue,
  getCustomerRevenue,
  getDailyRevenue,
  // Export constants
  VALID_INVOICE_STATUSES,
  INVALID_INVOICE_STATUSES,
  VALID_RESERVATION_STATUSES,
  INVALID_RESERVATION_STATUSES,
  VALID_PAYMENT_STATUSES,
  INVALID_PAYMENT_STATUSES
};
