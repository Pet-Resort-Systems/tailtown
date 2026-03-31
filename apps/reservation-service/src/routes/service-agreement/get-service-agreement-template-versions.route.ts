import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/service-agreement-templates/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const template = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    const versions = await prisma.serviceAgreementVersion.findMany({
      where: { templateId: id, tenantId },
      orderBy: { version: 'desc' },
    });

    res.json({
      status: 'success',
      results: versions.length,
      data: versions,
    });
  } catch (error: any) {
    logger.error('Error fetching template versions', {
      templateId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch template versions',
    });
  }
});
