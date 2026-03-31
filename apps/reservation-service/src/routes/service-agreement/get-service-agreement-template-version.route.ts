import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/service-agreement-templates/:id/versions/:version', async (req, res) => {
  try {
    const { id, version } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const versionRecord = await prisma.serviceAgreementVersion.findFirst({
      where: {
        templateId: id,
        version: Number(version),
        tenantId,
      },
    });

    if (!versionRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Version not found',
      });
    }

    res.json({
      status: 'success',
      data: versionRecord,
    });
  } catch (error: any) {
    logger.error('Error fetching template version', {
      templateId: req.params.id,
      version: req.params.version,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch template version',
    });
  }
});
