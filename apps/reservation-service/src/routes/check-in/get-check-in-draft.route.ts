import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/check-ins/draft/:reservationId', async (req, res) => {
  const reservationId = req.params.reservationId;

  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const checkIn = await prisma.checkIn.findFirst({
      where: {
        tenantId,
        reservationId,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
      },
      include: {
        responses: {
          include: { question: true },
        },
        medications: true,
        belongings: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!checkIn) {
      return res.json({
        status: 'success',
        data: null,
      });
    }

    res.json({
      status: 'success',
      data: checkIn,
    });
  } catch (error: any) {
    logger.error('Error fetching draft', {
      reservationId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch draft',
    });
  }
});
