import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";

interface AuthenticatedRequest extends Request {
  tenantId?: string;
  user?: { id: string; name: string };
}

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
    if (active === "true") {
      where.isActive = true;
    }

    const templates = await prisma.serviceAgreementTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    });

    res.json({
      status: "success",
      results: templates.length,
      data: templates,
    });
  } catch (error: any) {
    logger.error("Error fetching service agreement templates", {
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch service agreement templates",
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
      where: { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({
        status: "error",
        message: "Template not found",
      });
    }

    res.json({
      status: "success",
      data: template,
    });
  } catch (error: any) {
    logger.error("Error fetching service agreement template", {
      templateId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch service agreement template",
    });
  }
};

/**
 * Get the default service agreement template for a tenant
 * GET /api/service-agreement-templates/default
 * If no default is set but only one template exists, automatically set it as default
 */
export const getDefaultTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    // First try to find the default template
    let template = await prisma.serviceAgreementTemplate.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
    });

    // If no default, check if there's only one active template
    if (!template) {
      const allTemplates = await prisma.serviceAgreementTemplate.findMany({
        where: {
          tenantId,
          isActive: true,
        },
      });

      // If exactly one template exists, make it the default automatically
      if (allTemplates.length === 1) {
        template = await prisma.serviceAgreementTemplate.update({
          where: { id: allTemplates[0].id },
          data: { isDefault: true },
        });
        logger.info("Auto-set single template as default", {
          tenantId,
          templateId: template.id,
        });
      }
    }

    if (!template) {
      return res.status(404).json({
        status: "error",
        message: "No default template found",
      });
    }

    res.json({
      status: "success",
      data: template,
    });
  } catch (error: any) {
    logger.error("Error fetching default service agreement template", {
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch default service agreement template",
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

    // If this is set as default, unset other defaults
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

    // Create initial version record
    await prisma.serviceAgreementVersion.create({
      data: {
        tenantId,
        templateId: template.id,
        version: 1,
        content,
        changeNotes: "Initial version",
        createdBy: staffId,
      },
    });

    res.status(201).json({
      status: "success",
      data: template,
    });
  } catch (error: any) {
    logger.error("Error creating service agreement template", {
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to create service agreement template",
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

    // Verify template exists and belongs to tenant
    const existing = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: "error",
        message: "Template not found",
      });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.serviceAgreementTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if content changed - if so, create new version
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

    // Create version record if content changed
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
      status: "success",
      data: template,
    });
  } catch (error: any) {
    logger.error("Error updating service agreement template", {
      templateId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to update service agreement template",
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
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: "error",
        message: "Template not found",
      });
    }

    await prisma.serviceAgreementTemplate.delete({
      where: { id },
    });

    res.json({
      status: "success",
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error deleting service agreement template", {
      templateId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to delete service agreement template",
    });
  }
};

/**
 * Create a signed service agreement
 * POST /api/service-agreements
 */
export const createAgreement = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
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

    // Validate required fields
    if (!customerId || !agreementText || !signature || !signedBy) {
      return res.status(400).json({
        status: "error",
        message:
          "Customer ID, agreement text, signature, and signer name are required",
      });
    }

    // If checkInId provided, verify it exists and doesn't have an agreement
    if (checkInId) {
      const checkIn = await prisma.checkIn.findFirst({
        where: { id: checkInId, tenantId },
      });

      if (!checkIn) {
        return res.status(404).json({
          status: "error",
          message: "Check-in not found",
        });
      }

      const existingAgreement = await prisma.serviceAgreement.findUnique({
        where: { checkInId },
      });

      if (existingAgreement) {
        return res.status(400).json({
          status: "error",
          message: "Service agreement already exists for this check-in",
        });
      }
    }

    // Get template version if templateId provided
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
        signatureMethod: signatureMethod || "device",
        signedAt: new Date(),
        acknowledgedAt: new Date(),
        ipAddress,
        userAgent,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isValid: true,
      },
    });

    logger.info("Service agreement created", {
      agreementId: agreement.id,
      customerId,
      templateId,
      tenantId,
    });

    res.status(201).json({
      status: "success",
      data: agreement,
    });
  } catch (error: any) {
    logger.error("Error creating service agreement", {
      customerId: req.body.customerId,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to create service agreement",
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
        tenantId,
      },
      include: {
        checkIn: {
          include: {
            // pet relation removed - use customerServiceClient.getPet(petId, tenantId) if needed
            reservation: true,
          },
        },
      },
    });

    if (!agreement) {
      return res.status(404).json({
        status: "error",
        message: "Service agreement not found",
      });
    }

    res.json({
      status: "success",
      data: agreement,
    });
  } catch (error: any) {
    logger.error("Error fetching service agreement", {
      checkInId: req.params.checkInId,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch service agreement",
    });
  }
};

/**
 * Get all signed agreements for a tenant
 * GET /api/service-agreements
 */
export const getAllAgreements = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { valid, limit = 50, offset = 0, search } = req.query;

    const where: any = { tenantId };

    if (valid === "true") {
      where.isValid = true;
    } else if (valid === "false") {
      where.isValid = false;
    }

    if (search) {
      where.OR = [
        { signedBy: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [agreements, total] = await Promise.all([
      prisma.serviceAgreement.findMany({
        where,
        orderBy: { signedAt: "desc" },
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
      status: "success",
      results: agreements.length,
      total,
      data: agreements,
    });
  } catch (error: any) {
    logger.error("Error fetching all agreements", {
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch agreements",
    });
  }
};

/**
 * Get all agreements for a customer
 * GET /api/service-agreements/customer/:customerId
 */
export const getAgreementsByCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = (req as any).tenantId;
    const { valid, limit = 50, offset = 0 } = req.query;

    const where: any = {
      customerId,
      tenantId,
    };

    if (valid === "true") {
      where.isValid = true;
    } else if (valid === "false") {
      where.isValid = false;
    }

    const [agreements, total] = await Promise.all([
      prisma.serviceAgreement.findMany({
        where,
        orderBy: { signedAt: "desc" },
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
      status: "success",
      results: agreements.length,
      total,
      data: agreements,
    });
  } catch (error: any) {
    logger.error("Error fetching customer agreements", {
      customerId: req.params.customerId,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch customer agreements",
    });
  }
};

/**
 * Get a single agreement by ID
 * GET /api/service-agreements/:id
 */
export const getAgreementById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

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
        status: "error",
        message: "Agreement not found",
      });
    }

    res.json({
      status: "success",
      data: agreement,
    });
  } catch (error: any) {
    logger.error("Error fetching agreement", {
      agreementId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch agreement",
    });
  }
};

/**
 * Invalidate an agreement
 * PUT /api/service-agreements/:id/invalidate
 */
export const invalidateAgreement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const staffId = (req as any).user?.id;
    const { reason } = req.body;

    const existing = await prisma.serviceAgreement.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: "error",
        message: "Agreement not found",
      });
    }

    if (!existing.isValid) {
      return res.status(400).json({
        status: "error",
        message: "Agreement is already invalidated",
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

    logger.info("Service agreement invalidated", {
      agreementId: id,
      invalidatedBy: staffId,
      reason,
      tenantId,
    });

    res.json({
      status: "success",
      data: agreement,
    });
  } catch (error: any) {
    logger.error("Error invalidating agreement", {
      agreementId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to invalidate agreement",
    });
  }
};

/**
 * Get version history for a template
 * GET /api/service-agreement-templates/:id/versions
 */
export const getTemplateVersions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify template exists
    const template = await prisma.serviceAgreementTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      return res.status(404).json({
        status: "error",
        message: "Template not found",
      });
    }

    const versions = await prisma.serviceAgreementVersion.findMany({
      where: { templateId: id, tenantId },
      orderBy: { version: "desc" },
    });

    res.json({
      status: "success",
      results: versions.length,
      data: versions,
    });
  } catch (error: any) {
    logger.error("Error fetching template versions", {
      templateId: req.params.id,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch template versions",
    });
  }
};

/**
 * Get a specific version of a template
 * GET /api/service-agreement-templates/:id/versions/:version
 */
export const getTemplateVersion = async (req: Request, res: Response) => {
  try {
    const { id, version } = req.params;
    const tenantId = (req as any).tenantId;

    const versionRecord = await prisma.serviceAgreementVersion.findFirst({
      where: {
        templateId: id,
        version: Number(version),
        tenantId,
      },
    });

    if (!versionRecord) {
      return res.status(404).json({
        status: "error",
        message: "Version not found",
      });
    }

    res.json({
      status: "success",
      data: versionRecord,
    });
  } catch (error: any) {
    logger.error("Error fetching template version", {
      templateId: req.params.id,
      version: req.params.version,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch template version",
    });
  }
};

/**
 * Check if customer has valid agreement
 * GET /api/service-agreements/customer/:customerId/valid
 */
export const checkCustomerAgreement = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = (req as any).tenantId;

    const validAgreement = await prisma.serviceAgreement.findFirst({
      where: {
        customerId,
        tenantId,
        isValid: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { signedAt: "desc" },
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
      status: "success",
      data: {
        hasValidAgreement: !!validAgreement,
        agreement: validAgreement,
      },
    });
  } catch (error: any) {
    logger.error("Error checking customer agreement", {
      customerId: req.params.customerId,
      tenantId: req.headers["x-tenant-id"],
      error: error.message,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to check customer agreement",
    });
  }
};
