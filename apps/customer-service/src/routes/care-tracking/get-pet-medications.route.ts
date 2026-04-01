import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/:petId', async (req: TenantRequest, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const where: any = { tenantId, petId };
    if (activeOnly === 'true') where.isActive = true;

    const medications = await prisma.petMedication.findMany({
      where,
      orderBy: { medicationName: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      results: medications.length,
      data: medications,
    });
  } catch (error) {
    next(error);
  }
});
