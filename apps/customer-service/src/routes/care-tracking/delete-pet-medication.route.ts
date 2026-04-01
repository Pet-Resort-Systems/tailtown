import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/:medicationId', async (req: TenantRequest, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const { medicationId } = req.params;

    const existing = await prisma.petMedication.findFirst({
      where: { id: medicationId, tenantId },
    });

    if (!existing) {
      return next(new AppError('Medication not found', 404));
    }

    await prisma.petMedication.update({
      where: { id: medicationId },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
