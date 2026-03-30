/**
 * Resource Availability Controller
 *
 * Handles availability operations:
 * - createAvailabilitySlot
 * - updateAvailabilitySlot
 * - deleteAvailabilitySlot
 * - getAvailableResourcesByDate
 * - getResourceAvailability
 * - getBatchResourceAvailability
 */

import { type Response, type NextFunction } from 'express';

import AppError from '../../utils/appError.js';
import { type TenantRequest } from '../../middleware/tenant.middleware.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';

/**
 * Create availability slot
 */
export const createAvailabilitySlot = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { resourceId } = req.params;
    const slotData = req.body;

    const slot = await prisma.resourceAvailability.create({
      data: {
        resourceId,
        startTime: new Date(slotData.startTime),
        endTime: new Date(slotData.endTime),
        status: slotData.status,
        reason: slotData.reason,
      },
    });

    res.status(201).json({ status: 'success', data: slot });
  } catch (error) {
    next(error);
  }
};

/**
 * Update availability slot
 */
export const updateAvailabilitySlot = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const slotData = req.body;

    const slot = await prisma.resourceAvailability.update({
      where: { id },
      data: {
        startTime: new Date(slotData.startTime),
        endTime: new Date(slotData.endTime),
        status: slotData.status,
        reason: slotData.reason,
      },
    });

    res.status(200).json({ status: 'success', data: slot });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete availability slot
 */
export const deleteAvailabilitySlot = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.resourceAvailability.delete({ where: { id } });

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available resources by date range
 */
export const getAvailableResourcesByDate = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, serviceId, date, resourceType } = req.query;

    let parsedStartDate: Date;
    let parsedEndDate: Date;

    if (date && !startDate && !endDate) {
      parsedStartDate = new Date(date as string);
      parsedStartDate.setHours(0, 0, 0, 0);
      parsedEndDate = new Date(date as string);
      parsedEndDate.setHours(23, 59, 59, 999);
    } else if (!startDate || !endDate) {
      return next(
        new AppError(
          'Start date and end date are required if date parameter is not provided',
          400
        )
      );
    } else {
      parsedStartDate = new Date(startDate as string);
      parsedEndDate = new Date(endDate as string);
    }

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return next(
        new AppError('Invalid date format. Please use YYYY-MM-DD format', 400)
      );
    }

    let requiredResourceTypes: string[] = [];

    if (resourceType) {
      if (resourceType === 'suite') {
        requiredResourceTypes = [
          'STANDARD_SUITE',
          'STANDARD_PLUS_SUITE',
          'VIP_SUITE',
        ];
      } else {
        requiredResourceTypes = [resourceType as string];
      }
    }

    if (serviceId && requiredResourceTypes.length === 0) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId as string },
      });

      if (!service) {
        return next(new AppError('Service not found', 404));
      }

      if (
        service.serviceCategory === 'BOARDING' ||
        service.serviceCategory === 'DAYCARE'
      ) {
        requiredResourceTypes = [
          'STANDARD_SUITE',
          'STANDARD_PLUS_SUITE',
          'VIP_SUITE',
        ];
      } else if (service.serviceCategory === 'GROOMING') {
        requiredResourceTypes = [
          'GROOMING_TABLE',
          'BATHING_STATION',
          'DRYING_STATION',
        ];
      } else if (service.serviceCategory === 'TRAINING') {
        requiredResourceTypes = ['TRAINING_ROOM', 'AGILITY_COURSE'];
      } else {
        requiredResourceTypes = [
          'STANDARD_SUITE',
          'STANDARD_PLUS_SUITE',
          'VIP_SUITE',
          'GROOMING_TABLE',
          'BATHING_STATION',
          'DRYING_STATION',
          'TRAINING_ROOM',
          'AGILITY_COURSE',
        ];
      }
    }

    const resources = await prisma.resource.findMany({
      where: {
        ...(requiredResourceTypes.length > 0
          ? { type: { in: requiredResourceTypes as any } }
          : {}),
        isActive: true,
        maintenanceStatus: { not: 'IN_MAINTENANCE' },
      },
      include: {
        reservations: {
          where: {
            OR: [
              { startDate: { gte: parsedStartDate, lt: parsedEndDate } },
              { endDate: { gt: parsedStartDate, lte: parsedEndDate } },
              {
                AND: [
                  { startDate: { lte: parsedStartDate } },
                  { endDate: { gte: parsedEndDate } },
                ],
              },
            ],
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          },
        },
      },
    });

    const availableResources = resources.filter(
      (resource: any) => resource.reservations.length === 0
    );

    res.status(200).json({ status: 'success', data: availableResources });
  } catch (error) {
    logger.error('Error getting available resources', { error });
    next(error);
  }
};

/**
 * Get resource availability for a specific date
 */
export const getResourceAvailability = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { resourceType, date } = req.query;

    if (!resourceType) {
      return next(new AppError('Resource type is required', 400));
    }

    if (!date) {
      return next(new AppError('Date is required', 400));
    }

    const parsedDate = new Date(date as string);

    if (isNaN(parsedDate.getTime())) {
      return next(
        new AppError('Invalid date format. Please use YYYY-MM-DD format', 400)
      );
    }

    const startDate = new Date(parsedDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(parsedDate);
    endDate.setHours(23, 59, 59, 999);

    const whereClause: any =
      resourceType === 'KENNEL'
        ? {
            type: {
              in: ['STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE'],
            },
            isActive: true,
          }
        : { type: resourceType as string, isActive: true };

    const resources = await prisma.resource.findMany({
      where: whereClause as any,
      include: {
        reservations: {
          where: {
            OR: [
              { startDate: { gte: startDate, lt: endDate } },
              { endDate: { gt: startDate, lte: endDate } },
              { startDate: { lte: startDate }, endDate: { gte: endDate } },
            ],
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          },
        },
      },
    });

    const resourceAvailability = resources.map((resource: any) => {
      const conflictingReservations = resource.reservations || [];
      const isAvailable = conflictingReservations.length === 0;

      return {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        isAvailable,
        conflictingReservations: isAvailable ? [] : conflictingReservations,
      };
    });

    res.status(200).json({
      status: 'success',
      data: { date: parsedDate, resources: resourceAvailability },
    });
  } catch (error) {
    logger.error('Error getting resource availability', { error });
    next(new AppError('Failed to get resource availability', 500));
  }
};

/**
 * Get batch availability for multiple resources
 */
export const getBatchResourceAvailability = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { resourceIds, startDate, endDate } = req.body;

    if (
      !resourceIds ||
      !Array.isArray(resourceIds) ||
      resourceIds.length === 0
    ) {
      return next(new AppError('Resource IDs array is required', 400));
    }

    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return next(
        new AppError('Invalid date format. Please use YYYY-MM-DD format', 400)
      );
    }

    const resources = await prisma.resource.findMany({
      where: { id: { in: resourceIds }, isActive: true },
      include: {
        reservations: {
          where: {
            OR: [
              { startDate: { gte: parsedStartDate, lt: parsedEndDate } },
              { endDate: { gt: parsedStartDate, lte: parsedEndDate } },
              {
                startDate: { lte: parsedStartDate },
                endDate: { gte: parsedEndDate },
              },
            ],
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          },
        },
      },
    });

    const resourceAvailability = resources.map((resource: any) => {
      const conflictingReservations = resource.reservations || [];
      const isAvailable = conflictingReservations.length === 0;

      return {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        isAvailable,
        conflictingReservations: isAvailable ? [] : conflictingReservations,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        resources: resourceAvailability,
      },
    });
  } catch (error) {
    logger.error('Error getting batch resource availability', { error });
    next(new AppError('Failed to get resource availability', 500));
  }
};
