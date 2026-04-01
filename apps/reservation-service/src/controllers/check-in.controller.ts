import { type Request, type Response } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

/**
 * Check-In Controller
 * Manages pet check-ins with questionnaire responses, medications, and belongings
 */

function getRequiredRouteParam(
  req: Request,
  res: Response,
  param: string | string[] | undefined,
  missingMessage: string
): string | undefined {
  try {
    return assertStringRouteParam(
      param,
      req.originalUrl,
      AppError.validationError,
      missingMessage
    );
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
      return;
    }

    throw error;
  }
}

/**
 * Get all check-ins for a tenant
 * GET /api/check-ins
 */
export const getAllCheckIns = async (req: Request, res: Response) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
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
      orderBy: { checkInTime: 'desc' },
    });

    res.json({
      status: 'success',
      results: checkIns.length,
      data: checkIns,
    });
  } catch (error: any) {
    logger.error('Error fetching check-ins', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-ins',
    });
  }
};

/**
 * Get a single check-in by ID
 * GET /api/check-ins/:id
 */
export const getCheckInById = async (req: Request, res: Response) => {
  try {
    const id = getRequiredRouteParam(
      req,
      res,
      req.params.id,
      'Check-in ID is required'
    );
    if (!id) return;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

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
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
        medications: {
          orderBy: { medicationName: 'asc' },
        },
        belongings: {
          orderBy: { itemType: 'asc' },
        },
        agreement: true,
        activities: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!checkIn) {
      return res.status(404).json({
        status: 'error',
        message: 'Check-in not found',
      });
    }

    res.json({
      status: 'success',
      data: checkIn,
    });
  } catch (error: any) {
    logger.error('Error fetching check-in', {
      checkInId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in',
    });
  }
};

/**
 * Create a new check-in
 * POST /api/check-ins
 */
// Map frontend medication method values to valid enum values
const mapMedicationMethod = (method: string): string => {
  const methodMap: Record<string, string> = {
    ORAL: 'ORAL_PILL',
    oral: 'ORAL_PILL',
    Oral: 'ORAL_PILL',
    PILL: 'ORAL_PILL',
    LIQUID: 'ORAL_LIQUID',
    DROPS: 'EYE_DROPS',
  };
  return methodMap[method] || method;
};

export const createCheckIn = async (req: Request, res: Response) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
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
        status: 'error',
        message: 'Pet ID is required',
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
        status: 'COMPLETED',
        currentStep: 5,
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
                administrationMethod: mapMedicationMethod(
                  med.administrationMethod
                ),
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
      status: 'success',
      data: checkIn,
    });
  } catch (error: any) {
    logger.error('Error creating check-in', {
      petId: req.body.petId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create check-in',
    });
  }
};

/**
 * Update a check-in
 * PUT /api/check-ins/:id
 */
export const updateCheckIn = async (req: Request, res: Response) => {
  try {
    const id = getRequiredRouteParam(
      req,
      res,
      req.params.id,
      'Check-in ID is required'
    );
    if (!id) return;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
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
        status: 'error',
        message: 'Check-in not found',
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
      status: 'success',
      data: checkIn,
    });
  } catch (error: any) {
    logger.error('Error updating check-in', {
      checkInId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update check-in',
    });
  }
};

/**
 * Add a medication to a check-in
 * POST /api/check-ins/:id/medications
 */
export const addMedication = async (req: Request, res: Response) => {
  try {
    const id = getRequiredRouteParam(
      req,
      res,
      req.params.id,
      'Check-in ID is required'
    );
    if (!id) return;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const medicationData = req.body;

    // Verify check-in exists and belongs to tenant
    const checkIn = await prisma.checkIn.findFirst({
      where: { id, tenantId },
    });

    if (!checkIn) {
      return res.status(404).json({
        status: 'error',
        message: 'Check-in not found',
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
      status: 'success',
      data: medication,
    });
  } catch (error: any) {
    logger.error('Error adding medication', {
      checkInId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to add medication',
    });
  }
};

/**
 * Update a medication
 * PUT /api/check-ins/:checkInId/medications/:medicationId
 */
export const updateMedication = async (req: Request, res: Response) => {
  try {
    const checkInId = getRequiredRouteParam(
      req,
      res,
      req.params.checkInId,
      'Check-in ID is required'
    );
    if (!checkInId) return;
    const medicationId = getRequiredRouteParam(
      req,
      res,
      req.params.medicationId,
      'Medication ID is required'
    );
    if (!medicationId) return;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const medicationData = req.body;

    // Verify check-in exists and belongs to tenant
    const checkIn = await prisma.checkIn.findFirst({
      where: { id: checkInId, tenantId },
    });

    if (!checkIn) {
      return res.status(404).json({
        status: 'error',
        message: 'Check-in not found',
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
      status: 'success',
      data: medication,
    });
  } catch (error: any) {
    logger.error('Error updating medication', {
      checkInId: req.params.checkInId,
      medicationId: req.params.medicationId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update medication',
    });
  }
};

/**
 * Delete a medication
 * DELETE /api/check-ins/:checkInId/medications/:medicationId
 */
export const deleteMedication = async (req: Request, res: Response) => {
  try {
    const medicationId = getRequiredRouteParam(
      req,
      res,
      req.params.medicationId,
      'Medication ID is required'
    );
    if (!medicationId) return;

    await prisma.checkInMedication.delete({
      where: { id: medicationId },
    });

    res.json({
      status: 'success',
      message: 'Medication deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting medication', {
      medicationId: req.params.medicationId,
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete medication',
    });
  }
};

/**
 * Mark a belonging as returned
 * PUT /api/check-ins/:checkInId/belongings/:belongingId/return
 */
export const returnBelonging = async (req: Request, res: Response) => {
  try {
    const belongingId = getRequiredRouteParam(
      req,
      res,
      req.params.belongingId,
      'Belonging ID is required'
    );
    if (!belongingId) return;
    const { returnedBy } = req.body;

    const belonging = await prisma.checkInBelonging.update({
      where: { id: belongingId },
      data: {
        returnedAt: new Date(),
        returnedBy,
      },
    });

    res.json({
      status: 'success',
      data: belonging,
    });
  } catch (error: any) {
    logger.error('Error marking belonging as returned', {
      belongingId: req.params.belongingId,
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark belonging as returned',
    });
  }
};

/**
 * Get all pets sharing the same room/resource for a reservation
 * GET /api/check-ins/room-pets/:reservationId
 */
export const getRoomPets = async (req: Request, res: Response) => {
  try {
    const reservationId = getRequiredRouteParam(
      req,
      res,
      req.params.reservationId,
      'Reservation ID is required'
    );
    if (!reservationId) return;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    // Get the reservation to find the resource and date range
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
      select: {
        id: true,
        resourceId: true,
        startDate: true,
        endDate: true,
        petId: true,
        customerId: true,
        status: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservation not found',
      });
    }

    if (!reservation.resourceId) {
      // No room assigned, return just this reservation
      return res.json({
        status: 'success',
        data: {
          reservations: [reservation],
          totalPets: 1,
          resourceId: null,
        },
      });
    }

    // Find all reservations sharing the same resource with overlapping dates
    const roomReservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        resourceId: reservation.resourceId,
        status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
        // Overlapping date range
        AND: [
          { startDate: { lte: reservation.endDate } },
          { endDate: { gte: reservation.startDate } },
        ],
      },
      select: {
        id: true,
        petId: true,
        customerId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { startDate: 'asc' },
    });

    // Get check-in status for each reservation
    const checkInStatuses = await prisma.checkIn.findMany({
      where: {
        tenantId,
        reservationId: { in: roomReservations.map((r) => r.id) },
      },
      select: {
        reservationId: true,
        id: true,
        checkInTime: true,
      },
    });

    const checkInMap = new Map(
      checkInStatuses.map((c) => [c.reservationId, c])
    );

    // Enrich reservations with check-in status
    const enrichedReservations = roomReservations.map((r) => ({
      ...r,
      checkIn: checkInMap.get(r.id) || null,
      isCheckedIn: !!checkInMap.get(r.id),
    }));

    res.json({
      status: 'success',
      data: {
        reservations: enrichedReservations,
        totalPets: roomReservations.length,
        resourceId: reservation.resourceId,
        dateRange: {
          startDate: reservation.startDate,
          endDate: reservation.endDate,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching room pets', {
      reservationId: req.params.reservationId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch room pets',
    });
  }
};

/**
 * Batch check-in multiple pets sharing the same room
 * POST /api/check-ins/batch
 */
export const batchCheckIn = async (req: Request, res: Response) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const { checkIns, sharedData } = req.body;

    if (!checkIns || !Array.isArray(checkIns) || checkIns.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one check-in is required',
      });
    }

    const results = [];
    const errors = [];

    for (const checkInData of checkIns) {
      try {
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
        } = checkInData;

        // Merge shared data with individual data
        const mergedMedications = medications || sharedData?.medications || [];
        const mergedBelongings = belongings || sharedData?.belongings || [];

        const checkIn = await prisma.checkIn.create({
          data: {
            tenantId,
            petId,
            customerId,
            reservationId,
            templateId: templateId || sharedData?.templateId,
            checkInBy: checkInBy || sharedData?.checkInBy,
            checkInNotes,
            checkInTime: new Date(),
            responses: responses
              ? {
                  create: responses.map((response: any) => ({
                    questionId: response.questionId,
                    response: response.response,
                  })),
                }
              : undefined,
            medications:
              mergedMedications.length > 0
                ? {
                    create: mergedMedications.map((med: any) => ({
                      medicationName: med.medicationName,
                      dosage: med.dosage,
                      frequency: med.frequency,
                      administrationMethod: med.administrationMethod,
                      timeOfDay: med.timeOfDay,
                      withFood: med.withFood || false,
                      specialInstructions: med.specialInstructions,
                      startDate: med.startDate
                        ? new Date(med.startDate)
                        : undefined,
                      endDate: med.endDate ? new Date(med.endDate) : undefined,
                      prescribingVet: med.prescribingVet,
                      notes: med.notes,
                    })),
                  }
                : undefined,
            belongings:
              mergedBelongings.length > 0
                ? {
                    create: mergedBelongings.map((item: any) => ({
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
            responses: true,
            medications: true,
            belongings: true,
          },
        });

        // Update reservation status to CHECKED_IN
        if (reservationId) {
          await prisma.reservation.update({
            where: { id: reservationId },
            data: { status: 'CHECKED_IN' },
          });
        }

        results.push({ petId, checkIn, success: true });
      } catch (petError: any) {
        errors.push({
          petId: checkInData.petId,
          error: petError.message,
          success: false,
        });
      }
    }

    res.status(201).json({
      status: errors.length === 0 ? 'success' : 'partial',
      data: {
        successful: results,
        failed: errors,
        totalProcessed: checkIns.length,
        successCount: results.length,
        errorCount: errors.length,
      },
    });
  } catch (error: any) {
    logger.error('Error in batch check-in', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to process batch check-in',
    });
  }
};

/**
 * Save or update a check-in draft
 * POST /api/check-ins/draft
 */
export const saveDraft = async (req: Request, res: Response) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const {
      checkInId,
      petId,
      customerId,
      reservationId,
      templateId,
      currentStep,
      responses,
      medications,
      belongings,
      checkInNotes,
    } = req.body;

    if (!petId || !reservationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Pet ID and Reservation ID are required',
      });
    }

    let checkIn;

    if (checkInId) {
      // Update existing draft
      checkIn = await prisma.checkIn.update({
        where: { id: checkInId },
        data: {
          currentStep: currentStep || 0,
          checkInNotes,
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
        },
        include: {
          responses: true,
          medications: true,
          belongings: true,
        },
      });

      // Update responses - delete old and create new
      if (responses && responses.length > 0) {
        await prisma.checkInResponse.deleteMany({
          where: { checkInId: checkIn.id },
        });
        await prisma.checkInResponse.createMany({
          data: responses.map((r: any) => ({
            checkInId: checkIn.id,
            questionId: r.questionId,
            response: r.response,
          })),
        });
      }

      // Update medications - delete old and create new
      if (medications && medications.length > 0) {
        await prisma.checkInMedication.deleteMany({
          where: { checkInId: checkIn.id },
        });
        await prisma.checkInMedication.createMany({
          data: medications.map((med: any) => ({
            checkInId: checkIn.id,
            medicationName: med.medicationName,
            dosage: med.dosage,
            frequency: med.frequency,
            administrationMethod: mapMedicationMethod(med.administrationMethod),
            timeOfDay: med.timeOfDay,
            withFood: med.withFood || false,
            specialInstructions: med.specialInstructions,
            prescribingVet: med.prescribingVet,
            notes: med.notes,
          })),
        });
      }

      // Update belongings - delete old and create new
      if (belongings && belongings.length > 0) {
        await prisma.checkInBelonging.deleteMany({
          where: { checkInId: checkIn.id },
        });
        await prisma.checkInBelonging.createMany({
          data: belongings.map((item: any) => ({
            checkInId: checkIn.id,
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity || 1,
            color: item.color,
            brand: item.brand,
            notes: item.notes,
          })),
        });
      }
    } else {
      // Create new draft
      checkIn = await prisma.checkIn.create({
        data: {
          tenantId,
          petId,
          customerId,
          reservationId,
          templateId,
          currentStep: currentStep || 0,
          checkInNotes,
          status: 'DRAFT',
          checkInTime: new Date(),
          responses: responses
            ? {
                create: responses.map((r: any) => ({
                  questionId: r.questionId,
                  response: r.response,
                })),
              }
            : undefined,
          medications: medications
            ? {
                create: medications.map((med: any) => ({
                  medicationName: med.medicationName,
                  dosage: med.dosage,
                  frequency: med.frequency,
                  administrationMethod: mapMedicationMethod(
                    med.administrationMethod
                  ),
                  timeOfDay: med.timeOfDay,
                  withFood: med.withFood || false,
                  specialInstructions: med.specialInstructions,
                  prescribingVet: med.prescribingVet,
                  notes: med.notes,
                })),
              }
            : undefined,
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
          responses: true,
          medications: true,
          belongings: true,
        },
      });
    }

    // Fetch updated check-in with all relations
    const updatedCheckIn = await prisma.checkIn.findUnique({
      where: { id: checkIn.id },
      include: {
        responses: {
          include: { question: true },
        },
        medications: true,
        belongings: true,
      },
    });

    res.json({
      status: 'success',
      data: updatedCheckIn,
    });
  } catch (error: any) {
    logger.error('Error saving draft', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to save draft',
    });
  }
};

/**
 * Get draft check-in for a reservation
 * GET /api/check-ins/draft/:reservationId
 */
export const getDraft = async (req: Request, res: Response) => {
  try {
    const reservationId = getRequiredRouteParam(
      req,
      res,
      req.params.reservationId,
      'Reservation ID is required'
    );
    if (!reservationId) return;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    // Find existing draft or in-progress check-in for this reservation
    const checkIn = await prisma.checkIn.findFirst({
      where: {
        tenantId,
        reservationId,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
      },
      include: {
        responses: {
          include: { question: true },
        },
        medications: true,
        belongings: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!checkIn) {
      return res.json({
        status: 'success',
        data: null,
      });
    }

    res.json({
      status: 'success',
      data: checkIn,
    });
  } catch (error: any) {
    logger.error('Error fetching draft', {
      reservationId: req.params.reservationId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch draft',
    });
  }
};
