import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';

const router = Router();

// Get all invoices for a customer
router.get('/customer/:customerId', invoiceController.getCustomerInvoices);

// Get a single invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Create a new invoice
router.post('/', invoiceController.createInvoice);

// Update an invoice
router.patch('/:id', invoiceController.updateInvoice);

// Get customer account balance
router.get('/balance/:customerId', invoiceController.getCustomerAccountBalance);

export default router;
