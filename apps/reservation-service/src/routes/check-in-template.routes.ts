import { type Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

type CheckInSectionWithQuestions = Prisma.CheckInSectionGetPayload<{
  include: {
    questions: true;
  };
}>;

type CheckInTemplateWithSections = Prisma.CheckInTemplateGetPayload<{
  include: {
    sections: {
      include: {
        questions: true;
      };
    };
  };
}>;

// Get all templates
router.get('/check-in-templates', async (req, res) => {
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
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      status: 'success',
      results: templates.length,
      data: templates,
    });
  } catch (error: any) {
    logger.error('Error fetching check-in templates', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in templates',
    });
  }
});

// Get default template
router.get('/check-in-templates/default', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    const template = await prisma.checkInTemplate.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

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
    logger.error('Error fetching default template', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch default template',
    });
  }
});

// Get template by ID
router.get('/check-in-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const template = await prisma.checkInTemplate.findFirst({
      where: { id, tenantId },
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
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
    logger.error('Error fetching check-in template', {
      templateId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch check-in template',
    });
  }
});

// Create template
router.post('/check-in-templates', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, description, isDefault, sections } = req.body;

    if (isDefault) {
      await prisma.checkInTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
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
              create: section.questions?.map(
                (question: any, questionIndex: number) => ({
                  questionText: question.questionText,
                  questionType: question.questionType,
                  options: question.options || undefined,
                  isRequired: question.isRequired || false,
                  order: question.order || questionIndex + 1,
                  placeholder: question.placeholder || undefined,
                  helpText: question.helpText || undefined,
                })
              ),
            },
          })),
        },
      } as any,
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error creating check-in template', {
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create check-in template',
    });
  }
});

// Update template
router.put('/check-in-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { name, description, isActive, isDefault, sections } = req.body;

    logger.debug('Update template request', {
      templateId: id,
      tenantId,
      bodyKeys: Object.keys(req.body),
      sectionsCount: sections?.length || 0,
      hasFirstSection: sections && sections.length > 0,
    });

    const existing = await prisma.checkInTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    if (isDefault && !existing.isDefault) {
      await prisma.checkInTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    logger.debug('Updating template basic fields', { templateId: id });
    await prisma.checkInTemplate.update({
      where: { id },
      data: {
        name: name || existing.name,
        description:
          description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    });
    logger.debug('Template basic fields updated', { templateId: id });

    if (sections && Array.isArray(sections)) {
      logger.debug('Deleting existing template sections', { templateId: id });

      const existingSections = (await prisma.checkInSection.findMany({
        where: { templateId: id },
        include: { questions: true },
      })) as CheckInSectionWithQuestions[];

      for (const section of existingSections) {
        for (const question of section.questions) {
          await prisma.checkInResponse.deleteMany({
            where: { questionId: question.id },
          });
        }
      }

      await prisma.checkInSection.deleteMany({
        where: { templateId: id },
      });
      logger.debug('Template sections deleted', { templateId: id });

      logger.debug('Creating new template sections', {
        templateId: id,
        count: sections.length,
      });
      for (
        let sectionIndex = 0;
        sectionIndex < sections.length;
        sectionIndex++
      ) {
        const section = sections[sectionIndex];
        logger.debug('Creating template section', {
          templateId: id,
          sectionIndex: sectionIndex + 1,
          totalSections: sections.length,
          sectionTitle: section.title,
        });

        await prisma.checkInSection.create({
          data: {
            templateId: id,
            title: section.title,
            description: section.description || undefined,
            order: section.order || sectionIndex + 1,
            questions: {
              create: (section.questions || []).map(
                (question: any, questionIndex: number) => ({
                  questionText: question.questionText,
                  questionType: question.questionType,
                  options: question.options || undefined,
                  isRequired: question.isRequired || false,
                  order: question.order || questionIndex + 1,
                  placeholder: question.placeholder || undefined,
                  helpText: question.helpText || undefined,
                })
              ),
            },
          },
        });
      }
      logger.debug('All template sections created', {
        templateId: id,
        count: sections.length,
      });
    }

    const template = await prisma.checkInTemplate.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error updating check-in template', {
      templateId: req.params.id,
      error: error.message,
      details: {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      },
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update check-in template',
      error: error.message,
      details: error.meta,
    });
  }
});

// Delete template
router.delete('/check-in-templates/:id', async (req, res) => {
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

// Clone template
router.post('/check-in-templates/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const { name } = req.body;

    const sourceTemplate = (await prisma.checkInTemplate.findFirst({
      where: { id, tenantId },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    })) as CheckInTemplateWithSections | null;

    if (!sourceTemplate) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    const clonedTemplate = await prisma.checkInTemplate.create({
      data: {
        tenantId,
        name: name || `${sourceTemplate.name} (Copy)`,
        description: sourceTemplate.description,
        isActive: true,
        isDefault: false,
        sections: {
          create: sourceTemplate.sections.map((section) => ({
            title: section.title,
            description: section.description,
            order: section.order,
            questions: {
              create: section.questions.map((question) => ({
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options,
                isRequired: question.isRequired,
                order: question.order,
                placeholder: question.placeholder,
                helpText: question.helpText,
              })),
            },
          })),
        },
      } as any,
      include: {
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: clonedTemplate,
    });
  } catch (error: any) {
    logger.error('Error cloning check-in template', {
      templateId: req.params.id,
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to clone check-in template',
    });
  }
});

export default router;
