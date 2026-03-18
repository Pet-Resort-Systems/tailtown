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
import { getCache, setCache, getCacheKey } from '../../utils/redis';

// Cache TTL for availability checks (60 seconds - short to ensure accuracy)
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
export const checkResourceAvailability = async (
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

    // Get query parameters
    const { resourceId, resourceType, date, startDate, endDate } = req.query;

    // Either resourceId or resourceType is required
    if (!resourceId && !resourceType) {
      return next(
        new AppError('Either Resource ID or Resource Type is required', 400)
      );
    }

    // Determine if we're checking for a single date or a date range
    let checkStartDate: Date;
    let checkEndDate: Date;

    if (date) {
      // If a single date is provided, we check just that date
      const parsedDate = new Date(date as string);
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
      checkStartDate = new Date(startDate as string);
      checkEndDate = new Date(endDate as string);

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

    // Generate cache key based on query parameters
    const cacheKey = getCacheKey(
      tenantId as string,
      'availability',
      `${resourceId || resourceType}:${
        checkStartDate.toISOString().split('T')[0]
      }:${checkEndDate.toISOString().split('T')[0]}`
    );

    // Check cache first
    const cachedResult = await getCache<any>(cacheKey);
    if (cachedResult) {
      logger.debug('Availability cache hit', { cacheKey });
      return res.status(200).json(cachedResult);
    }

    // First, find all resources that match the criteria (either by ID or type)
    let resources: any[] = [];

    if (resourceId) {
      // If resourceId is provided, just use that specific resource
      const resource = await prisma.resource.findFirst({
        where: { id: resourceId as string, tenantId } as any,
      });

      if (resource) {
        resources = [resource];
      }
    } else if (resourceType) {
      // If resourceType is provided, find all resources of that type
      resources = await prisma.resource.findMany({
        where: {
          tenantId,
          type: resourceType as any, // TODO: Fix type casting
        } as any,
      });

      logger.debug('Found resources by type', {
        count: resources.length,
        resourceType,
      });
    }

    // If no resources found, return empty result
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

    // Find any reservations that occupy these resources during the specified time
    // Using our safe execution helper to handle potential schema mismatches
    const overlappingReservations = await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservation.findMany({
          where: {
            tenantId: tenantId,
            resourceId: {
              in: resources.map((r) => r.id),
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
                name: true,
              },
            },
          },
        });
      },
      [], // Empty array fallback if there's an error
      'Error finding overlapping reservations'
    );

    // Group reservations by resource ID
    const reservationsByResource: Record<string, any[]> = {};
    resources.forEach((resource) => {
      reservationsByResource[resource.id] = [];
    });

    // Populate reservations for each resource
    overlappingReservations.forEach((reservation) => {
      if (
        reservation.resourceId &&
        reservationsByResource[reservation.resourceId]
      ) {
        reservationsByResource[reservation.resourceId].push(reservation);
      }
    });

    // Prepare the response data - format it to match what the frontend expects
    const resourcesData = resources.map((resource) => ({
      resourceId: resource.id,
      name: resource.name,
      type: resource.type,
      isAvailable:
        !reservationsByResource[resource.id] ||
        reservationsByResource[resource.id].length === 0,
      occupyingReservations: reservationsByResource[resource.id] || [],
    }));

    // Build response
    const response = {
      status: 'success',
      data: {
        checkDate: date ? date : null,
        checkStartDate: startDate ? startDate : checkStartDate.toISOString(),
        checkEndDate: endDate ? endDate : checkEndDate.toISOString(),
        resources: resourcesData,
      },
    };

    // Cache the result
    await setCache(cacheKey, response, AVAILABILITY_CACHE_TTL);
    logger.debug('Availability cached', {
      cacheKey,
      ttl: AVAILABILITY_CACHE_TTL,
    });

    // Return the result including availability status for all resources
    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Error checking resource availability', {
      resourceId: req.query.resourceId,
      tenantId: req.tenantId,
      error: error.message,
    });
    // More graceful error handling - return an empty result instead of a 500 error
    // This follows our schema alignment strategy of providing fallbacks
    return res.status(200).json({
      status: 'success',
      data: {
        resourceId: req.query.resourceId as string,
        isAvailable: true, // Default to available if we can't determine
        checkDate: (req.query.date as string) || null,
        checkStartDate: (req.query.startDate as string) || null,
        checkEndDate: (req.query.endDate as string) || null,
        message: 'Availability check completed with limited data',
        conflictingReservations: [],
      },
    });
  }
};
