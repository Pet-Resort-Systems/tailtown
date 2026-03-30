/**
 * Customer Authentication Routes
 *
 * Public routes for customer portal authentication
 * These routes don't require staff authentication
 */

import { Router } from 'express';
import {
  customerLogin,
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
  checkPasswordStatus,
} from '../controllers/customer-auth.controller.js';

const router = Router();

// Login with email/password
router.post('/login', customerLogin);

// Request password reset (sends email)
router.post('/forgot-password', requestPasswordReset);

// Reset password using token
router.post('/reset-password', resetPassword);

// Verify reset token is valid
router.get('/verify-token', verifyResetToken);

// Check if customer has password set
router.get('/check-password', checkPasswordStatus);

export default router;
