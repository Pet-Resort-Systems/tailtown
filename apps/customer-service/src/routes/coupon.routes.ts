import express from 'express';
import {
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  getCouponStats,
  bulkCreateCoupons,
  getActiveCoupons,
  updateCouponStatus,
  getCustomerPermanentCouponForCheckout,
} from '../controllers/coupon.controller';

const router = express.Router();

// Public routes
router.get('/active', getActiveCoupons);
router.post('/validate', validateCoupon);

// Admin routes
router.get('/', getAllCoupons);
router.get('/:id', getCouponById);
router.get('/code/:code', getCouponByCode);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);
router.post('/apply', applyCoupon);
router.get('/:id/stats', getCouponStats);
router.post('/bulk', bulkCreateCoupons);
router.patch('/:id/status', updateCouponStatus);

// Customer permanent coupon for checkout
router.get(
  '/customer/:customerId/permanent',
  getCustomerPermanentCouponForCheckout
);

export default router;
