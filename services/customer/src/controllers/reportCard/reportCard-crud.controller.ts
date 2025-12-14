/**
 * Report Card CRUD Controller
 *
 * Handles basic CRUD operations:
 * - createReportCard
 * - listReportCards
 * - getReportCard
 * - updateReportCard
 * - deleteReportCard
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware";

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "SUPER_ADMIN" | "TENANT_ADMIN" | "MANAGER" | "STAFF";
    tenantId?: string;
  };
  tenantId?: string;
}

/**
 * Create a new report card
 * POST /api/report-cards
 */
export const createReportCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const staffId = req.user?.id;

    if (!tenantId || !staffId) {
      return next(new AppError("Tenant ID and Staff ID are required", 400));
    }

    // Verify staff exists in this tenant
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, tenantId: tenantId },
    });

    if (!staff) {
      return next(new AppError("Staff member not found", 404));
    }

    const {
      petId,
      customerId,
      reservationId,
      serviceType,
      templateType,
      title,
      summary,
      moodRating,
      energyRating,
      appetiteRating,
      socialRating,
      activities,
      mealsEaten,
      bathroomBreaks,
      medicationGiven,
      medicationNotes,
      behaviorNotes,
      highlights,
      concerns,
      tags,
      notes,
    } = req.body;

    if (!petId || !customerId || !serviceType) {
      return next(
        new AppError("Pet ID, Customer ID, and Service Type are required", 400)
      );
    }

    const pet = await prisma.pet.findFirst({
      where: { id: petId, customerId: customerId, tenantId: tenantId },
    });

    if (!pet) {
      return next(
        new AppError("Pet not found or does not belong to customer", 404)
      );
    }

    const reportCard = await prisma.reportCard.create({
      data: {
        tenantId,
        petId,
        customerId,
        reservationId,
        createdByStaffId: staffId,
        serviceType,
        templateType,
        title,
        summary,
        moodRating,
        energyRating,
        appetiteRating,
        socialRating,
        activities: activities || [],
        mealsEaten: mealsEaten || [],
        bathroomBreaks,
        medicationGiven: medicationGiven || false,
        medicationNotes,
        behaviorNotes,
        highlights: highlights || [],
        concerns: concerns || [],
        tags: tags || [],
        notes,
      },
      include: {
        pet: true,
        customer: true,
        createdByStaff: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        photos: true,
      },
    });

    res.status(201).json({ success: true, data: reportCard });
  } catch (error: any) {
    next(new AppError(error.message || "Failed to create report card", 500));
  }
};

/**
 * Get all report cards (staff view with filters)
 * GET /api/report-cards
 */
export const listReportCards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return next(new AppError("Tenant ID is required", 400));
    }

    const {
      petId,
      customerId,
      reservationId,
      serviceType,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const where: any = { tenantId };
    if (petId) where.petId = petId;
    if (customerId) where.customerId = customerId;
    if (reservationId) where.reservationId = reservationId;
    if (serviceType) where.serviceType = serviceType;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = new Date(startDate as string);
      if (endDate) where.reportDate.lte = new Date(endDate as string);
    }

    const [reportCards, total] = await Promise.all([
      prisma.reportCard.findMany({
        where,
        include: {
          pet: { select: { id: true, name: true, type: true, breed: true } },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          createdByStaff: {
            select: { id: true, firstName: true, lastName: true },
          },
          photos: { orderBy: { order: "asc" }, take: 3 },
        },
        orderBy: { reportDate: "desc" },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.reportCard.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        reportCards,
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error: any) {
    next(new AppError(error.message || "Failed to fetch report cards", 500));
  }
};

/**
 * Get single report card by ID
 * GET /api/report-cards/:id
 */
export const getReportCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const reportCard = await prisma.reportCard.findFirst({
      where: { id, tenantId: tenantId! },
      include: {
        pet: true,
        customer: true,
        reservation: true,
        createdByStaff: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        photos: {
          orderBy: { order: "asc" },
          include: {
            uploadedByStaff: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!reportCard) {
      return next(new AppError("Report card not found", 404));
    }

    await prisma.reportCard.update({
      where: { id },
      data: { viewCount: { increment: 1 }, viewedAt: new Date() },
    });

    res.json({ success: true, data: reportCard });
  } catch (error: any) {
    next(new AppError(error.message || "Failed to fetch report card", 500));
  }
};

/**
 * Update report card
 * PATCH /api/report-cards/:id
 */
export const updateReportCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const reportCard = await prisma.reportCard.findFirst({
      where: { id, tenantId: tenantId! },
    });

    if (!reportCard) {
      return next(new AppError("Report card not found", 404));
    }

    const updateData: any = {};
    const allowedFields = [
      "title",
      "summary",
      "moodRating",
      "energyRating",
      "appetiteRating",
      "socialRating",
      "activities",
      "mealsEaten",
      "bathroomBreaks",
      "medicationGiven",
      "medicationNotes",
      "behaviorNotes",
      "highlights",
      "concerns",
      "status",
      "tags",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updated = await prisma.reportCard.update({
      where: { id },
      data: updateData,
      include: {
        pet: true,
        customer: true,
        createdByStaff: {
          select: { id: true, firstName: true, lastName: true },
        },
        photos: { orderBy: { order: "asc" } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    next(new AppError(error.message || "Failed to update report card", 500));
  }
};

/**
 * Delete report card
 * DELETE /api/report-cards/:id
 */
export const deleteReportCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const reportCard = await prisma.reportCard.findFirst({
      where: { id, tenantId: tenantId! },
    });

    if (!reportCard) {
      return next(new AppError("Report card not found", 404));
    }

    await prisma.reportCard.delete({ where: { id } });

    res.json({ success: true, message: "Report card deleted successfully" });
  } catch (error: any) {
    next(new AppError(error.message || "Failed to delete report card", 500));
  }
};
