import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/', async (req: TenantRequest, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, petId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      scheduledTime: { gte: start, lte: end },
    };
    if (petId) where.petId = petId;

    const logs = await prisma.medicationLog.findMany({
      where,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        },
        medication: true,
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledTime: 'desc' },
    });

    const stats = {
      totalScheduled: logs.length,
      administered: logs.filter((log) => log.wasAdministered).length,
      missed: logs.filter(
        (log) => !log.wasAdministered && new Date(log.scheduledTime) < new Date()
      ).length,
      pending: logs.filter(
        (log) => !log.wasAdministered && new Date(log.scheduledTime) >= new Date()
      ).length,
    };

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        stats,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
});
