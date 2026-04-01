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
      date: { gte: start, lte: end },
    };
    if (petId) where.petId = petId;

    const logs = await prisma.feedingLog.findMany({
      where,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            isPickyEater: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ date: 'desc' }, { mealTime: 'asc' }],
    });

    const stats = {
      totalLogs: logs.length,
      averageRating:
        logs.length > 0
          ? logs.reduce((sum, log) => sum + log.rating, 0) / logs.length
          : 0,
      lowRatingCount: logs.filter((log) => log.rating <= 1).length,
      pickyEaterCount: new Set(
        logs.filter((log) => log.pet.isPickyEater).map((log) => log.petId)
      ).size,
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
