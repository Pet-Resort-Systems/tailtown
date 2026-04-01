import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/:petId', async (req: TenantRequest, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const { petId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    const where: any = { tenantId, petId };

    if (startDate || endDate) {
      where.scheduledTime = {};
      if (startDate) where.scheduledTime.gte = new Date(startDate as string);
      if (endDate) where.scheduledTime.lte = new Date(endDate as string);
    }

    const logs = await prisma.medicationLog.findMany({
      where,
      include: {
        medication: true,
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledTime: 'desc' },
      take: parseInt(limit as string),
    });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});
