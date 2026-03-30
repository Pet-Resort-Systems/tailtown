/**
 * API Metrics Routes
 *
 * Provides endpoints for viewing API analytics and metrics.
 * Requires super admin or tenant admin authentication.
 */

import { Router, type Request, type Response } from 'express';
import {
  getApiMetrics,
  getGlobalApiMetrics,
} from '../middleware/apiGateway.middleware.js';
import {
  authenticate,
  requireTenantAdmin,
  requireSuperAdmin,
} from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenant.middleware.js';

const router = Router();

/**
 * GET /api/metrics
 * Get API metrics for the current tenant
 * Requires tenant admin authentication
 */
router.get(
  '/',
  requireTenant,
  authenticate,
  requireTenantAdmin,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const date = req.query.date as string;

      const metrics = await getApiMetrics(tenantId, date);

      res.json({
        status: 'success',
        data: metrics,
      });
    } catch (error: any) {
      console.error('[API Metrics] Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve API metrics',
      });
    }
  }
);

/**
 * GET /api/metrics/global
 * Get global API metrics across all tenants
 * Requires super admin authentication
 */
router.get(
  '/global',
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string;

      const metrics = await getGlobalApiMetrics(date);

      res.json({
        status: 'success',
        data: metrics,
      });
    } catch (error: any) {
      console.error('[API Metrics] Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve global API metrics',
      });
    }
  }
);

/**
 * GET /api/metrics/health
 * Get API health status (public endpoint for monitoring)
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

export default router;
