/**
 * Operations Reports Controller
 *
 * Handles operational report endpoints:
 * - getStaffPerformance
 * - getResourceUtilization
 * - getBookingPatterns
 * - getCapacityAnalysis
 */

import { type Response, type NextFunction } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import { type TenantRequest } from '../../middleware/tenant.middleware.js';
import {
  getStaffPerformanceReport,
  getResourceUtilizationReport,
  getBookingPatternsReport,
  getCapacityAnalysisReport,
} from '../../services/operationalReportService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/reports/operations/staff
 */
export const getStaffPerformance = async (
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

    const report = await getStaffPerformanceReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    const totalRevenue = report.reduce((sum, item) => sum + item.revenue, 0);
    const totalServices = report.reduce(
      (sum, item) => sum + item.servicesCompleted,
      0
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'operations_staff',
        title: `Staff Performance Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          totalStaff: report.length,
          totalRevenue,
          totalServices,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating staff performance report', { error });
    return next(
      new AppError('Failed to generate staff performance report', 500)
    );
  }
};

/**
 * GET /api/reports/operations/resources
 */
export const getResourceUtilization = async (
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

    const report = await getResourceUtilizationReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    const avgUtilization =
      report.length > 0
        ? report.reduce((sum, item) => sum + item.utilizationRate, 0) /
          report.length
        : 0;

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'operations_resources',
        title: `Resource Utilization Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          totalResources: report.length,
          averageUtilization: avgUtilization,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating resource utilization report', { error });
    return next(
      new AppError('Failed to generate resource utilization report', 500)
    );
  }
};

/**
 * GET /api/reports/operations/bookings
 */
export const getBookingPatterns = async (
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

    const report = await getBookingPatternsReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    const totalBookings = report.reduce(
      (sum, item) => sum + item.bookingCount,
      0
    );

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'operations_bookings',
        title: `Booking Patterns Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          totalBookings,
          patternsAnalyzed: report.length,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating booking patterns report', { error });
    return next(
      new AppError('Failed to generate booking patterns report', 500)
    );
  }
};

/**
 * GET /api/reports/operations/capacity
 */
export const getCapacityAnalysis = async (
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

    const report = await getCapacityAnalysisReport(
      tenantId,
      startDate as string,
      endDate as string
    );

    const avgCapacity =
      report.length > 0
        ? report.reduce((sum, item) => sum + item.utilizationRate, 0) /
          report.length
        : 0;

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'operations_capacity',
        title: `Capacity Analysis Report - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          periodsAnalyzed: report.length,
          averageCapacity: avgCapacity,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error('Error generating capacity analysis report', { error });
    return next(
      new AppError('Failed to generate capacity analysis report', 500)
    );
  }
};
