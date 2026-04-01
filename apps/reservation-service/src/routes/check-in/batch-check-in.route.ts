import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Batch check-in multiple pets sharing the same room
 * POST /api/check-ins/batch
 */
route.use('/check-ins/batch', async (req, res) => {
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
});
