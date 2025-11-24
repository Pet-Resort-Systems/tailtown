import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Service Agreement Controller
 * Manages service agreement templates and signed agreements
 */

/**
 * Get all service agreement templates for a tenant
 * GET /api/service-agreement-templates
 */
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { active } = req.query;

    const where: any = { tenantId };
    if (active === 'true') {
      where.isActive = true;
    }

    const templates = await prisma.serviceAgreementTemplate.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json({
      status: 'success',
      results: templates.length,
      data: templates
    });
  } catch (error: any) {
    logger.error('Error fetching service agreement templates', { tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement templates'
    });
  }
};

/**
 * Get a single service agreement template by ID
 * GET /api/service-agreement-templates/:id
 */
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const template = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found'
      });
    }

    res.json({
      status: 'success',
      data: template
    });
  } catch (error: any) {
    logger.error('Error fetching service agreement template', { templateId: req.params.id, tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement template'
    });
  }
};

/**
 * Get the default service agreement template for a tenant
 * GET /api/service-agreement-templates/default
 */
export const getDefaultTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const template = await prisma.serviceAgreementTemplate.findFirst({
      where: { 
        tenantId,
        isDefault: true,
        isActive: true
      }
    });

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'No default template found'
      });
    }

    res.json({
      status: 'success',
      data: template
    });
  } catch (error: any) {
    logger.error('Error fetching default service agreement template', { tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch default service agreement template'
    });
  }
};

/**
 * Create a new service agreement template
 * POST /api/service-agreement-templates
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, content, isDefault } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.serviceAgreementTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.serviceAgreementTemplate.create({
      data: {
        tenantId,
        name,
        content,
        isDefault: isDefault || false,
        isActive: true
      }
    });

    res.status(201).json({
      status: 'success',
      data: template
    });
  } catch (error: any) {
    logger.error('Error creating service agreement template', { tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create service agreement template'
    });
  }
};

/**
 * Update a service agreement template
 * PUT /api/service-agreement-templates/:id
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { name, content, isActive, isDefault } = req.body;

    // Verify template exists and belongs to tenant
    const existing = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.serviceAgreementTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.serviceAgreementTemplate.update({
      where: { id },
      data: {
        name,
        content,
        isActive,
        isDefault
      }
    });

    res.json({
      status: 'success',
      data: template
    });
  } catch (error: any) {
    logger.error('Error updating service agreement template', { templateId: req.params.id, tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update service agreement template'
    });
  }
};

/**
 * Delete a service agreement template
 * DELETE /api/service-agreement-templates/:id
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify template exists and belongs to tenant
    const existing = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found'
      });
    }

    await prisma.serviceAgreementTemplate.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Template deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting service agreement template', { templateId: req.params.id, tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete service agreement template'
    });
  }
};

/**
 * Create a signed service agreement for a check-in
 * POST /api/service-agreements
 */
export const createAgreement = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const {
      checkInId,
      agreementText,
      initials,
      signature,
      signedBy,
      ipAddress
    } = req.body;

    // Validate required fields
    if (!checkInId || !agreementText || !signature || !signedBy) {
      return res.status(400).json({
        status: 'error',
        message: 'Check-in ID, agreement text, signature, and signer name are required'
      });
    }

    // Verify check-in exists
    const checkIn = await prisma.checkIn.findFirst({
      where: { id: checkInId, tenantId }
    });

    if (!checkIn) {
      return res.status(404).json({
        status: 'error',
        message: 'Check-in not found'
      });
    }

    // Check if agreement already exists for this check-in
    const existingAgreement = await prisma.serviceAgreement.findUnique({
      where: { checkInId }
    });

    if (existingAgreement) {
      return res.status(400).json({
        status: 'error',
        message: 'Service agreement already exists for this check-in'
      });
    }

    const agreement = await prisma.serviceAgreement.create({
      data: {
        tenantId,
        checkInId,
        agreementText,
        initials: initials || [],
        signature,
        signedBy,
        signedAt: new Date(),
        ipAddress
      }
    });

    res.status(201).json({
      status: 'success',
      data: agreement
    });
  } catch (error: any) {
    logger.error('Error creating service agreement', { checkInId: req.body.checkInId, tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create service agreement'
    });
  }
};

/**
 * Get a service agreement by check-in ID
 * GET /api/service-agreements/check-in/:checkInId
 */
export const getAgreementByCheckIn = async (req: Request, res: Response) => {
  try {
    const { checkInId } = req.params;
    const tenantId = (req as any).tenantId;

    const agreement = await prisma.serviceAgreement.findFirst({
      where: { 
        checkInId,
        tenantId
      },
      include: {
        checkIn: {
          include: {
            pet: true,
            reservation: true
          }
        }
      }
    });

    if (!agreement) {
      return res.status(404).json({
        status: 'error',
        message: 'Service agreement not found'
      });
    }

    res.json({
      status: 'success',
      data: agreement
    });
  } catch (error: any) {
    logger.error('Error fetching service agreement', { checkInId: req.params.checkInId, tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service agreement'
    });
  }
};
