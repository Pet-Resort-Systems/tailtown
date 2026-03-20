/**
 * System Routes
 *
 * Routes for system-level operations like health checks and monitoring.
 * These endpoints are typically used by super admins and monitoring tools.
 */

import { Router } from 'express';
import {
  getSystemHealth,
  getSimpleHealth,
} from '../controllers/system/health.controller';
import {
  printKennelLabel,
  getAvailablePrinters,
  getPrinterStatus,
} from '../controllers/print.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/system/health
 * Get comprehensive system health metrics
 * Requires authentication (super admin only in production)
 */
router.get('/health', authenticate, getSystemHealth);

/**
 * GET /api/system/health/simple
 * Simple health check for load balancers
 * No authentication required
 */
router.get('/health/simple', getSimpleHealth);

/**
 * POST /api/system/print/kennel-label
 * Print a kennel label to the Zebra printer
 * No authentication required (local printer access)
 */
router.post('/print/kennel-label', authenticate, printKennelLabel);

/**
 * GET /api/system/print/printers
 * Get list of available printers
 */
router.get('/print/printers', authenticate, getAvailablePrinters);

/**
 * GET /api/system/print/printers/:printerName/status
 * Get printer status
 */
router.get(
  '/print/printers/:printerName/status',
  authenticate,
  getPrinterStatus
);

export { router as systemRoutes };
