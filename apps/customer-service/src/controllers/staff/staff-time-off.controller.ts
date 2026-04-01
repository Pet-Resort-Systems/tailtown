/**
 * Staff Time Off Controller
 *
 * Handles time off operations:
 * - getStaffTimeOff
 * - createStaffTimeOff
 * - updateStaffTimeOff
 * - deleteStaffTimeOff
 */

import { type Request, type Response, type NextFunction } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';

import { AppError } from '../../middleware/error.middleware.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';

/**
 * Get time off for a staff member
 */
export const getStaffTimeOff = async (
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
    const status = req.query.status as string;

    // Build where condition
    const where: any = { staffId };
    if (status) {
      where.status = status;
    }

    const timeOff = await prisma.staffTimeOff.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      results: timeOff.length,
      data: timeOff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create time off for a staff member
 */
export const createStaffTimeOff = async (
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
    const timeOffData = req.body;

    // Validate required fields
    if (!timeOffData.startDate || !timeOffData.endDate || !timeOffData.type) {
      return next(
        new AppError('Start date, end date, and type are required', 400)
      );
    }

    // Prepare data for creation
    const createData: any = {
      staffId,
      startDate: new Date(timeOffData.startDate),
      endDate: new Date(timeOffData.endDate),
      type: timeOffData.type,
      status: timeOffData.status || 'PENDING',
      reason: timeOffData.reason || null,
    };

    // Handle optional fields
    if (timeOffData.notes) {
      createData.notes = timeOffData.notes;
    }

    if (timeOffData.approvedById) {
      createData.approvedById = timeOffData.approvedById;
    }

    if (timeOffData.approvedDate) {
      createData.approvedDate = new Date(timeOffData.approvedDate);
    }

    logger.debug('Creating staff time off', {
      tenantId: (req as any).tenantId,
      staffId,
      type: timeOffData.type,
    });

    // Create time off record
    const newTimeOff = await prisma.staffTimeOff.create({
      data: createData,
    });

    res.status(201).json({
      status: 'success',
      data: newTimeOff,
    });
  } catch (error: any) {
    logger.error('Error creating staff time off', {
      staffId: req.params.staffId,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Update staff time off
 */
export const updateStaffTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Time off ID is required'
    );
    const timeOffData = req.body;

    // Check if time off exists
    const existingTimeOff = await prisma.staffTimeOff.findUnique({
      where: { id },
    });

    if (!existingTimeOff) {
      return next(new AppError('Time off record not found', 404));
    }

    // Prepare data for update
    const updateData: any = {};

    if (timeOffData.type !== undefined) {
      updateData.type = timeOffData.type;
    }

    if (timeOffData.status !== undefined) {
      updateData.status = timeOffData.status;
    }

    if (timeOffData.reason !== undefined) {
      updateData.reason = timeOffData.reason;
    }

    if (timeOffData.notes !== undefined) {
      updateData.notes = timeOffData.notes;
    }

    if (timeOffData.startDate) {
      updateData.startDate = new Date(timeOffData.startDate);
    }

    if (timeOffData.endDate) {
      updateData.endDate = new Date(timeOffData.endDate);
    }

    if (timeOffData.approvedById !== undefined) {
      updateData.approvedById = timeOffData.approvedById;
    }

    if (timeOffData.approvedDate !== undefined) {
      updateData.approvedDate = timeOffData.approvedDate
        ? new Date(timeOffData.approvedDate)
        : null;
    }

    logger.debug('Updating staff time off', {
      timeOffId: id,
      tenantId: (req as any).tenantId,
    });

    // Update time off
    const updatedTimeOff = await prisma.staffTimeOff.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: updatedTimeOff,
    });
  } catch (error: any) {
    logger.error('Error updating staff time off', {
      timeOffId: req.params.id,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Delete staff time off
 */
export const deleteStaffTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Time off ID is required'
    );

    // Check if time off exists
    const existingTimeOff = await prisma.staffTimeOff.findUnique({
      where: { id },
    });

    if (!existingTimeOff) {
      return next(new AppError('Time off record not found', 404));
    }

    // Delete time off
    await prisma.staffTimeOff.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Time off record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
