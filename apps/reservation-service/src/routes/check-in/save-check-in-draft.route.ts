import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { mapMedicationMethod } from '../../utils/map-medication-util.js';

export const route: Router = expressRouter();
/**
 * Save or update a check-in draft
 * POST /api/check-ins/draft
 */
route.use('/check-ins/draft', async (req, res) => {
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

      if (responses && responses.length > 0) {
        await prisma.checkInResponse.deleteMany({
          where: { checkInId: checkIn.id },
        });
        await prisma.checkInResponse.createMany({
          data: responses.map((response: any) => ({
            checkInId: checkIn.id,
            questionId: response.questionId,
            response: response.response,
          })),
        });
      }

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
                create: responses.map((response: any) => ({
                  questionId: response.questionId,
                  response: response.response,
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
});
