import { env } from '../../env.js';
/**
 * Sales Reports Controller
 *
 * Handles sales report endpoints:
 * - getDailySales
 * - getWeeklySales
 * - getMonthlySales
 * - getYTDSales
 * - getTopCustomersReport
 */

import { type Response, type NextFunction } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import { type TenantRequest } from '../../middleware/tenant.middleware.js';
import {
  getDailySalesReport,
  getWeeklySalesReport,
  getMonthlySalesReport,
  getYTDSalesReport,
  getTopCustomers,
} from '../../services/salesReportService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/reports/sales/daily
 */
export const getDailySales = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const { date } = req.query;

    if (!date) {
      return next(new AppError('Date parameter is required', 400));
    }

    const report = await getDailySalesReport(tenantId, date as string);

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'sales_daily',
        title: `Daily Sales Report - ${date}`,
        generatedAt: new Date(),
        filters: { date },
        summary: {
          totalRevenue: report.totalSales,
          totalTransactions: report.transactionCount,
          averageTransaction: report.averageTransaction,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating daily sales report', { error });
    return next(new AppError('Failed to generate daily sales report', 500));
  }
};

/**
 * GET /api/reports/sales/weekly
 */
export const getWeeklySales = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(
        new AppError('startDate and endDate parameters are required', 400)
      );
    }

    const report = await getWeeklySalesReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'sales_weekly',
        title: `Weekly Sales Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          totalRevenue: report.totalSales,
          totalTransactions: report.transactionCount,
          averageTransaction: report.averageTransaction,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating weekly sales report', { error });
    return next(new AppError('Failed to generate weekly sales report', 500));
  }
};

/**
 * GET /api/reports/sales/monthly
 */
export const getMonthlySales = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const { year, month } = req.query;

    if (!year || !month) {
      return next(new AppError('year and month parameters are required', 400));
    }

    const report = await getMonthlySalesReport(
      tenantId,
      parseInt(year as string),
      parseInt(month as string)
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'sales_monthly',
        title: `Monthly Sales Report - ${report.monthName}`,
        generatedAt: new Date(),
        filters: { year, month },
        summary: {
          totalRevenue: report.totalSales,
          totalTransactions: report.transactionCount,
          averageTransaction: report.averageTransaction,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating monthly sales report', { error });
    return next(new AppError('Failed to generate monthly sales report', 500));
  }
};

/**
 * GET /api/reports/sales/ytd
 */
export const getYTDSales = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const { year } = req.query;

    const targetYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();
    const report = await getYTDSalesReport(tenantId, targetYear);

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'sales_ytd',
        title: `Year-to-Date Sales Report - ${targetYear}`,
        generatedAt: new Date(),
        filters: { year: targetYear },
        summary: {
          totalRevenue: report.totalSales,
          totalTransactions: report.transactionCount,
          averageTransaction: report.averageTransaction,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating YTD sales report', { error });
    return next(new AppError('Failed to generate YTD sales report', 500));
  }
};

/**
 * GET /api/reports/sales/top-customers
 */
export const getTopCustomersReport = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const { startDate, endDate, limit } = req.query;

    if (!startDate || !endDate) {
      return next(
        new AppError('startDate and endDate parameters are required', 400)
      );
    }

    const report = await getTopCustomers(
      tenantId,
      startDate as string,
      endDate as string,
      limit ? parseInt(limit as string) : 10
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'top_customers',
        title: `Top Customers Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate, limit: limit || 10 },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating top customers report', { error });
    return next(new AppError('Failed to generate top customers report', 500));
  }
};
