import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Delete a check-in template
 * DELETE /api/check-in-templates/:id
 */
route.use('/check-in-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const existing = await prisma.checkInTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    const checkInsUsingTemplate = await prisma.checkIn.count({
      where: { templateId: id },
    });

    if (checkInsUsingTemplate > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete template. It is being used by ${checkInsUsingTemplate} check-in(s). Consider deactivating instead.`,
      });
    }

    await prisma.checkInTemplate.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting check-in template', {
      templateId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete check-in template',
    });
  }
});
