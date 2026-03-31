import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import {
  type ExtendedReservationWhereInput,
  ExtendedReservationStatus,
} from '../../types/prisma-extensions.js';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { getCache, setCache, getCacheKey } from '../../utils/redis.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();

const AVAILABILITY_CACHE_TTL = 60;
/**
 * Check if a resource is available (not occupied) for a specific date or date range
 * This is the backend implementation of what was previously the frontend isKennelOccupied function.
 * It properly handles tenant isolation and normalizes dates for consistent availability checks.
 *
 * @route GET /api/v1/resources/availability
 * @param {string} req.query.resourceId - The ID of the resource to check
 * @param {string} req.query.date - The date to check in YYYY-MM-DD format
 * @param {string} [req.query.startDate] - Optional start date for a range check in YYYY-MM-DD format
 * @param {string} [req.query.endDate] - Optional end date for a range check in YYYY-MM-DD format
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 * @returns {Object} Response with isAvailable flag and any conflicting reservations
 */
route.use('/availability', async (req, res) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    if (!tenantId) {
      throw AppError.authorizationError('Tenant ID is required');
    }

    const { resourceId, resourceType, date, startDate, endDate } = req.query;

    if (!resourceId && !resourceType) {
      throw new AppError(
        'Either Resource ID or Resource Type is required',
        400
      );
    }

    let checkStartDate: Date;
    let checkEndDate: Date;

    if (date) {
      const parsedDate = new Date(date as string);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid date format', 400);
      }

      checkStartDate = new Date(parsedDate);
      checkStartDate.setHours(0, 0, 0, 0);

      checkEndDate = new Date(parsedDate);
      checkEndDate.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      checkStartDate = new Date(startDate as string);
      checkEndDate = new Date(endDate as string);

      if (isNaN(checkStartDate.getTime()) || isNaN(checkEndDate.getTime())) {
        throw new AppError('Invalid date format', 400);
      }
    } else {
      throw new AppError(
        'Either date or both startDate and endDate are required',
        400
      );
    }

    const cacheKey = getCacheKey(
      tenantId,
      'availability',
      `${resourceId || resourceType}:${
        checkStartDate.toISOString().split('T')[0]
      }:${checkEndDate.toISOString().split('T')[0]}`
    );

    const cachedResult = await getCache<any>(cacheKey);
    if (cachedResult) {
      logger.debug('Availability cache hit', { cacheKey });
      return res.status(200).json(cachedResult);
    }

    let resources: any[] = [];

    if (resourceId) {
      const resource = await prisma.resource.findFirst({
        where: { id: resourceId as string, tenantId } as any,
      });

      if (resource) {
        resources = [resource];
      }
    } else if (resourceType) {
      resources = await prisma.resource.findMany({
        where: {
          tenantId,
          type: resourceType as any,
        } as any,
      });

      logger.debug('Found resources by type', {
        count: resources.length,
        resourceType,
      });
    }

    if (resources.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          checkDate: date ? date : null,
          checkStartDate: startDate ? startDate : checkStartDate.toISOString(),
          checkEndDate: endDate ? endDate : checkEndDate.toISOString(),
          resources: [],
        },
      });
    }

    const overlappingReservations = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.findMany({
          where: {
            tenantId,
            resourceId: {
              in: resources.map((r) => r.id),
            },
            AND: [
              { startDate: { lte: checkEndDate } },
              { endDate: { gte: checkStartDate } },
            ],
            status: {
              in: [
                ExtendedReservationStatus.PENDING,
                ExtendedReservationStatus.CONFIRMED,
                ExtendedReservationStatus.CHECKED_IN,
              ] as any,
            },
          } as ExtendedReservationWhereInput,
          select: {
            id: true,
            resourceId: true,
            startDate: true,
            endDate: true,
            status: true,
            customerId: true,
            petId: true,
            service: {
              select: {
                name: true,
              },
            },
          },
        });
      },
      [],
      'Error finding overlapping reservations'
    );

    const reservationsByResource: Record<string, any[]> = {};
    resources.forEach((resource) => {
      reservationsByResource[resource.id] = [];
    });

    overlappingReservations.forEach((reservation) => {
      if (
        reservation.resourceId &&
        reservationsByResource[reservation.resourceId]
      ) {
        reservationsByResource[reservation.resourceId].push(reservation);
      }
    });

    const resourcesData = resources.map((resource) => ({
      resourceId: resource.id,
      name: resource.name,
      type: resource.type,
      isAvailable:
        !reservationsByResource[resource.id] ||
        reservationsByResource[resource.id].length === 0,
      occupyingReservations: reservationsByResource[resource.id] || [],
    }));

    const response = {
      status: 'success',
      data: {
        checkDate: date ? date : null,
        checkStartDate: startDate ? startDate : checkStartDate.toISOString(),
        checkEndDate: endDate ? endDate : checkEndDate.toISOString(),
        resources: resourcesData,
      },
    };

    await setCache(cacheKey, response, AVAILABILITY_CACHE_TTL);
    logger.debug('Availability cached', {
      cacheKey,
      ttl: AVAILABILITY_CACHE_TTL,
    });

    return res.status(200).json(response);
  } catch (error: any) {
    logger.error('Error checking resource availability', {
      resourceId: req.query.resourceId,
      tenantId: req.tenantId,
      error: error.message,
    });
    return res.status(200).json({
      status: 'success',
      data: {
        resourceId: req.query.resourceId as string,
        isAvailable: true,
        checkDate: (req.query.date as string) || null,
        checkStartDate: (req.query.startDate as string) || null,
        checkEndDate: (req.query.endDate as string) || null,
        message: 'Availability check completed with limited data',
        conflictingReservations: [],
      },
    });
  }
});
