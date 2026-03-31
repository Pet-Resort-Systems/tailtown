import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/check-in-templates/default', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    const template = await prisma.checkInTemplate.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
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
    });

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
    logger.error('Error fetching default template', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch default template',
    });
  }
});
