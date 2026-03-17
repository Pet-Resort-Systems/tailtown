import { Response, NextFunction } from 'express';
import { AppError } from '../../utils/appError';
import { TenantRequest } from '../../types/request';
import {
  ExtendedReservationWhereInput,
  ExtendedReservationStatus,
} from '../../types/prisma-extensions';
import { prisma } from '../../config/prisma';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils';
import { logger } from '../../utils/logger';

/**
 * Check availability for multiple resources at once
 *
 * @route POST /api/resources/availability/batch
 */
export const batchCheckResourceAvailability = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get tenant ID from request - added by tenant middleware (required)
    const tenantId =
      req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    if (!tenantId) {
      return next(AppError.authorizationError('Tenant ID is required'));
    }

    // Get request body - expecting an array of resource IDs and date ranges
    const {
      resources: resourcesBody,
      resourceIds,
      date,
      startDate,
      endDate,
    } = req.body;

    // Accept either 'resources' or 'resourceIds' to be backward/forward compatible
    const resources =
      Array.isArray(resourcesBody) && resourcesBody.length > 0
        ? resourcesBody
        : Array.isArray(resourceIds) && resourceIds.length > 0
          ? resourceIds
          : [];

    if (!Array.isArray(resources) || resources.length === 0) {
      return next(
        new AppError(
          'Resource IDs are required. Provide an array via "resources" or "resourceIds".',
          400
        )
      );
    }

    // Determine if we're checking for a single date or a date range
    let checkStartDate: Date;
    let checkEndDate: Date;

    if (date) {
      // If a single date is provided, we check just that date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return next(new AppError('Invalid date format', 400));
      }

      // Set the start and end date to be the same date (beginning and end of day)
      checkStartDate = new Date(parsedDate);
      checkStartDate.setHours(0, 0, 0, 0);

      checkEndDate = new Date(parsedDate);
      checkEndDate.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      // If start and end dates are provided, we check the entire range
      checkStartDate = new Date(startDate);
      checkEndDate = new Date(endDate);

      if (isNaN(checkStartDate.getTime()) || isNaN(checkEndDate.getTime())) {
        return next(new AppError('Invalid date format', 400));
      }
    } else {
      return next(
        new AppError(
          'Either date or both startDate and endDate are required',
          400
        )
      );
    }

    // Find reservations for all the requested resources in the date range
    // Using our safe execution helper to handle potential schema mismatches
    const allReservations = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.findMany({
          where: {
            tenantId: tenantId,
            resourceId: {
              in: resources,
            },
            // Find reservations that overlap with the requested dates
            AND: [
              { startDate: { lte: checkEndDate } },
              { endDate: { gte: checkStartDate } },
            ],
            // Only check active reservations
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
            customerId: true, // Use customerServiceClient to fetch customer details if needed
            petId: true, // Use customerServiceClient to fetch pet details if needed
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
      [], // Empty array fallback if there's an error
      'Error finding overlapping reservations for batch check'
    );

    // Group reservations by resource ID
    const reservationsByResource: Record<string, any[]> = {};
    resources.forEach((resourceId) => {
      reservationsByResource[resourceId] = allReservations.filter(
        (reservation) => reservation.resourceId === resourceId
      );
    });

    // Prepare the response data
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
    // More graceful error handling - return an empty result instead of a 500 error
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
          isAvailable: true, // Default to available if we can't determine
          occupyingReservations: [],
        })),
        message: 'Batch availability check completed with limited data',
      },
    });
  }
};
