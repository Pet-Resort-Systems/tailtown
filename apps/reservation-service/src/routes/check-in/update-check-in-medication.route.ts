import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/check-ins/:checkInId/medications/:medicationId', async (req, res) => {
  const checkInId = req.params.checkInId;
  const medicationId = req.params.medicationId;

  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const medicationData = req.body;

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
      checkInId,
      medicationId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update medication',
    });
  }
});
