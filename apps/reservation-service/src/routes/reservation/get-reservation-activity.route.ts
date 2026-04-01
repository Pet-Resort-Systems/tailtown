import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { getReservationActivityLogs } from '../../services/reservation-activity.service.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * GET /api/reservations/:id/activity
 * Get activity logs for a specific reservation
 */
route.use('/:id/activity', async (req, res) => {
  const requestId = `reservation-activity-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  logger.info(
    `Processing get reservation activity request for ID: ${req.params.id}`,
    { requestId }
  );

  const isDev = process.env.NODE_ENV === 'development';
  const tenantId = req.tenantId || (isDev ? 'dev-tenant-001' : undefined);

  if (!tenantId) {
    logger.warn(`Missing tenant ID in request`, { requestId });
    throw AppError.authorizationError('Tenant ID is required');
  }

  const { id: reservationId } = req.params;
  if (!reservationId) {
    logger.warn(`Missing reservation ID in request`, { requestId });
    throw AppError.validationError('Reservation ID is required');
  }

  const parsedLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isNaN(parsedLimit) ? 50 : parsedLimit;
  const activities = await getReservationActivityLogs(
    tenantId,
    reservationId,
    limit
  );

  logger.info(
    `Retrieved reservation activity logs for reservation: ${reservationId}`,
    {
      requestId,
      activityCount: activities.length,
    }
  );

  res.status(200).json({
    status: 'success',
    data: activities,
  });
});
