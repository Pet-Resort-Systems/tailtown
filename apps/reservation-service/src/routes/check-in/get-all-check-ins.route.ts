import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Get all check-ins for a tenant
 * GET /api/check-ins
 */
route.use('/check-ins', async (req, res) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const { petId, reservationId, startDate, endDate } = req.query;

    const where: any = { tenantId };

    if (petId) {
      where.petId = petId as string;
    }

    if (reservationId) {
      where.reservationId = reservationId as string;
    }

    if (startDate || endDate) {
      where.checkInTime = {};
      if (startDate) {
        where.checkInTime.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.checkInTime.lte = new Date(endDate as string);
      }
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        reservation: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        responses: {
          include: {
            question: {
              select: {
                questionText: true,
                questionType: true,
              },
            },
          },
        },
        medications: true,
        belongings: true,
        agreement: true,
      },
      orderBy: { checkInTime: 'desc' },
    });

    res.json({
      status: 'success',
      results: checkIns.length,
      data: checkIns,
    });
  } catch (error: any) {
    logger.error('Error fetching check-ins', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-ins',
    });
  }
});
