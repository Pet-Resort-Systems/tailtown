import { Router } from 'express';
import {
  // Package management (admin settings)
  getPassPackages,
  createPassPackage,
  updatePassPackage,
  deletePassPackage,
  // Customer pass management
  getCustomerPasses,
  purchasePass,
  redeemPass,
  autoRedeemPass,
  reverseRedemption,
  checkAvailablePasses,
} from '../controllers/daycare-pass.controller';

const router = Router();

// ============================================
// PASS PACKAGE ROUTES (Admin/Settings)
// ============================================

// GET /api/daycare-passes/packages - Get all packages for tenant
router.get('/packages', getPassPackages);

// POST /api/daycare-passes/packages - Create new package
router.post('/packages', createPassPackage);

// PATCH /api/daycare-passes/packages/:id - Update package
router.patch('/packages/:id', updatePassPackage);

// DELETE /api/daycare-passes/packages/:id - Deactivate package
router.delete('/packages/:id', deletePassPackage);

// ============================================
// CUSTOMER PASS ROUTES
// ============================================

// GET /api/daycare-passes/customer/:customerId - Get customer's passes
router.get('/customer/:customerId', getCustomerPasses);

// GET /api/daycare-passes/check/:customerId - Quick check for available passes
router.get('/check/:customerId', checkAvailablePasses);

// POST /api/daycare-passes/purchase - Purchase a pass for customer
router.post('/purchase', purchasePass);

// POST /api/daycare-passes/auto-redeem - Auto-select and redeem best pass for customer
router.post('/auto-redeem', autoRedeemPass);

// POST /api/daycare-passes/:passId/redeem - Redeem one pass
router.post('/:passId/redeem', redeemPass);

// POST /api/daycare-passes/redemptions/:redemptionId/reverse - Reverse a redemption
router.post('/redemptions/:redemptionId/reverse', reverseRedemption);

export default router;
