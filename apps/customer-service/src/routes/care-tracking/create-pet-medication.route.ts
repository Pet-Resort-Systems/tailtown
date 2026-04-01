import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/:petId', async (req: TenantRequest, res, next) => {
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
          'Medication name, dosage, frequency, and administration method are required',
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
      status: 'success',
      data: medication,
    });
  } catch (error) {
    next(error);
  }
});
