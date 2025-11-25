import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";

/**
 * Check-In Controller
 * Manages pet check-ins with questionnaire responses, medications, and belongings
 */

/**
 * Get all check-ins for a tenant
 * GET /api/check-ins
 */
export const getAllCheckIns = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { petId, reservationId, startDate, endDate } = req.query;

    const where: any = { tenantId };

    if (petId) {
      where.petId = petId as string;
    }

    if (reservationId) {
      where.reservationId = reservationId as string;
    }

    if (startDate || endDate) {
      where.checkInTime = {};
      if (startDate) {
        where.checkInTime.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.checkInTime.lte = new Date(endDate as string);
      }
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        // pet relation removed - use customerServiceClient.getPet(petId, tenantId) if needed
        reservation: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        responses: {
          include: {
            question: {
              select: {
                questionText: true,
                questionType: true,
              },
            },
          },
        },
        medications: true,
        belongings: true,
        agreement: true,
      },
      orderBy: { checkInTime: "desc" },
    });

    res.json({
      status: "success",
      results: checkIns.length,
      data: checkIns,
    });
  } catch (error: any) {
    logger.error("Error fetching check-ins", {
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch check-ins",
    });
  }
};

/**
 * Get a single check-in by ID
 * GET /api/check-ins/:id
 */
export const getCheckInById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string;

    const checkIn = await prisma.checkIn.findFirst({
      where: { id, tenantId },
      include: {
        // pet relation removed - use customerServiceClient.getPet(petId, tenantId) if needed
        reservation: true,
        template: {
          include: {
            sections: {
              include: {
                questions: {
                  orderBy: { order: "asc" },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
        medications: {
          orderBy: { medicationName: "asc" },
        },
        belongings: {
          orderBy: { itemType: "asc" },
        },
        agreement: true,
        activities: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!checkIn) {
      return res.status(404).json({
        status: "error",
        message: "Check-in not found",
      });
    }

    res.json({
      status: "success",
      data: checkIn,
    });
  } catch (error: any) {
    logger.error("Error fetching check-in", {
      checkInId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch check-in",
    });
  }
};

/**
 * Create a new check-in
 * POST /api/check-ins
 */
export const createCheckIn = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const {
      petId,
      customerId,
      reservationId,
      templateId,
      checkInBy,
      checkInNotes,
      responses,
      medications,
      belongings,
    } = req.body;

    // Validate required fields
    if (!petId) {
      return res.status(400).json({
        status: "error",
        message: "Pet ID is required",
      });
    }

    // Create the check-in with all related data
    const checkIn = await prisma.checkIn.create({
      data: {
        tenantId,
        petId,
        customerId,
        reservationId,
        templateId,
        checkInBy,
        checkInNotes,
        checkInTime: new Date(),
        // Create responses
        responses: responses
          ? {
              create: responses.map((response: any) => ({
                questionId: response.questionId,
                response: response.response,
              })),
            }
          : undefined,
        // Create medications
        medications: medications
          ? {
              create: medications.map((med: any) => ({
                medicationName: med.medicationName,
                dosage: med.dosage,
                frequency: med.frequency,
                administrationMethod: med.administrationMethod,
                timeOfDay: med.timeOfDay,
                withFood: med.withFood || false,
                specialInstructions: med.specialInstructions,
                startDate: med.startDate ? new Date(med.startDate) : undefined,
                endDate: med.endDate ? new Date(med.endDate) : undefined,
                prescribingVet: med.prescribingVet,
                notes: med.notes,
              })),
            }
          : undefined,
        // Create belongings
        belongings: belongings
          ? {
              create: belongings.map((item: any) => ({
                itemType: item.itemType,
                description: item.description,
                quantity: item.quantity || 1,
                color: item.color,
                brand: item.brand,
                notes: item.notes,
              })),
            }
          : undefined,
      },
      include: {
        // pet relation removed - use customerServiceClient.getPet(petId, tenantId) if needed
        responses: {
          include: {
            question: true,
          },
        },
        medications: true,
        belongings: true,
      },
    });

    res.status(201).json({
      status: "success",
      data: checkIn,
    });
  } catch (error: any) {
    logger.error("Error creating check-in", {
      petId: req.body.petId,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to create check-in",
    });
  }
};

/**
 * Update a check-in
 * PUT /api/check-ins/:id
 */
export const updateCheckIn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string;
    const {
      checkInNotes,
      checkOutNotes,
      checkOutBy,
      checkOutTime,
      foodProvided,
      medicationGiven,
      medicationNotes,
      behaviorDuringStay,
      photosTaken,
      photosShared,
    } = req.body;

    // Verify check-in exists and belongs to tenant
    const existing = await prisma.checkIn.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: "error",
        message: "Check-in not found",
      });
    }

    const checkIn = await prisma.checkIn.update({
      where: { id },
      data: {
        checkInNotes,
        checkOutNotes,
        checkOutBy,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        foodProvided,
        medicationGiven,
        medicationNotes,
        behaviorDuringStay,
        photosTaken,
        photosShared,
      },
      include: {
        // pet relation removed - use customerServiceClient.getPet(petId, tenantId) if needed
        responses: {
          include: {
            question: true,
          },
        },
        medications: true,
        belongings: true,
        agreement: true,
      },
    });

    res.json({
      status: "success",
      data: checkIn,
    });
  } catch (error: any) {
    logger.error("Error updating check-in", {
      checkInId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to update check-in",
    });
  }
};

/**
 * Add a medication to a check-in
 * POST /api/check-ins/:id/medications
 */
export const addMedication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string;
    const medicationData = req.body;

    // Verify check-in exists and belongs to tenant
    const checkIn = await prisma.checkIn.findFirst({
      where: { id, tenantId },
    });

    if (!checkIn) {
      return res.status(404).json({
        status: "error",
        message: "Check-in not found",
      });
    }

    const medication = await prisma.checkInMedication.create({
      data: {
        checkInId: id,
        medicationName: medicationData.medicationName,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        administrationMethod: medicationData.administrationMethod,
        timeOfDay: medicationData.timeOfDay,
        withFood: medicationData.withFood || false,
        specialInstructions: medicationData.specialInstructions,
        startDate: medicationData.startDate
          ? new Date(medicationData.startDate)
          : undefined,
        endDate: medicationData.endDate
          ? new Date(medicationData.endDate)
          : undefined,
        prescribingVet: medicationData.prescribingVet,
        notes: medicationData.notes,
      },
    });

    res.status(201).json({
      status: "success",
      data: medication,
    });
  } catch (error: any) {
    logger.error("Error adding medication", {
      checkInId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to add medication",
    });
  }
};

/**
 * Update a medication
 * PUT /api/check-ins/:checkInId/medications/:medicationId
 */
export const updateMedication = async (req: Request, res: Response) => {
  try {
    const { checkInId, medicationId } = req.params;
    const tenantId = req.headers["x-tenant-id"] as string;
    const medicationData = req.body;

    // Verify check-in exists and belongs to tenant
    const checkIn = await prisma.checkIn.findFirst({
      where: { id: checkInId, tenantId },
    });

    if (!checkIn) {
      return res.status(404).json({
        status: "error",
        message: "Check-in not found",
      });
    }

    const medication = await prisma.checkInMedication.update({
      where: { id: medicationId },
      data: {
        medicationName: medicationData.medicationName,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        administrationMethod: medicationData.administrationMethod,
        timeOfDay: medicationData.timeOfDay,
        withFood: medicationData.withFood,
        specialInstructions: medicationData.specialInstructions,
        startDate: medicationData.startDate
          ? new Date(medicationData.startDate)
          : undefined,
        endDate: medicationData.endDate
          ? new Date(medicationData.endDate)
          : undefined,
        prescribingVet: medicationData.prescribingVet,
        notes: medicationData.notes,
      },
    });

    res.json({
      status: "success",
      data: medication,
    });
  } catch (error: any) {
    logger.error("Error updating medication", {
      checkInId: req.params.checkInId,
      medicationId: req.params.medicationId,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to update medication",
    });
  }
};

/**
 * Delete a medication
 * DELETE /api/check-ins/:checkInId/medications/:medicationId
 */
export const deleteMedication = async (req: Request, res: Response) => {
  try {
    const { medicationId } = req.params;

    await prisma.checkInMedication.delete({
      where: { id: medicationId },
    });

    res.json({
      status: "success",
      message: "Medication deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error deleting medication", {
      medicationId: req.params.medicationId,
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to delete medication",
    });
  }
};

/**
 * Mark a belonging as returned
 * PUT /api/check-ins/:checkInId/belongings/:belongingId/return
 */
export const returnBelonging = async (req: Request, res: Response) => {
  try {
    const { belongingId } = req.params;
    const { returnedBy } = req.body;

    const belonging = await prisma.checkInBelonging.update({
      where: { id: belongingId },
      data: {
        returnedAt: new Date(),
        returnedBy,
      },
    });

    res.json({
      status: "success",
      data: belonging,
    });
  } catch (error: any) {
    logger.error("Error marking belonging as returned", {
      belongingId: req.params.belongingId,
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to mark belonging as returned",
    });
  }
};
