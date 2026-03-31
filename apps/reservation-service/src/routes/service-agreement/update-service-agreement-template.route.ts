import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/service-agreement-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const staffId = (req as any).user?.id;
    const {
      name,
      content,
      isActive,
      isDefault,
      requiresInitials,
      requiresSignature,
      questions,
      effectiveDate,
      expiresAt,
      changeNotes,
    } = req.body;

    const existing = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    if (isDefault && !existing.isDefault) {
      await prisma.serviceAgreementTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const contentChanged = content && content !== existing.content;
    const newVersion = contentChanged ? existing.version + 1 : existing.version;

    const template = await prisma.serviceAgreementTemplate.update({
      where: { id },
      data: {
        name,
        content,
        version: newVersion,
        isActive,
        isDefault,
        requiresInitials,
        requiresSignature,
        questions: questions !== undefined ? questions : undefined,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        updatedBy: staffId,
      },
    });

    if (contentChanged) {
      await prisma.serviceAgreementVersion.create({
        data: {
          tenantId,
          templateId: id,
          version: newVersion,
          content,
          changeNotes: changeNotes || `Updated to version ${newVersion}`,
          createdBy: staffId,
        },
      });
    }

    res.json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error updating service agreement template', {
      templateId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update service agreement template',
    });
  }
});
