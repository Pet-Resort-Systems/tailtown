import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { mapMedicationMethod } from './map-medication-method.js';

export const route: Router = expressRouter();

route.use('/check-ins', async (req, res) => {
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

    if (!petId) {
      return res.status(400).json({
        status: 'error',
        message: 'Pet ID is required',
      });
    }

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
                startDate: med.startDate ? new Date(med.startDate) : undefined,
                endDate: med.endDate ? new Date(med.endDate) : undefined,
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
});
