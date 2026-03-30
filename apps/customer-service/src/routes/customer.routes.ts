import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerPets,
  getCustomerInvoices,
  getCustomerPermanentCoupon,
  setCustomerPermanentCoupon,
  removeCustomerPermanentCoupon,
} from '../controllers/customer/index.js';
import customerPaymentMethodRoutes from './customer-payment-method.routes.js';

const router = Router();

// GET all customers
router.get('/', getAllCustomers);

// GET a single customer by ID
router.get('/:id', getCustomerById);

// GET all pets for a customer
router.get('/:id/pets', getCustomerPets);

// GET all invoices for a customer
router.get('/:id/invoices', getCustomerInvoices);

// POST create a new customer
router.post('/', createCustomer);

// PUT update a customer
router.put('/:id', updateCustomer);

// DELETE a customer
router.delete('/:id', deleteCustomer);

// Permanent discount coupon routes
router.get('/:id/permanent-coupon', getCustomerPermanentCoupon);
router.put('/:id/permanent-coupon', setCustomerPermanentCoupon);
router.delete('/:id/permanent-coupon', removeCustomerPermanentCoupon);

// Payment methods (card on file) routes
router.use('/:customerId/payment-methods', customerPaymentMethodRoutes);

export { router as customerRoutes };
