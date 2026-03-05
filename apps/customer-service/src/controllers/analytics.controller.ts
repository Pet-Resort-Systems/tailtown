/**
 * Analytics Controller
 * 
 * Provides endpoints for analytics and reporting.
 * All financial calculations are now centralized through the financialService
 * to ensure consistent results across all parts of the application.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import financialService from '../services/financialService';

/**
 * Get sales data by service type
 * Supports filtering by time period (day, month, year, all-time)
 */
export const getSalesByService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'all', startDate, endDate } = req.query;
    const tenantId = (req as any).tenantId;
    
    // Get date range filter using the shared method
    const dateRange = financialService.getDateRangeFilter(
      period as string, 
      startDate as string, 
      endDate as string
    );
    
    // Get service revenue data from the financial service
    const serviceRevenue = await financialService.getServiceRevenue(dateRange, tenantId);
    
    // Calculate total revenue for services
    const totalRevenue = serviceRevenue.reduce((sum, service) => sum + service.revenue, 0);
    
    // Get total reservation count
    const reservations = await financialService.getFinancialSummary(dateRange, tenantId);
    
    res.status(200).json({
      status: 'success',
      data: {
        period: period as string,
        totalRevenue,
        services: serviceRevenue,
        totalBookings: reservations.invoiceCount
      }
    });
  } catch (error) {
    console.error('Error getting sales by service:', error);
    return next(new AppError('Error getting sales by service', 500));
  }
};

/**
 * Get sales data by add-on type
 * Supports filtering by time period (day, month, year, all-time)
 */
export const getSalesByAddOn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'all', startDate, endDate } = req.query;
    const tenantId = (req as any).tenantId;
    
    // Get date range filter using the shared method
    const dateRange = financialService.getDateRangeFilter(
      period as string, 
      startDate as string, 
      endDate as string
    );
    
    // Get add-on revenue data from the financial service
    const addOnRevenue = await financialService.getAddOnRevenue(dateRange, tenantId);
    
    // Calculate total revenue for add-ons
    const totalRevenue = addOnRevenue.reduce((sum, addOn) => sum + addOn.revenue, 0);
    
    // Total add-on count
    const totalAddOns = addOnRevenue.reduce((sum, addOn) => sum + addOn.count, 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        period: period as string,
        totalRevenue,
        addOns: addOnRevenue,
        totalAddOns
      }
    });
  } catch (error) {
    console.error('Error getting sales by add-on:', error);
    return next(new AppError('Error getting sales by add-on', 500));
  }
};

/**
 * Get customer value data (total spend, breakdown by service type)
 * Supports filtering by time period (day, month, year, all-time)
 */
export const getCustomerValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'all', startDate, endDate } = req.query;
    const tenantId = (req as any).tenantId;
    
    // Get date range filter using the shared method
    const dateRange = financialService.getDateRangeFilter(
      period as string, 
      startDate as string, 
      endDate as string
    );
    
    // Get customer revenue data from the financial service
    const customerRevenue = await financialService.getCustomerRevenue(dateRange, tenantId);
    
    res.status(200).json({
      status: 'success',
      results: customerRevenue.length,
      data: customerRevenue
    });
  } catch (error) {
    console.error('Error getting customer value data:', error);
    return next(new AppError('Error getting customer value data', 500));
  }
};

/**
 * Get summary analytics data for dashboard
 * Includes total revenue, service counts, customer counts
 * Supports filtering by time period (day, month, year, all-time)
 */
export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'all', startDate, endDate } = req.query;
    const tenantId = (req as any).tenantId;
    
    // Get date range filter using the shared method
    const dateRange = financialService.getDateRangeFilter(
      period as string, 
      startDate as string, 
      endDate as string
    );
    
    // Get financial summary from the financial service
    const financialSummary = await financialService.getFinancialSummary(dateRange, tenantId);
    
    // Get service revenue data (includes service counts)
    const serviceRevenue = await financialService.getServiceRevenue(dateRange, tenantId);
    
    // Convert service revenue to the format expected by the frontend
    const serviceData = serviceRevenue.map(service => ({
      id: service.id,
      name: service.name,
      count: service.count
    }));
    
    // Get add-on revenue data
    const addOnData = await financialService.getAddOnRevenue(dateRange, tenantId);
    
    // Calculate total add-on revenue
    const addOnRevenue = addOnData.reduce((sum, addOn) => sum + addOn.revenue, 0);
    
    // Get customer revenue data to get unique customer count 
    const customerRevenue = await financialService.getCustomerRevenue(dateRange, tenantId);
    
    res.status(200).json({
      status: 'success',
      data: {
        period: period as string,
        totalRevenue: financialSummary.totalRevenue,
        customerCount: customerRevenue.length,
        serviceData,
        addOnData,
        addOnRevenue,
        reservationCount: financialSummary.invoiceCount
      }
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    return next(new AppError('Error getting dashboard summary', 500));
  }
};

/**
 * Get detailed customer report for a specific customer
 * Includes transaction history, service breakdowns, etc.
 */
export const getCustomerReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { period = 'all', startDate, endDate } = req.query;
    const tenantId = (req as any).tenantId;
    
    // Get date range filter using the shared method
    const dateRange = financialService.getDateRangeFilter(
      period as string, 
      startDate as string, 
      endDate as string
    );
    
    // Get customer revenue data from the financial service
    const customersRevenue = await financialService.getCustomerRevenue(dateRange, tenantId);
    
    // Find the specific customer
    const customerData = customersRevenue.find(customer => customer.id === customerId);
    
    if (!customerData) {
      return next(new AppError('Customer not found or has no transactions in this period', 404));
    }
    
    // Get all invoices for this customer to extract transaction data
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        issueDate: dateRange,
        status: {
          notIn: financialService.INVALID_INVOICE_STATUSES
        }
      },
      include: {
        lineItems: true,
        reservation: {
          include: {
            service: true,
            addOnServices: {
              include: {
                addOn: true
              }
            }
          }
        }
      },
      orderBy: {
        issueDate: 'desc'
      }
    });
    
    // Format transactions
    const transactions = invoices.map(invoice => {
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.issueDate.toISOString().split('T')[0],
        total: invoice.total,
        status: invoice.status,
        serviceName: invoice.reservation?.service?.name || 'N/A',
        addOns: invoice.reservation?.addOnServices?.map(addon => ({
          name: addon.addOn.name,
          price: addon.price
        })) || []
      };
    });
    
    // Format customer basic info
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    });
    
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        customer: {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone || 'N/A'
        },
        period: period as string,
        totalSpend: customerData.totalSpend,
        invoiceCount: customerData.invoiceCount,
        serviceBreakdown: customerData.serviceBreakdown,
        addOnBreakdown: customerData.addOnBreakdown,
        addOnTotal: customerData.addOnTotal,
        transactions
      }
    });
  } catch (error) {
    console.error('Error getting customer report:', error);
    return next(new AppError('Error getting customer report', 500));
  }
};

/**
 * Helper function for date filters
 */
const getDateFilter = (period: string, startDate?: string, endDate?: string) => {
  // This is now provided by the financial service
  return financialService.getDateRangeFilter(period, startDate, endDate);
};

// Missing import for prisma client in this controller
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
