import { type Prisma } from '@prisma/client';
import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

type CheckInSectionWithQuestions = Prisma.CheckInSectionGetPayload<{
  include: {
    questions: true;
  };
}>;

export const route: Router = expressRouter();
/**
 * Update a check-in template
 * PUT /api/check-in-templates/:id
 */
route.use('/check-in-templates/:id', async (req, res) => {
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
