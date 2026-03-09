import express from 'express';
import {
  getDashboardSummary,
  getSalesByService,
  getSalesByAddOn,
  getCustomerValue,
  getCustomerReport
} from '../controllers/analytics.controller';

const router = express.Router();

/**
 * @route   GET /api/analytics/sales/services
 * @desc    Get sales data by service type
 */
router.get('/sales/services', getSalesByService);

/**
 * @route   GET /api/analytics/sales/addons
 * @desc    Get sales data by add-on type
 */
router.get('/sales/addons', getSalesByAddOn);

/**
 * @route   GET /api/analytics/customers/value
 * @desc    Get customer value data
 */
router.get('/customers/value', getCustomerValue);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get summary analytics data for dashboard
 */
router.get('/dashboard', getDashboardSummary);

/**
 * @route   GET /api/analytics/customers/:customerId
 * @desc    Get detailed customer report for a specific customer
 */
router.get('/customers/:customerId', getCustomerReport);

export default router;
