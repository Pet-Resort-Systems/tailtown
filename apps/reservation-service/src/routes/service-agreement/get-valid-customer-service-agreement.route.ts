import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/service-agreements/customer/:customerId/valid', async (req, res) => {
  try {
    const { customerId } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const validAgreement = await prisma.serviceAgreement.findFirst({
      where: {
        customerId,
        tenantId,
        isValid: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { signedAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
      },
    });

    res.json({
      status: 'success',
      data: {
        hasValidAgreement: !!validAgreement,
        agreement: validAgreement,
      },
    });
  } catch (error: any) {
    logger.error('Error checking customer agreement', {
      customerId: req.params.customerId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to check customer agreement',
    });
  }
});
