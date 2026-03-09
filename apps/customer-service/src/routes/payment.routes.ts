import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// Get all payments for a customer
router.get('/customer/:customerId', paymentController.getCustomerPayments);

// Get a single payment by ID
router.get('/:id', paymentController.getPaymentById);

// Create a new payment
router.post('/', paymentController.createPayment);

// Record store credit for a customer
router.post('/store-credit', paymentController.recordStoreCredit);

// Apply store credit to an invoice
router.post('/apply-credit', paymentController.applyStoreCredit);

export default router;
