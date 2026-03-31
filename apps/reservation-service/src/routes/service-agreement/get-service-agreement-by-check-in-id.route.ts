import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/service-agreements/check-in/:checkInId', async (req, res) => {
  try {
    const { checkInId } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const agreement = await prisma.serviceAgreement.findFirst({
      where: {
        checkInId,
        tenantId,
      },
      include: {
        checkIn: {
          include: {
            reservation: true,
          },
        },
      },
    });

    if (!agreement) {
      return res.status(404).json({
        status: 'error',
        message: 'Service agreement not found',
      });
    }

    res.json({
      status: 'success',
      data: agreement,
    });
  } catch (error: any) {
    logger.error('Error fetching service agreement', {
      checkInId: req.params.checkInId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement',
    });
  }
});
