/**
 * Reservation Activity Log Routes
 *
 * API endpoints for viewing reservation activity history
 */

import { Router } from 'express';
import { type TenantRequest } from '../types/request.js';
import { type Response, type NextFunction } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';
import { catchAsync } from '../middleware/catchAsync.js';
import { AppError } from '../utils/service.js';
import {
  getReservationActivityLogs,
  getTenantActivityLogs,
} from '../services/reservation-activity.service.js';

const router = Router();

/**
 * GET /api/reservations/:id/activity
 * Get activity logs for a specific reservation
 */
router.get(
  '/:id/activity',
  catchAsync(async (req: TenantRequest, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId || 'dev';
    const reservationId = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Reservation ID is required'
    );
    const limit = parseInt(req.query.limit as string) || 50;

    const activities = await getReservationActivityLogs(
      tenantId,
      reservationId,
      limit
    );

    res.json({
      status: 'success',
      data: activities,
    });
  })
);

/**
 * GET /api/reservations/activity/recent
 * Get recent activity logs for the tenant
 */
router.get(
  '/activity/recent',
  catchAsync(async (req: TenantRequest, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId || 'dev';
    const limit = parseInt(req.query.limit as string) || 100;
    const actorType = req.query.actorType as
      | 'CUSTOMER'
      | 'EMPLOYEE'
      | 'SYSTEM'
      | undefined;

    const activities = await getTenantActivityLogs(tenantId, limit, actorType);

    res.json({
      status: 'success',
      data: activities,
    });
  })
);

export default router;
