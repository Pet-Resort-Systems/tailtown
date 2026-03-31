import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Create a new service agreement template
 * POST /api/service-agreement-templates
 */
route.use('/service-agreement-templates', async (req, res) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const staffId = (req as any).user?.id;
    const {
      name,
      content,
      isDefault,
      requiresInitials = true,
      requiresSignature = true,
      questions,
      effectiveDate,
      expiresAt,
    } = req.body;

    if (isDefault) {
      await prisma.serviceAgreementTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.serviceAgreementTemplate.create({
      data: {
        tenantId,
        name,
        content,
        version: 1,
        isDefault: isDefault || false,
        isActive: true,
        requiresInitials,
        requiresSignature,
        questions: questions || [],
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: staffId,
      },
    });

    await prisma.serviceAgreementVersion.create({
      data: {
        tenantId,
        templateId: template.id,
        version: 1,
        content,
        changeNotes: 'Initial version',
        createdBy: staffId,
      },
    });

    res.status(201).json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error creating service agreement template', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create service agreement template',
    });
  }
});
