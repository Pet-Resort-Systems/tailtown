import express from 'express';
import * as analyticsController from '../controllers/analytics.controller';

const router = express.Router();

/**
 * @route   GET /api/analytics/sales/services
 * @desc    Get sales data by service type
 * @access  Private
 * @query   period - time period (day, week, month, year, all, custom)
 * @query   startDate - start date for custom period (YYYY-MM-DD)
 * @query   endDate - end date for custom period (YYYY-MM-DD)
 */
router.get('/sales/services', analyticsController.getSalesByService);

/**
 * @route   GET /api/analytics/sales/addons
 * @desc    Get sales data by add-on type
 * @access  Private
 * @query   period - time period (day, week, month, year, all, custom)
 * @query   startDate - start date for custom period (YYYY-MM-DD)
 * @query   endDate - end date for custom period (YYYY-MM-DD)
 */
router.get('/sales/addons', analyticsController.getSalesByAddOn);

/**
 * @route   GET /api/analytics/customers/value
 * @desc    Get customer value data (total spend, breakdown by service type)
 * @access  Private
 * @query   period - time period (day, week, month, year, all, custom)
 * @query   startDate - start date for custom period (YYYY-MM-DD)
 * @query   endDate - end date for custom period (YYYY-MM-DD)
 */
router.get('/customers/value', analyticsController.getCustomerValue);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get summary analytics data for dashboard
 * @access  Private
 * @query   period - time period (day, week, month, year, all, custom)
 * @query   startDate - start date for custom period (YYYY-MM-DD)
 * @query   endDate - end date for custom period (YYYY-MM-DD)
 */
router.get('/dashboard', analyticsController.getDashboardSummary);

/**
 * @route   GET /api/analytics/customers/:customerId
 * @desc    Get detailed customer report for a specific customer
 * @access  Private
 * @param   customerId - ID of the customer
 * @query   period - time period (day, week, month, year, all, custom)
 * @query   startDate - start date for custom period (YYYY-MM-DD)
 * @query   endDate - end date for custom period (YYYY-MM-DD)
 */
router.get('/customers/:customerId', analyticsController.getCustomerReport);

export default router;
