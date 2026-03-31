import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Get resource availability for a date range
 * This is a convenience method that wraps the availability controller
 * Updated to use standardized error handling pattern
 */
route.use('/:id/availability', async (req, res) => {
  const { id } = req.params;
  const tenantId =
    req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
  if (!tenantId) {
    throw AppError.authorizationError('Tenant ID is required');
  }
  const { startDate, endDate } = req.query;

  if (!id) {
    throw AppError.validationError('Resource ID is required');
  }

  if (!startDate || !endDate) {
    throw AppError.validationError('Start date and end date are required');
  }

  const parsedStartDate = new Date(startDate as string);
  const parsedEndDate = new Date(endDate as string);

  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    throw AppError.validationError('Invalid date format', {
      startDate,
      endDate,
    });
  }

  logger.info(
    `Checking availability for resource ID: ${id} from ${parsedStartDate} to ${parsedEndDate}`
  );

  const resourceRecord = await safeExecutePrismaQuery(
    async () => {
      return await prisma.resource.findFirst({
        where: { id, tenantId },
      });
    },
    null,
    `Error verifying resource before availability check: ${id}`
  );
  if (!resourceRecord) {
    throw AppError.notFoundError('Resource', id);
  }

  const overlappingReservations = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.findMany({
        where: {
          tenantId,
          resourceId: id,
          OR: [
            {
              startDate: {
                gte: parsedStartDate,
                lte: parsedEndDate,
              },
            },
            {
              endDate: {
                gte: parsedStartDate,
                lte: parsedEndDate,
              },
            },
            {
              AND: [
                {
                  startDate: {
                    lte: parsedStartDate,
                  },
                },
                {
                  endDate: {
                    gte: parsedEndDate,
                  },
                },
              ],
            },
          ],
        } as any,
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });
    },
    [],
    `Error checking availability for resource with ID: ${id}`
  );

  const isAvailable =
    !overlappingReservations || overlappingReservations.length === 0;

  logger.success(
    `Successfully checked availability for resource: ${id}. Available: ${isAvailable}`
  );

  res.status(200).json({
    success: true,
    status: 'success',
    data: {
      resourceId: id,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      isAvailable,
      overlappingReservations: overlappingReservations || [],
    },
  });
});
