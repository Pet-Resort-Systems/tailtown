/**
 * Payment Routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import {
  authorizePayment,
  capturePayment,
  refundPayment,
  voidPayment,
  inquireTransaction,
  getTestCards,
  chargeToken,
} from '../controllers/payment.controller.js';

const router: ExpressRouter = Router();

/**
 * @route   POST /api/payments/authorize
 * @desc    Authorize a payment
 * @access  Private
 */
router.post('/authorize', authorizePayment);

/**
 * @route   POST /api/payments/capture
 * @desc    Capture a previously authorized payment
 * @access  Private
 */
router.post('/capture', capturePayment);

/**
 * @route   POST /api/payments/refund
 * @desc    Refund a payment
 * @access  Private
 */
router.post('/refund', refundPayment);

/**
 * @route   POST /api/payments/void
 * @desc    Void a payment
 * @access  Private
 */
router.post('/void', voidPayment);

/**
 * @route   POST /api/payments/charge-token
 * @desc    Charge a saved card token (card on file)
 * @access  Private
 */
router.post('/charge-token', chargeToken);

/**
 * @route   GET /api/payments/inquire/:retref
 * @desc    Inquire about a transaction
 * @access  Private
 */
router.get('/inquire/:retref', inquireTransaction);

/**
 * @route   GET /api/payments/test-cards
 * @desc    Get test card numbers (development only)
 * @access  Public
 */
router.get('/test-cards', getTestCards);

export default router;
