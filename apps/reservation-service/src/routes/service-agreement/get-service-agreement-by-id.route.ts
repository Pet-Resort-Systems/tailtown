import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Get a single agreement by ID
 * GET /api/service-agreements/:id
 */
route.use('/service-agreements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const agreement = await prisma.serviceAgreement.findFirst({
      where: { id, tenantId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        checkIn: {
          select: {
            id: true,
            checkInTime: true,
            reservationId: true,
          },
        },
      },
    });

    if (!agreement) {
      return res.status(404).json({
        status: 'error',
        message: 'Agreement not found',
      });
    }

    res.json({
      status: 'success',
      data: agreement,
    });
  } catch (error: any) {
    logger.error('Error fetching agreement', {
      agreementId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch agreement',
    });
  }
});
