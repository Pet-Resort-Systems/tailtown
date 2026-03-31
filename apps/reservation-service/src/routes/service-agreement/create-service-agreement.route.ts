import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Create a signed service agreement
 * POST /api/service-agreements
 */
route.use('/service-agreements', async (req, res) => {
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
