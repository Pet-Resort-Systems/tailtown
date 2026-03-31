import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Add a medication to a check-in
 * POST /api/check-ins/:id/medications
 */
route.use('/check-ins/:id/medications', async (req, res) => {
  const id = req.params.id;

  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const medicationData = req.body;

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
      checkInId: id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to add medication',
    });
  }
});
