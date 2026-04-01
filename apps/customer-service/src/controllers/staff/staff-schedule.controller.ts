/**
 * Staff Schedule Controller
 *
 * Handles schedule operations:
 * - getStaffSchedules
 * - getAllSchedules
 * - createStaffSchedule
 * - updateStaffSchedule
 * - deleteStaffSchedule
 * - bulkCreateSchedules
 * - testSchedulesEndpoint
 */

import { type Request, type Response, type NextFunction } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';

import { AppError } from '../../middleware/error.middleware.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';

// Extend the Express Request type for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
  tenantId?: string;
}

/**
 * Helper to detect overlapping schedules for a staff member on a given day
 */
const hasScheduleConflict = async (
  tenantId: string | undefined,
  staffId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<boolean> => {
  // Normalize to the calendar day for date-based filtering
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const where: any = {
    staffId,
    date: {
      gte: startOfDay,
      lte: endOfDay,
    },
    // Time overlap: existing.endTime > new.startTime AND existing.startTime < new.endTime
    endTime: {
      gt: startTime,
    },
    startTime: {
      lt: endTime,
    },
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  if (excludeScheduleId) {
    where.id = { not: excludeScheduleId };
  }

  const conflict = await prisma.staffSchedule.findFirst({ where });
  return !!conflict;
};

/**
 * Get all schedules for a specific staff member
 */
export const getStaffSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staffId = assertStringRouteParam(
      req.params.staffId,
      req.originalUrl,
      AppError.validationError,
      'Staff ID is required'
    );
    const { startDate, endDate } = req.query;

    let whereClause: any = { staffId };

    if (startDate && endDate) {
      const startDateTime = new Date(startDate as string);
      const endDateTime = new Date(endDate as string);

      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    const schedules = await prisma.staffSchedule.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      results: schedules.length,
      data: schedules,
    });
  } catch (error) {
    logger.error('Error fetching staff schedules', { error });
    next(error);
  }
};

/**
 * Simple test endpoint to diagnose routing issues
 */
export const testSchedulesEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({
    status: 'success',
    message: 'Test endpoint working',
    query: req.query,
    params: req.params,
  });
};

/**
 * Get all schedules across all staff members
 */
export const getAllSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.debug('getAllSchedules called', {
      tenantId: (req as any).tenantId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    const { startDate, endDate } = req.query;

    let whereClause: any = {};

    if (startDate && endDate) {
      const startDateTime = new Date(startDate as string);
      const endDateTime = new Date(endDate as string);

      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    const schedules = await prisma.staffSchedule.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      results: schedules.length,
      data: schedules,
    });
  } catch (error) {
    logger.error('Error fetching all schedules', { error });
    next(error);
  }
};

/**
 * Create a new schedule for a staff member
 */
export const createStaffSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const staffId = assertStringRouteParam(
      req.params.staffId,
      req.originalUrl,
      AppError.validationError,
      'Staff ID is required'
    );
    const { date, startTime, endTime, status, notes, location, role } =
      req.body;

    // Validate required fields
    if (!date || !startTime || !endTime) {
      return next(
        new AppError('Date, start time, and end time are required', 400)
      );
    }

    // Check if staff exists
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return next(new AppError('Staff not found', 404));
    }

    const scheduleDate = new Date(date);

    // Prevent overlapping schedules
    const conflict = await hasScheduleConflict(
      req.tenantId,
      staffId,
      scheduleDate,
      startTime,
      endTime
    );

    if (conflict) {
      return next(
        new AppError(
          'This staff member already has a shift during this time',
          400
        )
      );
    }

    // Create the schedule
    const newSchedule = await prisma.staffSchedule.create({
      data: {
        staffId,
        date: scheduleDate,
        startTime,
        endTime,
        status: status || 'SCHEDULED',
        notes,
        location,
        role,
        createdById: req.user?.id,
      },
    });

    res.status(201).json({
      status: 'success',
      data: newSchedule,
    });
  } catch (error: any) {
    logger.error('Error creating staff schedule', {
      staffId: req.params.staffId,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Update an existing staff schedule
 */
export const updateStaffSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const scheduleId = assertStringRouteParam(
      req.params.scheduleId,
      req.originalUrl,
      AppError.validationError,
      'Schedule ID is required'
    );
    const { date, startTime, endTime, status, notes, location, role } =
      req.body;

    // Check if schedule exists
    const schedule = await prisma.staffSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return next(new AppError('Schedule not found', 404));
    }

    const newDate = date ? new Date(date) : schedule.date;
    const newStartTime = startTime || schedule.startTime;
    const newEndTime = endTime || schedule.endTime;

    // Prevent overlapping schedules (excluding this schedule)
    const conflict = await hasScheduleConflict(
      req.tenantId,
      schedule.staffId,
      newDate,
      newStartTime,
      newEndTime,
      schedule.id
    );

    if (conflict) {
      return next(
        new AppError(
          'This staff member already has a shift during this time',
          400
        )
      );
    }

    // Update the schedule
    const updatedSchedule = await prisma.staffSchedule.update({
      where: { id: scheduleId },
      data: {
        date: date ? newDate : undefined,
        startTime,
        endTime,
        status,
        notes,
        location,
        role,
        updatedById: req.user?.id,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedSchedule,
    });
  } catch (error: any) {
    logger.error('Error updating staff schedule', {
      scheduleId: req.params.scheduleId,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Delete a staff schedule
 */
export const deleteStaffSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const scheduleId = assertStringRouteParam(
      req.params.scheduleId,
      req.originalUrl,
      AppError.validationError,
      'Schedule ID is required'
    );

    // Check if schedule exists
    const schedule = await prisma.staffSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return next(new AppError('Schedule not found', 404));
    }

    // Delete the schedule
    await prisma.staffSchedule.delete({ where: { id: scheduleId } });

    res.status(200).json({
      status: 'success',
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting staff schedule', {
      scheduleId: req.params.scheduleId,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Create multiple staff schedules in bulk
 */
export const bulkCreateSchedules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return next(new AppError('Valid schedules array is required', 400));
    }

    // Process each schedule in a transaction
    const createdSchedules = await prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const schedule of schedules) {
        const {
          staffId,
          date,
          startTime,
          endTime,
          status,
          notes,
          location,
          role,
        } = schedule;

        if (!staffId || !date || !startTime || !endTime) {
          throw new AppError(
            'Each schedule must include staffId, date, startTime, and endTime',
            400
          );
        }

        const scheduleDate = new Date(date);

        // Check for schedule conflicts
        const conflict = await hasScheduleConflict(
          req.tenantId,
          staffId,
          scheduleDate,
          startTime,
          endTime
        );

        if (conflict) {
          throw new AppError(
            `Staff member already has a shift during ${startTime}–${endTime} on this date`,
            400
          );
        }

        const newSchedule = await tx.staffSchedule.create({
          data: {
            staffId,
            date: scheduleDate,
            startTime,
            endTime,
            status: status || 'SCHEDULED',
            notes,
            location,
            role,
            createdById: req.user?.id,
          },
        });

        results.push(newSchedule);
      }

      return results;
    });

    res.status(201).json({
      status: 'success',
      results: createdSchedules.length,
      data: createdSchedules,
    });
  } catch (error: any) {
    logger.error('Error creating bulk schedules', {
      count: req.body.schedules?.length,
      error: error.message,
    });
    next(error);
  }
};
