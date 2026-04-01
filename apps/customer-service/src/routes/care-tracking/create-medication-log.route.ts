import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/', async (req: TenantRequest, res, next) => {
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
      return next(new AppError('Staff authentication required', 401));
    }

    if (!petId || !medicationId || !scheduledTime) {
      return next(
        new AppError('Pet ID, medication ID, and scheduled time are required', 400)
      );
    }

    const medication = await prisma.petMedication.findFirst({
      where: { id: medicationId, petId, tenantId },
    });

    if (!medication) {
      return next(new AppError('Medication not found', 404));
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
      status: 'success',
      data: log,
    });
  } catch (error) {
    next(error);
  }
});
