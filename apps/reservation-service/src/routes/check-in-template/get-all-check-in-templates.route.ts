import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/check-in-templates', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { active } = req.query;

    const where: any = { tenantId };
    if (active === 'true') {
      where.isActive = true;
    }

    const templates = await prisma.checkInTemplate.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });

    res.json({
      status: 'success',
      results: templates.length,
      data: templates,
    });
  } catch (error: any) {
    logger.error('Error fetching check-in templates', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in templates',
    });
  }
});
