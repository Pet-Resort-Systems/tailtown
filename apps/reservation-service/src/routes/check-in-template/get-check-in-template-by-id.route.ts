import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Get a single check-in template by ID
 * GET /api/check-in-templates/:id
 */
route.use('/check-in-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const template = await prisma.checkInTemplate.findFirst({
      where: { id, tenantId },
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
        message: 'Template not found',
      });
    }

    res.json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error fetching check-in template', {
      templateId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in template',
    });
  }
});
