import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { getTenantActivityLogs } from '../../services/reservation-activity.service.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * GET /api/reservations/activity/recent
 * Get recent activity logs for the tenant
 */
route.use('/activity/recent', async (req, res) => {
  const requestId = `recent-reservation-activity-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  logger.info(`Processing get recent reservation activity request`, {
    requestId,
  });

  const isDev = process.env.NODE_ENV === 'development';
  const tenantId = req.tenantId || (isDev ? 'dev-tenant-001' : undefined);

  if (!tenantId) {
    logger.warn(`Missing tenant ID in request`, { requestId });
    throw AppError.authorizationError('Tenant ID is required');
  }

  const parsedLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isNaN(parsedLimit) ? 100 : parsedLimit;
  const actorType = req.query.actorType as
    | 'CUSTOMER'
    | 'EMPLOYEE'
    | 'SYSTEM'
    | undefined;

  const activities = await getTenantActivityLogs(tenantId, limit, actorType);

  logger.info(`Retrieved recent reservation activity logs`, {
    requestId,
    activityCount: activities.length,
    actorType,
  });

  res.status(200).json({
    status: 'success',
    data: activities,
  });
});
