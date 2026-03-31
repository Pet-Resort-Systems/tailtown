import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/service-agreements', async (req, res) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const { valid, limit = 50, offset = 0, search } = req.query;

    const where: any = { tenantId };

    if (valid === 'true') {
      where.isValid = true;
    } else if (valid === 'false') {
      where.isValid = false;
    }

    if (search) {
      where.OR = [
        { signedBy: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [agreements, total] = await Promise.all([
      prisma.serviceAgreement.findMany({
        where,
        orderBy: { signedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.serviceAgreement.count({ where }),
    ]);

    res.json({
      status: 'success',
      results: agreements.length,
      total,
      data: agreements,
    });
  } catch (error: any) {
    logger.error('Error fetching all agreements', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch agreements',
    });
  }
});
