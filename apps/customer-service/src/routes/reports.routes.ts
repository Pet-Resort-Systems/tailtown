/**
 * Reports Routes
 * API endpoints for all reports
 */

import express from 'express';
import {
  getDailySales,
  getWeeklySales,
  getMonthlySales,
  getYTDSales,
  getTopCustomersReport,
  getMonthlyTax,
  getQuarterlyTax,
  getAnnualTax,
  getTaxBreakdownReport,
  getRevenue,
  getProfitLoss,
  getOutstanding,
  getRefunds,
  getReconciliation,
  getCustomerAcquisition,
  getCustomerRetention,
  getCustomerLifetimeValue,
  getCustomerDemographics,
  getInactiveCustomers,
  getStaffPerformance,
  getResourceUtilization,
  getBookingPatterns,
  getCapacityAnalysis,
} from '../controllers/reports';

const router = express.Router();

// ============================================================================
// Sales Reports
// ============================================================================

/**
 * @route   GET /api/reports/sales/daily
 * @desc    Get daily sales report
 * @query   date (YYYY-MM-DD)
 * @access  Private
 */
router.get('/sales/daily', getDailySales);

/**
 * @route   GET /api/reports/sales/weekly
 * @desc    Get weekly sales report
 * @query   startDate, endDate (YYYY-MM-DD)
 * @access  Private
 */
router.get('/sales/weekly', getWeeklySales);

/**
 * @route   GET /api/reports/sales/monthly
 * @desc    Get monthly sales report
 * @query   year, month
 * @access  Private
 */
router.get('/sales/monthly', getMonthlySales);

/**
 * @route   GET /api/reports/sales/ytd
 * @desc    Get year-to-date sales report
 * @query   year
 * @access  Private
 */
router.get('/sales/ytd', getYTDSales);

/**
 * @route   GET /api/reports/sales/top-customers
 * @desc    Get top customers by revenue
 * @query   startDate, endDate, limit (optional, default 10)
 * @access  Private
 */
router.get('/sales/top-customers', getTopCustomersReport);

// ============================================================================
// Tax Reports
// ============================================================================

/**
 * @route   GET /api/reports/tax/monthly
 * @desc    Get monthly tax report
 * @query   year, month
 * @access  Private
 */
router.get('/tax/monthly', getMonthlyTax);

/**
 * @route   GET /api/reports/tax/quarterly
 * @desc    Get quarterly tax report
 * @query   year, quarter (1-4)
 * @access  Private
 */
router.get('/tax/quarterly', getQuarterlyTax);

/**
 * @route   GET /api/reports/tax/annual
 * @desc    Get annual tax report
 * @query   year
 * @access  Private
 */
router.get('/tax/annual', getAnnualTax);

/**
 * @route   GET /api/reports/tax/breakdown
 * @desc    Get tax breakdown by category
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/tax/breakdown', getTaxBreakdownReport);

// ============================================================================
// Financial Reports
// ============================================================================

/**
 * @route   GET /api/reports/financial/revenue
 * @desc    Get revenue report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/financial/revenue', getRevenue);

/**
 * @route   GET /api/reports/financial/profit-loss
 * @desc    Get profit & loss report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/financial/profit-loss', getProfitLoss);

/**
 * @route   GET /api/reports/financial/outstanding
 * @desc    Get outstanding balances report
 * @access  Private
 */
router.get('/financial/outstanding', getOutstanding);

/**
 * @route   GET /api/reports/financial/refunds
 * @desc    Get refunds report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/financial/refunds', getRefunds);

/**
 * @route   GET /api/reports/financial/reconciliation
 * @desc    Get end-of-day reconciliation report
 * @query   date (YYYY-MM-DD, optional - defaults to today)
 * @access  Private
 */
router.get('/financial/reconciliation', getReconciliation);

// ============================================================================
// Customer Reports
// ============================================================================

/**
 * @route   GET /api/reports/customers/acquisition
 * @desc    Get customer acquisition report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/customers/acquisition', getCustomerAcquisition);

/**
 * @route   GET /api/reports/customers/retention
 * @desc    Get customer retention report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/customers/retention', getCustomerRetention);

/**
 * @route   GET /api/reports/customers/lifetime-value
 * @desc    Get customer lifetime value report
 * @query   limit (optional)
 * @access  Private
 */
router.get('/customers/lifetime-value', getCustomerLifetimeValue);

/**
 * @route   GET /api/reports/customers/demographics
 * @desc    Get customer demographics report
 * @access  Private
 */
router.get('/customers/demographics', getCustomerDemographics);

/**
 * @route   GET /api/reports/customers/inactive
 * @desc    Get inactive customers report
 * @query   days (optional, default 90)
 * @access  Private
 */
router.get('/customers/inactive', getInactiveCustomers);

// ============================================================================
// Operational Reports
// ============================================================================

/**
 * @route   GET /api/reports/operations/staff
 * @desc    Get staff performance report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/operations/staff', getStaffPerformance);

/**
 * @route   GET /api/reports/operations/resources
 * @desc    Get resource utilization report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/operations/resources', getResourceUtilization);

/**
 * @route   GET /api/reports/operations/bookings
 * @desc    Get booking patterns report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/operations/bookings', getBookingPatterns);

/**
 * @route   GET /api/reports/operations/capacity
 * @desc    Get capacity analysis report
 * @query   startDate, endDate
 * @access  Private
 */
router.get('/operations/capacity', getCapacityAnalysis);

export default router;
