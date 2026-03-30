/**
 * Customer Payment Method Routes
 * Routes for managing saved cards on file
 */

import { Router } from 'express';
import {
  getCustomerPaymentMethods,
  createCustomerPaymentMethod,
  updateCustomerPaymentMethod,
  deleteCustomerPaymentMethod,
  chargeCustomerPaymentMethod,
  getDefaultPaymentMethod,
} from '../controllers/customer-payment-method.controller.js';

const router = Router({ mergeParams: true });

// GET /api/customers/:customerId/payment-methods - List all saved payment methods
router.get('/', getCustomerPaymentMethods);

// GET /api/customers/:customerId/payment-methods/default - Get default payment method
router.get('/default', getDefaultPaymentMethod);

// POST /api/customers/:customerId/payment-methods - Save a new payment method
router.post('/', createCustomerPaymentMethod);

// PATCH /api/customers/:customerId/payment-methods/:methodId - Update payment method
router.patch('/:methodId', updateCustomerPaymentMethod);

// DELETE /api/customers/:customerId/payment-methods/:methodId - Delete payment method
router.delete('/:methodId', deleteCustomerPaymentMethod);

// POST /api/customers/:customerId/payment-methods/:methodId/charge - Charge saved card
router.post('/:methodId/charge', chargeCustomerPaymentMethod);

export default router;
