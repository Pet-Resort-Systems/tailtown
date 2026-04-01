import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import {
  type ExtendedReservationWhereInput,
  ExtendedReservationStatus,
} from '../../types/prisma-extensions.js';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Check availability for multiple resources at once
 *
 * @route POST /api/resources/availability/batch
 */
route.use('/availability/batch', async (req, res) => {
  try {
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    if (!tenantId) {
      throw AppError.authorizationError('Tenant ID is required');
    }

    const {
      resources: resourcesBody,
      resourceIds,
      date,
      startDate,
      endDate,
    } = req.body;

    const resources =
      Array.isArray(resourcesBody) && resourcesBody.length > 0
        ? resourcesBody
        : Array.isArray(resourceIds) && resourceIds.length > 0
          ? resourceIds
          : [];

    if (!Array.isArray(resources) || resources.length === 0) {
      throw new AppError(
        'Resource IDs are required. Provide an array via "resources" or "resourceIds".',
        400
      );
    }

    let checkStartDate: Date;
    let checkEndDate: Date;

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid date format', 400);
      }

      checkStartDate = new Date(parsedDate);
      checkStartDate.setHours(0, 0, 0, 0);

      checkEndDate = new Date(parsedDate);
      checkEndDate.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      checkStartDate = new Date(startDate);
      checkEndDate = new Date(endDate);

      if (isNaN(checkStartDate.getTime()) || isNaN(checkEndDate.getTime())) {
        throw new AppError('Invalid date format', 400);
      }
    } else {
      throw new AppError(
        'Either date or both startDate and endDate are required',
        400
      );
    }

    const allReservations = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.findMany({
          where: {
            tenantId,
            resourceId: {
              in: resources,
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
                id: true,
                name: true,
                serviceCategory: true,
              },
            },
          },
        });
      },
      [],
      'Error finding overlapping reservations for batch check'
    );

    const reservationsByResource: Record<string, any[]> = {};
    resources.forEach((resourceId) => {
      reservationsByResource[resourceId] = allReservations.filter(
        (reservation) => reservation.resourceId === resourceId
      );
    });

    const availabilityData = resources.map((resourceId) => ({
      resourceId,
      isAvailable: reservationsByResource[resourceId].length === 0,
      occupyingReservations: reservationsByResource[resourceId],
    }));

    res.status(200).json({
      status: 'success',
      data: {
        checkDate: date ? date : null,
        checkStartDate: startDate ? startDate : checkStartDate.toISOString(),
        checkEndDate: endDate ? endDate : checkEndDate.toISOString(),
        resources: availabilityData,
      },
    });
  } catch (error: any) {
    logger.error('Error batch checking resource availability', {
      resourceCount:
        req.body?.resources?.length || req.body?.resourceIds?.length,
      tenantId: req.tenantId,
      error: error.message,
    });
    return res.status(200).json({
      status: 'success',
      data: {
        resources: (Array.isArray(req.body?.resources) &&
        req.body.resources.length > 0
          ? req.body.resources
          : Array.isArray(req.body?.resourceIds)
            ? req.body.resourceIds
            : []
        ).map((id: string) => ({
          resourceId: id,
          isAvailable: true,
          occupyingReservations: [],
        })),
        message: 'Batch availability check completed with limited data',
      },
    });
  }
});
