/**
 * Error Tracking Routes
 * 
 * API routes for error tracking and management
 */

import express from 'express';
import {
  getAllErrors,
  getErrorAnalytics,
  getErrorById,
  resolveError
} from '../controllers/error-tracking';

// Initialize router
const router = express.Router();

// Get all errors with optional filtering
router.get('/', getAllErrors);

// Get error analytics and statistics
router.get('/analytics', getErrorAnalytics);

// Get specific error by ID
router.get('/:id', getErrorById);

// Mark error as resolved
router.patch('/:id/resolve', resolveError);

export default router;
