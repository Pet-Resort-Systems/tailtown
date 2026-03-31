import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Create a new check-in template
 * POST /api/check-in-templates
 */
route.use('/check-in-templates', async (req, res) => {
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
