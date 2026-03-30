/**
 * Onboarding Routes
 *
 * Public routes for new tenant setup wizard.
 * No authentication required - these are for new signups.
 */

import { Router } from 'express';
import {
  completeTenantOnboarding,
  validateOnboardingData,
} from '../controllers/onboarding.controller.js';

const router = Router();

// Validate wizard data before final submission
router.post('/validate', validateOnboardingData);

// Complete onboarding - creates tenant and all related records
router.post('/complete', completeTenantOnboarding);

export default router;
