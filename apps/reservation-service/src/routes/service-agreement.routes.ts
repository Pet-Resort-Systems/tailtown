import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

// Get all agreement templates
router.get('/service-agreement-templates', async (req, res) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const { active } = req.query;

    const where: any = { tenantId };
    if (active === 'true') {
      where.isActive = true;
    }

    const templates = await prisma.serviceAgreementTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      status: 'success',
      results: templates.length,
      data: templates,
    });
  } catch (error: any) {
    logger.error('Error fetching service agreement templates', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement templates',
    });
  }
});

// Get default agreement template
router.get('/service-agreement-templates/default', async (req, res) => {
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

// Get agreement template by ID
router.get('/service-agreement-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const template = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId },
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
    logger.error('Error fetching service agreement template', {
      templateId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement template',
    });
  }
});

// Create agreement template
router.post('/service-agreement-templates', async (req, res) => {
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

// Update agreement template
router.put('/service-agreement-templates/:id', async (req, res) => {
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

// Delete agreement template
router.delete('/service-agreement-templates/:id', async (req, res) => {
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

// Create signed agreement
router.post('/service-agreements', async (req, res) => {
  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const {
      checkInId,
      customerId,
      petId,
      templateId,
      agreementText,
      initials,
      signature,
      signedBy,
      questionResponses,
      signatureMethod,
      ipAddress,
      userAgent,
      expiresAt,
    } = req.body;

    if (!customerId || !agreementText || !signature || !signedBy) {
      logger.warn('Service agreement validation failed', {
        hasCustomerId: !!customerId,
        hasAgreementText: !!agreementText,
        hasSignature: !!signature,
        signatureLength: signature?.length || 0,
        hasSignedBy: !!signedBy,
        signedBy,
      });
      return res.status(400).json({
        status: 'error',
        message:
          'Customer ID, agreement text, signature, and signer name are required',
      });
    }

    if (checkInId) {
      const checkIn = await prisma.checkIn.findFirst({
        where: { id: checkInId, tenantId },
      });

      if (!checkIn) {
        return res.status(404).json({
          status: 'error',
          message: 'Check-in not found',
        });
      }

      const existingAgreement = await prisma.serviceAgreement.findUnique({
        where: { checkInId },
      });

      if (existingAgreement) {
        return res.status(400).json({
          status: 'error',
          message: 'Service agreement already exists for this check-in',
        });
      }
    }

    let templateVersion: number | null = null;
    if (templateId) {
      const template = await prisma.serviceAgreementTemplate.findFirst({
        where: { id: templateId, tenantId },
      });
      if (template) {
        templateVersion = template.version;
      }
    }

    const agreement = await prisma.serviceAgreement.create({
      data: {
        tenantId,
        checkInId: checkInId || null,
        customerId,
        petId: petId || null,
        templateId: templateId || null,
        templateVersion,
        agreementText,
        initials: initials || [],
        signature,
        signedBy,
        questionResponses: questionResponses || [],
        signatureMethod: signatureMethod || 'device',
        signedAt: new Date(),
        acknowledgedAt: new Date(),
        ipAddress,
        userAgent,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isValid: true,
      },
    });

    logger.info('Service agreement created', {
      agreementId: agreement.id,
      customerId,
      templateId,
      tenantId,
    });

    res.status(201).json({
      status: 'success',
      data: agreement,
    });
  } catch (error: any) {
    logger.error('Error creating service agreement', {
      customerId: req.body.customerId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create service agreement',
    });
  }
});

// Get all signed agreements for tenant
router.get('/service-agreements', async (req, res) => {
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

// Get agreement by check-in ID
router.get('/service-agreements/check-in/:checkInId', async (req, res) => {
  try {
    const { checkInId } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const agreement = await prisma.serviceAgreement.findFirst({
      where: {
        checkInId,
        tenantId,
      },
      include: {
        checkIn: {
          include: {
            reservation: true,
          },
        },
      },
    });

    if (!agreement) {
      return res.status(404).json({
        status: 'error',
        message: 'Service agreement not found',
      });
    }

    res.json({
      status: 'success',
      data: agreement,
    });
  } catch (error: any) {
    logger.error('Error fetching service agreement', {
      checkInId: req.params.checkInId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement',
    });
  }
});

// Get all agreements for a customer
router.get('/service-agreements/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const { valid, limit = 50, offset = 0 } = req.query;

    const where: any = {
      customerId,
      tenantId,
    };

    if (valid === 'true') {
      where.isValid = true;
    } else if (valid === 'false') {
      where.isValid = false;
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
    logger.error('Error fetching customer agreements', {
      customerId: req.params.customerId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer agreements',
    });
  }
});

// Check if customer has valid agreement
router.get(
  '/service-agreements/customer/:customerId/valid',
  async (req, res) => {
    try {
      const { customerId } = req.params;
      const tenantId =
        (req as any).tenantId || (req.headers['x-tenant-id'] as string);

      const validAgreement = await prisma.serviceAgreement.findFirst({
        where: {
          customerId,
          tenantId,
          isValid: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { signedAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              version: true,
            },
          },
        },
      });

      res.json({
        status: 'success',
        data: {
          hasValidAgreement: !!validAgreement,
          agreement: validAgreement,
        },
      });
    } catch (error: any) {
      logger.error('Error checking customer agreement', {
        customerId: req.params.customerId,
        tenantId: req.headers['x-tenant-id'],
        error: error.message,
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to check customer agreement',
      });
    }
  }
);

// Get agreement by ID
router.get('/service-agreements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const agreement = await prisma.serviceAgreement.findFirst({
      where: { id, tenantId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        checkIn: {
          select: {
            id: true,
            checkInTime: true,
            reservationId: true,
          },
        },
      },
    });

    if (!agreement) {
      return res.status(404).json({
        status: 'error',
        message: 'Agreement not found',
      });
    }

    res.json({
      status: 'success',
      data: agreement,
    });
  } catch (error: any) {
    logger.error('Error fetching agreement', {
      agreementId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch agreement',
    });
  }
});

// Invalidate an agreement
router.put('/service-agreements/:id/invalidate', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const staffId = (req as any).user?.id;
    const { reason } = req.body;

    const existing = await prisma.serviceAgreement.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Agreement not found',
      });
    }

    if (!existing.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Agreement is already invalidated',
      });
    }

    const agreement = await prisma.serviceAgreement.update({
      where: { id },
      data: {
        isValid: false,
        invalidatedAt: new Date(),
        invalidatedBy: staffId,
        invalidReason: reason,
      },
    });

    logger.info('Service agreement invalidated', {
      agreementId: id,
      invalidatedBy: staffId,
      reason,
      tenantId,
    });

    res.json({
      status: 'success',
      data: agreement,
    });
  } catch (error: any) {
    logger.error('Error invalidating agreement', {
      agreementId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to invalidate agreement',
    });
  }
});

// Get version history for a template
router.get('/service-agreement-templates/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const template = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    const versions = await prisma.serviceAgreementVersion.findMany({
      where: { templateId: id, tenantId },
      orderBy: { version: 'desc' },
    });

    res.json({
      status: 'success',
      results: versions.length,
      data: versions,
    });
  } catch (error: any) {
    logger.error('Error fetching template versions', {
      templateId: req.params.id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch template versions',
    });
  }
});

// Get specific version of a template
router.get(
  '/service-agreement-templates/:id/versions/:version',
  async (req, res) => {
    try {
      const { id, version } = req.params;
      const tenantId =
        (req as any).tenantId || (req.headers['x-tenant-id'] as string);

      const versionRecord = await prisma.serviceAgreementVersion.findFirst({
        where: {
          templateId: id,
          version: Number(version),
          tenantId,
        },
      });

      if (!versionRecord) {
        return res.status(404).json({
          status: 'error',
          message: 'Version not found',
        });
      }

      res.json({
        status: 'success',
        data: versionRecord,
      });
    } catch (error: any) {
      logger.error('Error fetching template version', {
        templateId: req.params.id,
        version: req.params.version,
        tenantId: req.headers['x-tenant-id'],
        error: error.message,
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch template version',
      });
    }
  }
);

export default router;
