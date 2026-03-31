import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/check-ins/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const checkIn = await prisma.checkIn.findFirst({
      where: { id, tenantId },
      include: {
        reservation: true,
        template: {
          include: {
            sections: {
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
        medications: {
          orderBy: { medicationName: 'asc' },
        },
        belongings: {
          orderBy: { itemType: 'asc' },
        },
        agreement: true,
        activities: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!checkIn) {
      return res.status(404).json({
        status: 'error',
        message: 'Check-in not found',
      });
    }

    res.json({
      status: 'success',
      data: checkIn,
    });
  } catch (error: any) {
    logger.error('Error fetching check-in', {
      checkInId: id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in',
    });
  }
});
