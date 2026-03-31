import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Get today's revenue
 * Returns the total revenue for today's reservations
 *
 * @route GET /api/reservations/revenue/today
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 * @returns {Object} Total revenue for today
 */
route.use('/revenue/today', async (req, res) => {
  const requestId = `revenue-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  logger.info(`Processing get today's revenue request`, { requestId });

  const isDev = process.env.NODE_ENV === 'development';
  const tenantId = req.tenantId || (isDev ? 'dev-tenant-001' : undefined);

  if (!tenantId) {
    logger.warn(`Missing tenant ID in request`, { requestId });
    throw AppError.authorizationError('Tenant ID is required');
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const startOfToday = new Date(year, month, day, 0, 0, 0, 0);
  const endOfToday = new Date(year, month, day, 23, 59, 59, 999);

  const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`;
  logger.info(
    `Calculating revenue for date: ${formattedDate}, using start: ${startOfToday.toISOString()} and end: ${endOfToday.toISOString()}`,
    { requestId }
  );

  try {
    const reservationCount = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.count({
          where: {
            startDate: {
              gte: startOfToday,
              lte: endOfToday,
            },
            status: {
              in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
            },
          },
        });
      },
      0,
      `Error counting today's reservations`,
      false
    );

    await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.findMany({
          where: {
            startDate: {
              gte: startOfToday,
              lte: endOfToday,
            },
            status: {
              in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
            },
          },
          select: {
            id: true,
          },
        });
      },
      [],
      `Error retrieving today's reservations`,
      false
    );

    const basePrice = 50;
    const totalRevenue = (reservationCount || 0) * basePrice;

    logger.info(
      `Calculated revenue: ${totalRevenue} from ${reservationCount} reservations`,
      { requestId }
    );

    logger.info(`Retrieved today's revenue data`, {
      requestId,
      reservationCount,
      totalRevenue,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        date: today.toISOString().split('T')[0],
        reservationCount: reservationCount || 0,
        totalRevenue,
        currency: 'USD',
      },
    });
  } catch (error: any) {
    logger.error(`Error retrieving today's revenue: ${error.message}`, {
      requestId,
      error: error.message,
      stack: error.stack,
    });

    throw AppError.serverError('Error retrieving revenue data', error);
  }
});
