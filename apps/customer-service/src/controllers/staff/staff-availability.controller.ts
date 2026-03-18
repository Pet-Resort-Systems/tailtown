/**
 * Staff Availability Controller
 *
 * Handles staff availability operations:
 * - getStaffAvailability
 * - createStaffAvailability
 * - updateStaffAvailability
 * - deleteStaffAvailability
 * - getAvailableStaff
 */

import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/prisma';

/**
 * Get availability for a staff member
 */
export const getStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;

    const availability = await prisma.staffAvailability.findMany({
      where: { staffId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.status(200).json({
      status: 'success',
      results: availability.length,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create availability for a staff member
 */
export const createStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const availabilityData = req.body;

    // Validate required fields
    if (
      availabilityData.dayOfWeek === undefined ||
      !availabilityData.startTime ||
      !availabilityData.endTime
    ) {
      return next(
        new AppError('Day of week, start time, and end time are required', 400)
      );
    }

    // Prepare data for creation
    const createData: any = {
      staffId,
      dayOfWeek: Number(availabilityData.dayOfWeek),
      startTime: availabilityData.startTime,
      endTime: availabilityData.endTime,
      isAvailable:
        availabilityData.isAvailable !== undefined
          ? Boolean(availabilityData.isAvailable)
          : true,
      isRecurring:
        availabilityData.isRecurring !== undefined
          ? Boolean(availabilityData.isRecurring)
          : true,
    };

    // Handle date fields if present
    if (availabilityData.effectiveFrom) {
      createData.effectiveFrom = new Date(availabilityData.effectiveFrom);
    }

    if (availabilityData.effectiveUntil) {
      createData.effectiveUntil = new Date(availabilityData.effectiveUntil);
    }

    logger.debug('Creating staff availability', {
      tenantId: (req as any).tenantId,
      staffId,
      dayOfWeek: availabilityData.dayOfWeek,
    });

    // Create availability record
    const newAvailability = await prisma.staffAvailability.create({
      data: createData,
    });

    res.status(201).json({
      status: 'success',
      data: newAvailability,
    });
  } catch (error) {
    logger.error('Error creating staff availability', { error });
    next(error);
  }
};

/**
 * Update staff availability
 */
export const updateStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const availabilityData = req.body;

    // Check if availability exists
    const existingAvailability = await prisma.staffAvailability.findUnique({
      where: { id },
    });

    if (!existingAvailability) {
      return next(new AppError('Availability record not found', 404));
    }

    // Prepare data for update
    const updateData: any = {};

    if (availabilityData.dayOfWeek !== undefined) {
      updateData.dayOfWeek = Number(availabilityData.dayOfWeek);
    }

    if (availabilityData.startTime) {
      updateData.startTime = availabilityData.startTime;
    }

    if (availabilityData.endTime) {
      updateData.endTime = availabilityData.endTime;
    }

    if (availabilityData.isAvailable !== undefined) {
      updateData.isAvailable = Boolean(availabilityData.isAvailable);
    }

    if (availabilityData.isRecurring !== undefined) {
      updateData.isRecurring = Boolean(availabilityData.isRecurring);
    }

    if (availabilityData.effectiveFrom !== undefined) {
      updateData.effectiveFrom = availabilityData.effectiveFrom
        ? new Date(availabilityData.effectiveFrom)
        : null;
    }

    if (availabilityData.effectiveUntil !== undefined) {
      updateData.effectiveUntil = availabilityData.effectiveUntil
        ? new Date(availabilityData.effectiveUntil)
        : null;
    }

    logger.debug('Updating staff availability', {
      availabilityId: id,
      tenantId: (req as any).tenantId,
    });

    // Update availability
    const updatedAvailability = await prisma.staffAvailability.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: updatedAvailability,
    });
  } catch (error: any) {
    logger.error('Error updating staff availability', {
      availabilityId: req.params.id,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Delete staff availability
 */
export const deleteStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if availability exists
    const existingAvailability = await prisma.staffAvailability.findUnique({
      where: { id },
    });

    if (!existingAvailability) {
      return next(new AppError('Availability record not found', 404));
    }

    // Delete availability
    await prisma.staffAvailability.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Availability record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available staff for scheduling
 */
export const getAvailableStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date, startTime, endTime, specialties } = req.query;

    if (!date || !startTime || !endTime) {
      return next(
        new AppError('Date, start time, and end time are required', 400)
      );
    }

    const searchDate = new Date(date as string);
    const dayOfWeek = searchDate.getDay(); // 0-6 for Sunday-Saturday

    // Process specialties parameter
    let specialtiesArray: string[] = [];
    if (specialties) {
      if (Array.isArray(specialties)) {
        specialtiesArray = specialties.map((s) => String(s));
      } else {
        specialtiesArray = [String(specialties)];
      }
    }

    // Find staff who are available on this day and time
    const availableStaff = await prisma.staff.findMany({
      where: {
        isActive: true,
        // Include staff with matching specialties if provided
        ...(specialtiesArray.length > 0
          ? {
              specialties: {
                hasSome: specialtiesArray,
              },
            }
          : {}),
        // Include staff who have availability for this day and time
        availability: {
          some: {
            dayOfWeek,
            isAvailable: true,
            startTime: {
              lte: startTime as string,
            },
            endTime: {
              gte: endTime as string,
            },
            AND: [
              {
                OR: [
                  { effectiveFrom: null },
                  { effectiveFrom: { lte: searchDate } },
                ],
              },
              {
                OR: [
                  { effectiveUntil: null },
                  { effectiveUntil: { gte: searchDate } },
                ],
              },
            ],
          },
        },
        // Exclude staff who have time off on this day
        NOT: {
          timeOff: {
            some: {
              status: 'APPROVED',
              startDate: { lte: searchDate },
              endDate: { gte: searchDate },
            },
          },
        },
      },
      include: {
        availability: true,
      },
    });

    res.status(200).json({
      status: 'success',
      results: availableStaff.length,
      data: availableStaff,
    });
  } catch (error) {
    next(error);
  }
};
