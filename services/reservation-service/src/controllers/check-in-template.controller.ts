import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Check-In Template Controller
 * Manages customizable check-in questionnaire templates
 */

/**
 * Get all check-in templates for a tenant
 * GET /api/check-in-templates
 */
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { active } = req.query;

    const where: any = { tenantId };
    if (active === 'true') {
      where.isActive = true;
    }

    const templates = await prisma.checkInTemplate.findMany({
      where,
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      status: 'success',
      results: templates.length,
      data: templates
    });
  } catch (error: any) {
    logger.error('Error fetching check-in templates', { tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in templates'
    });
  }
};

/**
 * Get a single check-in template by ID
 * GET /api/check-in-templates/:id
 */
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const template = await prisma.checkInTemplate.findFirst({
      where: { id, tenantId },
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
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
    logger.error('Error fetching check-in template', { templateId: req.params.id, error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in template'
    });
  }
};

/**
 * Get the default template for a tenant
 * GET /api/check-in-templates/default
 */
export const getDefaultTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const template = await prisma.checkInTemplate.findFirst({
      where: { 
        tenantId,
        isDefault: true,
        isActive: true
      },
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
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
    logger.error('Error fetching default template', { tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch default template'
    });
  }
};

/**
 * Create a new check-in template
 * POST /api/check-in-templates
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, description, isDefault, sections } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.checkInTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.checkInTemplate.create({
      data: {
        tenantId,
        name,
        description,
        isDefault: isDefault || false,
        isActive: true,
        sections: {
          create: sections?.map((section: any, sectionIndex: number) => ({
            title: section.title,
            description: section.description,
            order: section.order || sectionIndex + 1,
            questions: {
              create: section.questions?.map((question: any, questionIndex: number) => ({
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options || undefined,
                isRequired: question.isRequired || false,
                order: question.order || questionIndex + 1,
                placeholder: question.placeholder || undefined,
                helpText: question.helpText || undefined
              }))
            }
          }))
        }
      } as any,
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: template
    });
  } catch (error: any) {
    logger.error('Error creating check-in template', { tenantId: req.headers['x-tenant-id'], error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create check-in template'
    });
  }
};

/**
 * Update a check-in template
 * PUT /api/check-in-templates/:id
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { name, description, isActive, isDefault, sections } = req.body;

    logger.debug('Update template request', { 
      templateId: id, 
      tenantId, 
      bodyKeys: Object.keys(req.body),
      sectionsCount: sections?.length || 0,
      hasFirstSection: sections && sections.length > 0
    });

    // Verify template exists and belongs to tenant
    const existing = await prisma.checkInTemplate.findFirst({
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
      await prisma.checkInTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Update basic fields first
    logger.debug('Updating template basic fields', { templateId: id });
    await prisma.checkInTemplate.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault
      }
    });
    logger.debug('Template basic fields updated', { templateId: id });

    // If sections are provided, delete existing sections and recreate
    if (sections && Array.isArray(sections)) {
      logger.debug('Deleting existing template sections', { templateId: id });
      
      // First, get all sections for this template
      const existingSections = await prisma.checkInSection.findMany({
        where: { templateId: id },
        include: { questions: true }
      });
      
      // Delete responses for all questions in these sections
      for (const section of existingSections) {
        for (const question of section.questions) {
          await prisma.checkInResponse.deleteMany({
            where: { questionId: question.id }
          });
        }
      }
      
      // Now delete the sections (cascade will delete questions)
      await prisma.checkInSection.deleteMany({
        where: { templateId: id }
      });
      logger.debug('Template sections deleted', { templateId: id });

      logger.debug('Creating new template sections', { templateId: id, count: sections.length });
      // Create new sections with questions
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];
        logger.debug('Creating template section', { 
          templateId: id, 
          sectionIndex: sectionIndex + 1, 
          totalSections: sections.length, 
          sectionTitle: section.title 
        });
        
        await prisma.checkInSection.create({
          data: {
            templateId: id,
            title: section.title,
            description: section.description || undefined,
            order: section.order || sectionIndex + 1,
            questions: {
              create: (section.questions || []).map((question: any, questionIndex: number) => ({
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options || undefined,
                isRequired: question.isRequired || false,
                order: question.order || questionIndex + 1,
                placeholder: question.placeholder || undefined,
                helpText: question.helpText || undefined
              }))
            }
          }
        });
      }
      logger.debug('All template sections created', { templateId: id, count: sections.length });
    }

    // Fetch and return the updated template
    const template = await prisma.checkInTemplate.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json({
      status: 'success',
      data: template
    });
  } catch (error: any) {
    logger.error('Error updating check-in template', { 
      templateId: req.params.id, 
      error: error.message,
      details: {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      }
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update check-in template',
      error: error.message,
      details: error.meta
    });
  }
};

/**
 * Delete a check-in template
 * DELETE /api/check-in-templates/:id
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    // Verify template exists and belongs to tenant
    const existing = await prisma.checkInTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found'
      });
    }

    // Check if template is in use
    const checkInsUsingTemplate = await prisma.checkIn.count({
      where: { templateId: id }
    });

    if (checkInsUsingTemplate > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete template. It is being used by ${checkInsUsingTemplate} check-in(s). Consider deactivating instead.`
      });
    }

    await prisma.checkInTemplate.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Template deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting check-in template', { templateId: req.params.id, error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete check-in template'
    });
  }
};

/**
 * Clone a check-in template
 * POST /api/check-in-templates/:id/clone
 */
export const cloneTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { name } = req.body;

    // Get the template to clone
    const sourceTemplate = await prisma.checkInTemplate.findFirst({
      where: { id, tenantId },
      include: {
        sections: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!sourceTemplate) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found'
      });
    }

    // Create the clone
    const clonedTemplate = await prisma.checkInTemplate.create({
      data: {
        tenantId,
        name: name || `${sourceTemplate.name} (Copy)`,
        description: sourceTemplate.description,
        isActive: true,
        isDefault: false,
        sections: {
          create: sourceTemplate.sections.map(section => ({
            title: section.title,
            description: section.description,
            order: section.order,
            questions: {
              create: section.questions.map(question => ({
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options,
                isRequired: question.isRequired,
                order: question.order,
                placeholder: question.placeholder,
                helpText: question.helpText
              }))
            }
          }))
        }
      } as any,
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: clonedTemplate
    });
  } catch (error: any) {
    logger.error('Error cloning check-in template', { templateId: req.params.id, error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to clone check-in template'
    });
  }
};
