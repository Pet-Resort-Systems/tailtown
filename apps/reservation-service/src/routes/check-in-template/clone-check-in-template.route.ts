import { type Prisma } from '@prisma/client';
import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

type CheckInTemplateWithSections = Prisma.CheckInTemplateGetPayload<{
  include: {
    sections: {
      include: {
        questions: true;
      };
    };
  };
}>;

export const route: Router = expressRouter();
/**
 * Clone a check-in template
 * POST /api/check-in-templates/:id/clone
 */
route.use('/check-in-templates/:id/clone', async (req, res) => {
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
