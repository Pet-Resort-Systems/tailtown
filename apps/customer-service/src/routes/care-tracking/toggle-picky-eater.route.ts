import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/:petId/picky-eater', async (req: TenantRequest, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const { isPickyEater } = req.body;

    const pet = await prisma.pet.findFirst({
      where: { id: petId, tenantId },
    });

    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }

    const updated = await prisma.pet.update({
      where: { id: petId },
      data: {
        isPickyEater:
          isPickyEater !== undefined ? isPickyEater : !pet.isPickyEater,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { id: updated.id, isPickyEater: updated.isPickyEater },
    });
  } catch (error) {
    next(error);
  }
});
