import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Delete a service agreement template
 * DELETE /api/service-agreement-templates/:id
 */
route.use('/service-agreement-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const existing = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    await prisma.serviceAgreementTemplate.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting service agreement template', {
      templateId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete service agreement template',
    });
  }
});
