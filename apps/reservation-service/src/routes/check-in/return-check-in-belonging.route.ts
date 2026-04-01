import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Mark a belonging as returned
 * PUT /api/check-ins/:checkInId/belongings/:belongingId/return
 */
route.use(
  '/check-ins/:checkInId/belongings/:belongingId/return',
  async (req, res) => {
    const belongingId = req.params.belongingId;

    try {
      const { returnedBy } = req.body;

      const belonging = await prisma.checkInBelonging.update({
        where: { id: belongingId },
        data: {
          returnedAt: new Date(),
          returnedBy,
        },
      });

      res.json({
        status: 'success',
        data: belonging,
      });
    } catch (error: any) {
      logger.error('Error marking belonging as returned', {
        belongingId,
        error: error.message,
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to mark belonging as returned',
      });
    }
  }
);
