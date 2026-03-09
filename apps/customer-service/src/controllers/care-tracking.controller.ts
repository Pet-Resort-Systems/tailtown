/**
 * Care Tracking Controller
 *
 * Handles feeding logs and medication administration tracking
 * Designed for mobile-friendly staff access
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClient, MealTime } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

// Extended request with tenantId and user
interface TenantRequest extends Request {
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// ============================================
// FEEDING LOGS
// ============================================

/**
 * Get all pets currently checked in (for feeding/medication tracking)
 */
export const getCheckedInPets = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all reservations that are currently active (checked in or confirmed for today)
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        status: { in: ["CHECKED_IN", "CONFIRMED"] },
        startDate: { lte: tomorrow },
        endDate: { gte: today },
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            breed: true,
            isPickyEater: true,
            foodNotes: true,
            profilePhoto: true,
            medications: {
              where: { isActive: true },
              select: {
                id: true,
                medicationName: true,
                dosage: true,
                frequency: true,
                timeOfDay: true,
                withFood: true,
                specialInstructions: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get today's feeding logs for these pets
    const petIds = reservations.map((r) => r.petId);
    const feedingLogs = await prisma.feedingLog.findMany({
      where: {
        tenantId,
        petId: { in: petIds },
        date: { gte: today, lt: tomorrow },
      },
      include: {
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Map feeding logs to pets
    const feedingLogsByPet = feedingLogs.reduce((acc: any, log) => {
      if (!acc[log.petId]) acc[log.petId] = [];
      acc[log.petId].push(log);
      return acc;
    }, {});

    const petsWithLogs = reservations.map((r) => ({
      reservationId: r.id,
      pet: r.pet,
      customer: r.customer,
      todaysFeedingLogs: feedingLogsByPet[r.petId] || [],
    }));

    res.status(200).json({
      status: "success",
      results: petsWithLogs.length,
      data: petsWithLogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log a feeding for a pet
 */
export const createFeedingLog = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const staffId = req.user?.id;
    const { petId, reservationId, date, mealTime, rating, notes, foodType } =
      req.body;

    if (!staffId) {
      return next(new AppError("Staff authentication required", 401));
    }

    if (!petId || !mealTime || rating === undefined) {
      return next(
        new AppError("Pet ID, meal time, and rating are required", 400)
      );
    }

    if (rating < 0 || rating > 4) {
      return next(new AppError("Rating must be between 0 and 4", 400));
    }

    if (!["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(mealTime)) {
      return next(new AppError("Invalid meal time", 400));
    }

    // Use provided date or today
    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    // Check if log already exists for this pet/date/mealTime
    const existing = await prisma.feedingLog.findFirst({
      where: {
        petId,
        date: logDate,
        mealTime: mealTime as MealTime,
      },
    });

    let feedingLog;
    if (existing) {
      // Update existing log
      feedingLog = await prisma.feedingLog.update({
        where: { id: existing.id },
        data: {
          rating,
          notes,
          foodType,
          staffId,
        },
        include: {
          pet: { select: { id: true, name: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } else {
      // Create new log
      feedingLog = await prisma.feedingLog.create({
        data: {
          tenantId,
          petId,
          reservationId,
          date: logDate,
          mealTime: mealTime as MealTime,
          rating,
          notes,
          foodType,
          staffId,
        },
        include: {
          pet: { select: { id: true, name: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    // Auto-flag as picky eater if rating is consistently low
    if (rating <= 1) {
      const recentLogs = await prisma.feedingLog.findMany({
        where: {
          petId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: "desc" },
        take: 5,
      });

      const lowRatings = recentLogs.filter((l) => l.rating <= 1).length;
      if (lowRatings >= 3) {
        await prisma.pet.update({
          where: { id: petId },
          data: { isPickyEater: true },
        });
      }
    }

    res.status(201).json({
      status: "success",
      data: feedingLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feeding logs for a pet
 */
export const getFeedingLogs = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    const where: any = { tenantId, petId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const logs = await prisma.feedingLog.findMany({
      where,
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ date: "desc" }, { mealTime: "asc" }],
      take: parseInt(limit as string),
    });

    res.status(200).json({
      status: "success",
      results: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feeding report for a date range
 */
export const getFeedingReport = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, petId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      date: { gte: start, lte: end },
    };
    if (petId) where.petId = petId;

    const logs = await prisma.feedingLog.findMany({
      where,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            isPickyEater: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ date: "desc" }, { mealTime: "asc" }],
    });

    // Calculate statistics
    const stats = {
      totalLogs: logs.length,
      averageRating:
        logs.length > 0
          ? logs.reduce((sum, l) => sum + l.rating, 0) / logs.length
          : 0,
      lowRatingCount: logs.filter((l) => l.rating <= 1).length,
      pickyEaterCount: new Set(
        logs.filter((l) => l.pet.isPickyEater).map((l) => l.petId)
      ).size,
    };

    res.status(200).json({
      status: "success",
      data: {
        logs,
        stats,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PET MEDICATIONS
// ============================================

/**
 * Get medications for a pet
 */
export const getPetMedications = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const { activeOnly = "true" } = req.query;

    const where: any = { tenantId, petId };
    if (activeOnly === "true") where.isActive = true;

    const medications = await prisma.petMedication.findMany({
      where,
      orderBy: { medicationName: "asc" },
    });

    res.status(200).json({
      status: "success",
      results: medications.length,
      data: medications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a medication for a pet
 */
export const createPetMedication = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const {
      medicationName,
      dosage,
      frequency,
      administrationMethod,
      timeOfDay,
      withFood,
      specialInstructions,
      startDate,
      endDate,
      prescribingVet,
    } = req.body;

    if (!medicationName || !dosage || !frequency || !administrationMethod) {
      return next(
        new AppError(
          "Medication name, dosage, frequency, and administration method are required",
          400
        )
      );
    }

    const medication = await prisma.petMedication.create({
      data: {
        tenantId,
        petId,
        medicationName,
        dosage,
        frequency,
        administrationMethod,
        timeOfDay: timeOfDay || [],
        withFood: withFood || false,
        specialInstructions,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        prescribingVet,
      },
    });

    res.status(201).json({
      status: "success",
      data: medication,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a pet medication
 */
export const updatePetMedication = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { medicationId } = req.params;

    const existing = await prisma.petMedication.findFirst({
      where: { id: medicationId, tenantId },
    });

    if (!existing) {
      return next(new AppError("Medication not found", 404));
    }

    const medication = await prisma.petMedication.update({
      where: { id: medicationId },
      data: req.body,
    });

    res.status(200).json({
      status: "success",
      data: medication,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete (deactivate) a pet medication
 */
export const deletePetMedication = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { medicationId } = req.params;

    const existing = await prisma.petMedication.findFirst({
      where: { id: medicationId, tenantId },
    });

    if (!existing) {
      return next(new AppError("Medication not found", 404));
    }

    await prisma.petMedication.update({
      where: { id: medicationId },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ============================================
// MEDICATION LOGS
// ============================================

/**
 * Get pets needing medication today
 */
export const getPetsNeedingMedication = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all checked-in pets with active medications
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        status: { in: ["CHECKED_IN", "CONFIRMED"] },
        startDate: { lte: tomorrow },
        endDate: { gte: today },
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            breed: true,
            profilePhoto: true,
            medications: {
              where: { isActive: true },
              include: {
                logs: {
                  where: {
                    scheduledTime: { gte: today, lt: tomorrow },
                  },
                  include: {
                    staff: {
                      select: { id: true, firstName: true, lastName: true },
                    },
                  },
                },
              },
            },
          },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Filter to only pets with medications
    const petsWithMeds = reservations
      .filter((r) => r.pet.medications.length > 0)
      .map((r) => ({
        reservationId: r.id,
        pet: r.pet,
        customer: r.customer,
      }));

    res.status(200).json({
      status: "success",
      results: petsWithMeds.length,
      data: petsWithMeds,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log medication administration
 */
export const createMedicationLog = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const staffId = req.user?.id;
    const {
      petId,
      medicationId,
      reservationId,
      scheduledTime,
      wasAdministered,
      notes,
      skippedReason,
    } = req.body;

    if (!staffId) {
      return next(new AppError("Staff authentication required", 401));
    }

    if (!petId || !medicationId || !scheduledTime) {
      return next(
        new AppError(
          "Pet ID, medication ID, and scheduled time are required",
          400
        )
      );
    }

    // Verify medication exists
    const medication = await prisma.petMedication.findFirst({
      where: { id: medicationId, petId, tenantId },
    });

    if (!medication) {
      return next(new AppError("Medication not found", 404));
    }

    const log = await prisma.medicationLog.create({
      data: {
        tenantId,
        petId,
        medicationId,
        reservationId,
        scheduledTime: new Date(scheduledTime),
        administeredAt: wasAdministered ? new Date() : null,
        wasAdministered: wasAdministered || false,
        staffId,
        notes,
        skippedReason: !wasAdministered ? skippedReason : null,
      },
      include: {
        medication: true,
        pet: { select: { id: true, name: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({
      status: "success",
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get medication logs for a pet
 */
export const getMedicationLogs = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    const where: any = { tenantId, petId };

    if (startDate || endDate) {
      where.scheduledTime = {};
      if (startDate) where.scheduledTime.gte = new Date(startDate as string);
      if (endDate) where.scheduledTime.lte = new Date(endDate as string);
    }

    const logs = await prisma.medicationLog.findMany({
      where,
      include: {
        medication: true,
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledTime: "desc" },
      take: parseInt(limit as string),
    });

    res.status(200).json({
      status: "success",
      results: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get medication report for a date range
 */
export const getMedicationReport = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, petId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      scheduledTime: { gte: start, lte: end },
    };
    if (petId) where.petId = petId;

    const logs = await prisma.medicationLog.findMany({
      where,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        },
        medication: true,
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledTime: "desc" },
    });

    // Calculate statistics
    const stats = {
      totalScheduled: logs.length,
      administered: logs.filter((l) => l.wasAdministered).length,
      missed: logs.filter(
        (l) => !l.wasAdministered && new Date(l.scheduledTime) < new Date()
      ).length,
      pending: logs.filter(
        (l) => !l.wasAdministered && new Date(l.scheduledTime) >= new Date()
      ).length,
    };

    res.status(200).json({
      status: "success",
      data: {
        logs,
        stats,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle picky eater flag for a pet
 */
export const togglePickyEater = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const { isPickyEater } = req.body;

    const pet = await prisma.pet.findFirst({
      where: { id: petId, tenantId },
    });

    if (!pet) {
      return next(new AppError("Pet not found", 404));
    }

    const updated = await prisma.pet.update({
      where: { id: petId },
      data: {
        isPickyEater:
          isPickyEater !== undefined ? isPickyEater : !pet.isPickyEater,
      },
    });

    res.status(200).json({
      status: "success",
      data: { id: updated.id, isPickyEater: updated.isPickyEater },
    });
  } catch (error) {
    next(error);
  }
};
