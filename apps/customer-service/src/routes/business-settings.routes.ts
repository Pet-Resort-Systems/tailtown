/**
 * Business Settings Routes
 *
 * Routes for managing business customization settings
 */

import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getBusinessSettings,
  uploadLogo,
  deleteLogo,
  uploadMiddleware,
} from '../controllers/business-settings.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get business settings
router.get('/', getBusinessSettings);

// Upload logo
router.post('/logo', uploadMiddleware, uploadLogo);

// Delete logo
router.delete('/logo', deleteLogo);

export default router;
