/**
 * Financial Reports Controller
 *
 * Handles financial report endpoints:
 * - getRevenue
 * - getProfitLoss
 * - getOutstanding
 * - getRefunds
 */

import { Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error.middleware';
import { TenantRequest } from '../../middleware/tenant.middleware';
import {
  getRevenueReport,
  getProfitLossReport,
  getOutstandingBalances,
  getRefundsReport,
  getReconciliationReport,
} from '../../services/financialReportService';
import { logger } from '../../utils/logger';

/**
 * GET /api/reports/financial/revenue
 */
export const getRevenue = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(
        new AppError('startDate and endDate parameters are required', 400)
      );
    }

    const report = await getRevenueReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'financial_revenue',
        title: `Revenue Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          totalRevenue: report.totalRevenue,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating revenue report', { error });
    return next(new AppError('Failed to generate revenue report', 500));
  }
};

/**
 * GET /api/reports/financial/profit-loss
 */
export const getProfitLoss = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(
        new AppError('startDate and endDate parameters are required', 400)
      );
    }

    const report = await getProfitLossReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'financial_profit_loss',
        title: `Profit & Loss Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          revenue: report.revenue,
          netProfit: report.netProfit,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating P&L report', { error });
    return next(new AppError('Failed to generate P&L report', 500));
  }
};

/**
 * GET /api/reports/financial/outstanding
 */
export const getOutstanding = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

    const report = await getOutstandingBalances(tenantId);

    const totalOutstanding = report.reduce(
      (sum, item) => sum + item.amountDue,
      0
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'financial_outstanding',
        title: 'Outstanding Balances Report',
        generatedAt: new Date(),
        filters: {},
        summary: {
          totalOutstanding,
          totalAccounts: report.length,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating outstanding balances report', { error });
    return next(
      new AppError('Failed to generate outstanding balances report', 500)
    );
  }
};

/**
 * GET /api/reports/financial/refunds
 */
export const getRefunds = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(
        new AppError('startDate and endDate parameters are required', 400)
      );
    }

    const report = await getRefundsReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    const totalRefunds = report.reduce(
      (sum, item) => sum + item.refundAmount,
      0
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'financial_refunds',
        title: `Refunds Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          totalRefunds,
          refundCount: report.length,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating refunds report', { error });
    return next(new AppError('Failed to generate refunds report', 500));
  }
};

/**
 * GET /api/reports/financial/reconciliation
 */
export const getReconciliation = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { date } = req.query;

    // Default to today if no date provided
    const reportDate = date
      ? (date as string)
      : new Date().toISOString().split('T')[0];

    const report = await getReconciliationReport(tenantId, reportDate);

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'financial_reconciliation',
        title: `End-of-Day Reconciliation - ${reportDate}`,
        generatedAt: new Date(),
        filters: { date: reportDate },
        summary: report.summary,
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating reconciliation report', { error });
    return next(new AppError('Failed to generate reconciliation report', 500));
  }
};
