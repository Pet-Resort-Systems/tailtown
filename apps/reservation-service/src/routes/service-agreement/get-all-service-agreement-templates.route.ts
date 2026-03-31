import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Get all service agreement templates for a tenant
 * GET /api/service-agreement-templates
 */
route.use('/service-agreement-templates', async (req, res) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const { active } = req.query;

    const where: any = { tenantId };
    if (active === 'true') {
      where.isActive = true;
    }

    const templates = await prisma.serviceAgreementTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      status: 'success',
      results: templates.length,
      data: templates,
    });
  } catch (error: any) {
    logger.error('Error fetching service agreement templates', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement templates',
    });
  }
});
