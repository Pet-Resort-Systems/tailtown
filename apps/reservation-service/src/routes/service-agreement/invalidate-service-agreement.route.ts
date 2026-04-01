import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Invalidate an agreement
 * PUT /api/service-agreements/:id/invalidate
 */
route.use('/service-agreements/:id/invalidate', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const staffId = (req as any).user?.id;
    const { reason } = req.body;

    const existing = await prisma.serviceAgreement.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Agreement not found',
      });
    }

    if (!existing.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Agreement is already invalidated',
      });
    }

    const agreement = await prisma.serviceAgreement.update({
      where: { id },
      data: {
        isValid: false,
        invalidatedAt: new Date(),
        invalidatedBy: staffId,
        invalidReason: reason,
      },
    });

    logger.info('Service agreement invalidated', {
      agreementId: id,
      invalidatedBy: staffId,
      reason,
      tenantId,
    });

    res.json({
      status: 'success',
      data: agreement,
    });
  } catch (error: any) {
    logger.error('Error invalidating agreement', {
      agreementId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to invalidate agreement',
    });
  }
});
