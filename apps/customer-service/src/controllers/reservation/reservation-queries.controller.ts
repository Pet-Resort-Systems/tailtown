/**
 * Reservation Queries Controller
 *
 * Handles read operations for reservations:
 * - getAllReservations
 * - getReservationById
 * - getReservationsByCustomer
 * - getUpcomingReservationsByCustomer
 * - getPastReservationsByCustomer
 * - getReservationsByPet
 * - getReservationsByDateRange
 * - getReservationsByStatus
 */

import { type Request, type Response, type NextFunction } from 'express';
import { ReservationStatus } from '@prisma/client';
import { assertStringRouteParam } from '@tailtown/shared';
import { AppError } from '../../middleware/error.middleware.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';
import {
  reservationSelectForList,
  reservationSelectFull,
  petSelectMinimal,
} from '../../utils/prisma-optimized.js';

/**
 * Get all reservations with pagination and filtering
 */
export const getAllReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get tenant ID from request
    const tenantId =
      (req as any).tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

    // Build where clause - always filter by tenantId
    let where: any = { tenantId };

    // Handle multiple status values
    const status = req.query.status as string;
    if (status) {
      const statusArray = status.split(',');
      const validStatuses = ReservationStatus
        ? Object.values(ReservationStatus)
        : [];
      const invalidStatuses = statusArray.filter(
        (s) => !validStatuses.includes(s as any)
      );

      if (invalidStatuses.length > 0) {
        throw new AppError(
          `Invalid status values: ${invalidStatuses.join(
            ', '
          )}. Valid values are: ${validStatuses.join(', ')}`,
          400
        );
      }

      where.status = {
        in: statusArray as ReservationStatus[],
      };
    }

    // Handle resourceId filter
    const resourceId = req.query.resourceId as string;
    if (resourceId) {
      where.resourceId = resourceId;
    }

    // Handle date range filtering
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    const date = req.query.date as string;

    if (startDateParam && endDateParam) {
      const rangeStart = new Date(startDateParam);
      const rangeEnd = new Date(endDateParam);
      rangeEnd.setHours(23, 59, 59, 999);

      where.AND = [
        { startDate: { lte: rangeEnd } },
        { endDate: { gte: rangeStart } },
      ];
    } else if (date) {
      const [year, month, day] = date.split('-').map(Number);

      // Get timezone from query parameter, default to America/Denver (MST/UTC-7)
      const timezone = (req.query.timezone as string) || 'America/Denver';
      const timezoneOffsets: { [key: string]: number } = {
        'America/New_York': -5,
        'America/Chicago': -6,
        'America/Denver': -7,
        'America/Los_Angeles': -8,
        'America/Phoenix': -7,
        UTC: 0,
      };
      const offsetHours = timezoneOffsets[timezone] || -7;

      // Create start and end of day in UTC, representing the user's local day
      // For MST (UTC-7), Dec 9 00:00 MST = Dec 9 07:00 UTC
      // For MST (UTC-7), Dec 9 23:59 MST = Dec 10 06:59 UTC
      const startOfDay = new Date(
        Date.UTC(year, month - 1, day, -offsetHours, 0, 0, 0)
      );
      const endOfDay = new Date(
        Date.UTC(year, month - 1, day, 23 - offsetHours, 59, 59, 999)
      );

      where.AND = [
        { startDate: { lte: endOfDay } },
        { endDate: { gte: startOfDay } },
      ];
    }

    // Allow sorting
    const sortBy = (req.query.sortBy as string) || 'startDate';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';

    // Use optimized select instead of include: true to reduce data transfer
    const reservations = await prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: reservationSelectForList,
    });

    const total = await prisma.reservation.count({ where });

    res.status(200).json({
      status: 'success',
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single reservation by ID
 */
export const getReservationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Reservation ID is required'
    );

    // Use full select for detail view
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: reservationSelectFull,
    });

    if (!reservation) {
      return next(new AppError('Reservation not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: reservation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reservations by customer
 */
export const getReservationsByCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Use optimized select with minimal pet data
    const reservations = await prisma.reservation.findMany({
      where: { customerId },
      skip,
      take: limit,
      orderBy: { startDate: 'desc' },
      select: {
        ...reservationSelectForList,
        pet: { select: petSelectMinimal },
      },
    });

    const total = await prisma.reservation.count({
      where: { customerId },
    });

    res.status(200).json({
      status: 'success',
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upcoming reservations for a customer
 */
export const getUpcomingReservationsByCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const now = new Date();

    // Use optimized select for list view
    const reservations = await prisma.reservation.findMany({
      where: {
        customerId,
        startDate: { gte: now },
        status: { notIn: ['CANCELLED', 'COMPLETED', 'CHECKED_OUT', 'NO_SHOW'] },
      },
      orderBy: { startDate: 'asc' },
      select: reservationSelectForList,
    });

    res.status(200).json({
      status: 'success',
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get past reservations for a customer
 */
export const getPastReservationsByCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const limit = Number(req.query.limit) || 20;
    const now = new Date();

    const reservations = await prisma.reservation.findMany({
      where: {
        customerId,
        OR: [
          { endDate: { lt: now } },
          {
            status: {
              in: ['COMPLETED', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'],
            },
          },
        ],
      },
      take: limit,
      orderBy: { startDate: 'desc' },
      include: {
        pet: true,
        resource: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reservations by pet
 */
export const getReservationsByPet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const petId = assertStringRouteParam(
      req.params.petId,
      req.originalUrl,
      AppError.validationError,
      'Pet ID is required'
    );
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reservations = await prisma.reservation.findMany({
      where: { petId },
      skip,
      take: limit,
      orderBy: { startDate: 'desc' },
      include: { customer: true },
    });

    const total = await prisma.reservation.count({
      where: { petId },
    });

    res.status(200).json({
      status: 'success',
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reservations by date range
 */
export const getReservationsByDateRange = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!startDate || !endDate) {
      return next(new AppError('Both startDate and endDate are required', 400));
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        startDate: { gte: new Date(startDate as string) },
        endDate: { lte: new Date(endDate as string) },
      },
      skip,
      take: limit,
      orderBy: { startDate: 'asc' },
      include: {
        customer: true,
        pet: true,
      },
    });

    const total = await prisma.reservation.count({
      where: {
        startDate: { gte: new Date(startDate as string) },
        endDate: { lte: new Date(endDate as string) },
      },
    });

    res.status(200).json({
      status: 'success',
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reservations by status
 */
export const getReservationsByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = assertStringRouteParam(
      req.params.status,
      req.originalUrl,
      AppError.validationError,
      'Reservation status is required'
    );
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate the status
    const validStatuses = Object.values(ReservationStatus);
    if (!validStatuses.includes(status as ReservationStatus)) {
      return next(
        new AppError(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          400
        )
      );
    }

    const reservations = await prisma.reservation.findMany({
      where: { status: status as ReservationStatus },
      skip,
      take: limit,
      orderBy: { startDate: 'asc' },
      include: {
        customer: true,
        pet: true,
      },
    });

    const total = await prisma.reservation.count({
      where: { status: status as ReservationStatus },
    });

    res.status(200).json({
      status: 'success',
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};
