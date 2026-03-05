/**
 * Tax Reports Controller
 *
 * Handles tax report endpoints:
 * - getMonthlyTax
 * - getQuarterlyTax
 * - getAnnualTax
 * - getTaxBreakdownReport
 */

import { Response, NextFunction } from "express";
import { AppError } from "../../middleware/error.middleware";
import { TenantRequest } from "../../middleware/tenant.middleware";
import {
  getMonthlyTaxReport,
  getQuarterlyTaxReport,
  getAnnualTaxReport,
  getTaxBreakdown,
} from "../../services/taxReportService";
import { logger } from "../../utils/logger";

/**
 * GET /api/reports/tax/monthly
 */
export const getMonthlyTax = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    const { year, month } = req.query;

    if (!year || !month) {
      return next(new AppError("year and month parameters are required", 400));
    }

    const report = await getMonthlyTaxReport(
      tenantId,
      parseInt(year as string),
      parseInt(month as string)
    );

    // Calculate average tax rate from the data
    const avgTaxRate =
      report.taxableRevenue > 0
        ? (report.taxCollected / report.taxableRevenue) * 100
        : 0;

    res.status(200).json({
      status: "success",
      data: {
        reportType: "tax_monthly",
        title: `Monthly Tax Report - ${report.monthName}`,
        generatedAt: new Date(),
        filters: { year, month },
        summary: {
          taxableRevenue: report.taxableRevenue,
          taxCollected: report.taxCollected,
          averageTaxRate: avgTaxRate,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error("Error generating monthly tax report", { error });
    return next(new AppError("Failed to generate monthly tax report", 500));
  }
};

/**
 * GET /api/reports/tax/quarterly
 */
export const getQuarterlyTax = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    const { year, quarter } = req.query;

    if (!year || !quarter) {
      return next(
        new AppError("year and quarter parameters are required", 400)
      );
    }

    const report = await getQuarterlyTaxReport(
      tenantId,
      parseInt(year as string),
      parseInt(quarter as string)
    );

    res.status(200).json({
      status: "success",
      data: {
        reportType: "tax_quarterly",
        title: `Quarterly Tax Report - ${report.quarterName}`,
        generatedAt: new Date(),
        filters: { year, quarter },
        summary: {
          taxableRevenue: report.taxableRevenue,
          taxCollected: report.taxCollected,
          averageTaxRate: report.averageTaxRate,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error("Error generating quarterly tax report", { error });
    return next(new AppError("Failed to generate quarterly tax report", 500));
  }
};

/**
 * GET /api/reports/tax/annual
 */
export const getAnnualTax = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    const { year } = req.query;

    if (!year) {
      return next(new AppError("year parameter is required", 400));
    }

    const report = await getAnnualTaxReport(tenantId, parseInt(year as string));

    res.status(200).json({
      status: "success",
      data: {
        reportType: "tax_annual",
        title: `Annual Tax Report - ${year}`,
        generatedAt: new Date(),
        filters: { year },
        summary: {
          taxableRevenue: report.taxableRevenue,
          taxCollected: report.taxCollected,
          averageTaxRate: report.averageTaxRate,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error("Error generating annual tax report", { error });
    return next(new AppError("Failed to generate annual tax report", 500));
  }
};

/**
 * GET /api/reports/tax/breakdown
 */
export const getTaxBreakdownReport = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== "production" && "dev");
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(
        new AppError("startDate and endDate parameters are required", 400)
      );
    }

    const report = await getTaxBreakdown(
      tenantId,
      startDate as string,
      endDate as string
    );

    const totalTaxable = report.reduce(
      (sum, item) => sum + item.taxableAmount,
      0
    );
    const totalTax = report.reduce((sum, item) => sum + item.taxAmount, 0);

    res.status(200).json({
      status: "success",
      data: {
        reportType: "tax_breakdown",
        title: `Tax Breakdown - ${startDate} to ${endDate}`,
        generatedAt: new Date(),
        filters: { startDate, endDate },
        summary: {
          taxableRevenue: totalTaxable,
          taxCollected: totalTax,
        },
        data: report,
      },
    });
  } catch (error) {
    logger.error("Error generating tax breakdown report", { error });
    return next(new AppError("Failed to generate tax breakdown report", 500));
  }
};
