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

import { Request, Response, NextFunction } from "express";
import { PrismaClient, ReservationStatus } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware";
import { logger } from "../../utils/logger";

const prisma = new PrismaClient();

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
      (req as any).tenantId || (process.env.NODE_ENV !== "production" && "dev");

    // Build where clause - always filter by tenantId
    let where: any = { tenantId };

    // Handle multiple status values
    const status = req.query.status as string;
    if (status) {
      const statusArray = status.split(",");
      const validStatuses = ReservationStatus
        ? Object.values(ReservationStatus)
        : [];
      const invalidStatuses = statusArray.filter(
        (s) => !validStatuses.includes(s as any)
      );

      if (invalidStatuses.length > 0) {
        throw new AppError(
          `Invalid status values: ${invalidStatuses.join(
            ", "
          )}. Valid values are: ${validStatuses.join(", ")}`,
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
      const [year, month, day] = date.split("-").map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      where.AND = [
        { startDate: { lte: endOfDay } },
        { endDate: { gte: startOfDay } },
      ];
    }

    // Allow sorting
    const sortBy = (req.query.sortBy as string) || "startDate";
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";

    const reservations = await prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: true,
        pet: true,
        resource: true,
        service: true,
      },
    });

    const total = await prisma.reservation.count({ where });

    res.status(200).json({
      status: "success",
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
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        pet: true,
        resource: true,
      },
    });

    if (!reservation) {
      return next(new AppError("Reservation not found", 404));
    }

    res.status(200).json({
      status: "success",
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
    const { customerId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reservations = await prisma.reservation.findMany({
      where: { customerId },
      skip,
      take: limit,
      orderBy: { startDate: "desc" },
      include: { pet: true },
    });

    const total = await prisma.reservation.count({
      where: { customerId },
    });

    res.status(200).json({
      status: "success",
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
    const { customerId } = req.params;
    const now = new Date();

    const reservations = await prisma.reservation.findMany({
      where: {
        customerId,
        startDate: { gte: now },
        status: { notIn: ["CANCELLED", "COMPLETED", "CHECKED_OUT", "NO_SHOW"] },
      },
      orderBy: { startDate: "asc" },
      include: {
        pet: true,
        resource: true,
      },
    });

    res.status(200).json({
      status: "success",
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
    const { customerId } = req.params;
    const limit = Number(req.query.limit) || 20;
    const now = new Date();

    const reservations = await prisma.reservation.findMany({
      where: {
        customerId,
        OR: [
          { endDate: { lt: now } },
          {
            status: {
              in: ["COMPLETED", "CHECKED_OUT", "CANCELLED", "NO_SHOW"],
            },
          },
        ],
      },
      take: limit,
      orderBy: { startDate: "desc" },
      include: {
        pet: true,
        resource: true,
      },
    });

    res.status(200).json({
      status: "success",
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
    const { petId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reservations = await prisma.reservation.findMany({
      where: { petId },
      skip,
      take: limit,
      orderBy: { startDate: "desc" },
      include: { customer: true },
    });

    const total = await prisma.reservation.count({
      where: { petId },
    });

    res.status(200).json({
      status: "success",
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
      return next(new AppError("Both startDate and endDate are required", 400));
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        startDate: { gte: new Date(startDate as string) },
        endDate: { lte: new Date(endDate as string) },
      },
      skip,
      take: limit,
      orderBy: { startDate: "asc" },
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
      status: "success",
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
    const { status } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate the status
    const validStatuses = Object.values(ReservationStatus);
    if (!validStatuses.includes(status as ReservationStatus)) {
      return next(
        new AppError(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          400
        )
      );
    }

    const reservations = await prisma.reservation.findMany({
      where: { status: status as ReservationStatus },
      skip,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        customer: true,
        pet: true,
      },
    });

    const total = await prisma.reservation.count({
      where: { status: status as ReservationStatus },
    });

    res.status(200).json({
      status: "success",
      results: reservations.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reservations,
    });
  } catch (error) {
    next(error);
  }
};
