/**
 * Customer Reports Controller
 *
 * Handles customer report endpoints:
 * - getCustomerAcquisition
 * - getCustomerRetention
 * - getCustomerLifetimeValue
 * - getCustomerDemographics
 * - getInactiveCustomers
 */

import { type Response, type NextFunction } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import { type TenantRequest } from '../../middleware/tenant.middleware.js';
import {
  getCustomerAcquisitionReport,
  getCustomerRetentionReport,
  getCustomerLifetimeValueReport,
  getCustomerDemographicsReport,
  getInactiveCustomersReport,
} from '../../services/customerReportService.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../env.js';

/**
 * GET /api/reports/customers/acquisition
 */
export const getCustomerAcquisition = async (
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

    const report = await getCustomerAcquisitionReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    const totalNew = report.reduce((sum, item) => sum + item.newCustomers, 0);

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'customer_acquisition',
        title: `Customer Acquisition Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          totalNewCustomers: totalNew,
          periodCount: report.length,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating customer acquisition report', { error });
    return next(
      new AppError('Failed to generate customer acquisition report', 500)
    );
  }
};

/**
 * GET /api/reports/customers/retention
 */
export const getCustomerRetention = async (
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

    const report = await getCustomerRetentionReport(
      tenantId,
      startDate as string,
      endDate as string
    );
    const retentionData = report[0] || {
      retentionRate: 0,
      returningCustomers: 0,
      totalCustomers: 0,
    };

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'customer_retention',
        title: `Customer Retention Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          retentionRate: retentionData.retentionRate,
          returningCustomers: retentionData.returningCustomers,
          totalCustomers: retentionData.totalCustomers,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating customer retention report', { error });
    return next(
      new AppError('Failed to generate customer retention report', 500)
    );
  }
};

/**
 * GET /api/reports/customers/lifetime-value
 */
export const getCustomerLifetimeValue = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const limit = parseInt(req.query.limit as string) || 50;

    const report = await getCustomerLifetimeValueReport(tenantId, limit);

    const totalLTV = report.reduce((sum, item) => sum + item.lifetimeValue, 0);
    const avgLTV = report.length > 0 ? totalLTV / report.length : 0;

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'customer_lifetime_value',
        title: 'Customer Lifetime Value Report',
        generatedAt: new Date(),
        filters: { limit },
        summary: {
          totalCustomers: report.length,
          totalLifetimeValue: totalLTV,
          averageLifetimeValue: avgLTV,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating customer lifetime value report', { error });
    return next(
      new AppError('Failed to generate customer lifetime value report', 500)
    );
  }
};

/**
 * GET /api/reports/customers/demographics
 */
export const getCustomerDemographics = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');

    const report = await getCustomerDemographicsReport(tenantId);

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'customer_demographics',
        title: 'Customer Demographics Report',
        generatedAt: new Date(),
        filters: {},
        summary: {
          totalCustomers: report.totalCustomers,
          locationCount: report.byLocation.length,
          petTypeCount: report.byPetType.length,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating customer demographics report', { error });
    return next(
      new AppError('Failed to generate customer demographics report', 500)
    );
  }
};

/**
 * GET /api/reports/customers/inactive
 */
export const getInactiveCustomers = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const days = parseInt(req.query.days as string) || 90;

    const report = await getInactiveCustomersReport(tenantId, days);

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'customer_inactive',
        title: `Inactive Customers Report - ${days} days`,
        generatedAt: new Date(),
        filters: { days },
        summary: {
          inactiveCount: report.length,
          daysThreshold: days,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating inactive customers report', { error });
    return next(
      new AppError('Failed to generate inactive customers report', 500)
    );
  }
};
