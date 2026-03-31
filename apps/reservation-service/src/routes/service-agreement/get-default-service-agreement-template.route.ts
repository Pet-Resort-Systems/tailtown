import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/service-agreement-templates/default', async (req, res) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    let template = await prisma.serviceAgreementTemplate.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
    });

    if (!template) {
      const allTemplates = await prisma.serviceAgreementTemplate.findMany({
        where: {
          tenantId,
          isActive: true,
        },
      });

      if (allTemplates.length === 1) {
        template = await prisma.serviceAgreementTemplate.update({
          where: { id: allTemplates[0].id },
          data: { isDefault: true },
        });
        logger.info('Auto-set single template as default', {
          tenantId,
          templateId: template.id,
        });
      }
    }

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'No default template found',
      });
    }

    res.json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error fetching default service agreement template', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch default service agreement template',
    });
  }
});
