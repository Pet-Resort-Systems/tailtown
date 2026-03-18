/**
 * Schedule Template Controller
 *
 * Handles recurring schedule templates for staff:
 * - CRUD for templates and entries
 * - Schedule generation from templates
 * - Holiday management
 */

import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/prisma';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

// ============================================
// SCHEDULE TEMPLATES
// ============================================

/**
 * Get all schedule templates for a staff member
 */
export const getStaffTemplates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId } = req.params;
    const { activeOnly } = req.query;

    const where: any = { tenantId, staffId };
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const templates = await prisma.scheduleTemplate.findMany({
      where,
      include: {
        entries: {
          orderBy: [{ rotationWeek: 'asc' }, { dayOfWeek: 'asc' }],
        },
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: templates,
    });
  } catch (error: any) {
    logger.error('Error fetching schedule templates', { error: error.message });
    next(error);
  }
};

/**
 * Get all active templates (for schedule generation)
 */
export const getAllActiveTemplates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;

    const templates = await prisma.scheduleTemplate.findMany({
      where: {
        tenantId,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        entries: {
          orderBy: [{ rotationWeek: 'asc' }, { dayOfWeek: 'asc' }],
        },
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: templates,
    });
  } catch (error: any) {
    logger.error('Error fetching active templates', { error: error.message });
    next(error);
  }
};

/**
 * Create a new schedule template
 */
export const createTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId } = req.params;
    const {
      name,
      rotationType,
      rotationWeeks,
      effectiveFrom,
      effectiveUntil,
      generateAheadDays,
      skipHolidays,
      notes,
      entries,
    } = req.body;

    if (!name || !effectiveFrom) {
      return next(new AppError('Name and effectiveFrom are required', 400));
    }

    // Verify staff exists
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, tenantId },
    });
    if (!staff) {
      return next(new AppError('Staff not found', 404));
    }

    const template = await prisma.scheduleTemplate.create({
      data: {
        tenantId,
        staffId,
        name,
        rotationType: rotationType || 'WEEKLY',
        rotationWeeks: rotationWeeks || 1,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        generateAheadDays: generateAheadDays || 14,
        skipHolidays: skipHolidays !== false,
        notes,
        entries: entries?.length
          ? {
              create: entries.map((e: any) => ({
                dayOfWeek: e.dayOfWeek,
                rotationWeek: e.rotationWeek || 0,
                startTime: e.startTime,
                endTime: e.endTime,
                location: e.location,
                role: e.role,
                notes: e.notes,
              })),
            }
          : undefined,
      },
      include: {
        entries: true,
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error creating schedule template', { error: error.message });
    next(error);
  }
};

/**
 * Update a schedule template
 */
export const updateTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { templateId } = req.params;
    const {
      name,
      rotationType,
      rotationWeeks,
      isActive,
      effectiveFrom,
      effectiveUntil,
      generateAheadDays,
      skipHolidays,
      notes,
    } = req.body;

    const existing = await prisma.scheduleTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (!existing) {
      return next(new AppError('Template not found', 404));
    }

    const template = await prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: {
        name,
        rotationType,
        rotationWeeks,
        isActive,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
        generateAheadDays,
        skipHolidays,
        notes,
      },
      include: {
        entries: true,
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    logger.error('Error updating schedule template', { error: error.message });
    next(error);
  }
};

/**
 * Delete a schedule template
 */
export const deleteTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { templateId } = req.params;

    const existing = await prisma.scheduleTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (!existing) {
      return next(new AppError('Template not found', 404));
    }

    await prisma.scheduleTemplate.delete({
      where: { id: templateId },
    });

    res.status(200).json({
      status: 'success',
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting schedule template', { error: error.message });
    next(error);
  }
};

// ============================================
// TEMPLATE ENTRIES
// ============================================

/**
 * Add an entry to a template
 */
export const addTemplateEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { templateId } = req.params;
    const {
      dayOfWeek,
      rotationWeek,
      startTime,
      endTime,
      location,
      role,
      notes,
    } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return next(
        new AppError('dayOfWeek, startTime, and endTime are required', 400)
      );
    }

    const template = await prisma.scheduleTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (!template) {
      return next(new AppError('Template not found', 404));
    }

    const entry = await prisma.scheduleTemplateEntry.create({
      data: {
        templateId,
        dayOfWeek,
        rotationWeek: rotationWeek || 0,
        startTime,
        endTime,
        location,
        role,
        notes,
      },
    });

    res.status(201).json({
      status: 'success',
      data: entry,
    });
  } catch (error: any) {
    logger.error('Error adding template entry', { error: error.message });
    next(error);
  }
};

/**
 * Update a template entry
 */
export const updateTemplateEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { entryId } = req.params;
    const {
      dayOfWeek,
      rotationWeek,
      startTime,
      endTime,
      location,
      role,
      notes,
    } = req.body;

    const existing = await prisma.scheduleTemplateEntry.findUnique({
      where: { id: entryId },
    });
    if (!existing) {
      return next(new AppError('Entry not found', 404));
    }

    const entry = await prisma.scheduleTemplateEntry.update({
      where: { id: entryId },
      data: {
        dayOfWeek,
        rotationWeek,
        startTime,
        endTime,
        location,
        role,
        notes,
      },
    });

    res.status(200).json({
      status: 'success',
      data: entry,
    });
  } catch (error: any) {
    logger.error('Error updating template entry', { error: error.message });
    next(error);
  }
};

/**
 * Delete a template entry
 */
export const deleteTemplateEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { entryId } = req.params;

    const existing = await prisma.scheduleTemplateEntry.findUnique({
      where: { id: entryId },
    });
    if (!existing) {
      return next(new AppError('Entry not found', 404));
    }

    await prisma.scheduleTemplateEntry.delete({
      where: { id: entryId },
    });

    res.status(200).json({
      status: 'success',
      message: 'Entry deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting template entry', { error: error.message });
    next(error);
  }
};

// ============================================
// SCHEDULE GENERATION
// ============================================

/**
 * Generate schedules from a template
 */
export const generateSchedules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { templateId } = req.params;
    const { startDate, endDate } = req.body;

    const template = await prisma.scheduleTemplate.findFirst({
      where: { id: templateId, tenantId },
      include: { entries: true },
    });
    if (!template) {
      return next(new AppError('Template not found', 404));
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(
          start.getTime() + template.generateAheadDays * 24 * 60 * 60 * 1000
        );

    // Get holidays if skipHolidays is enabled
    let holidays: Date[] = [];
    if (template.skipHolidays) {
      const holidayRecords = await prisma.businessHoliday.findMany({
        where: {
          tenantId,
          isClosed: true,
          date: { gte: start, lte: end },
        },
      });
      holidays = holidayRecords.map((h) => h.date);
    }

    // Get existing time off for the staff member
    const timeOff = await prisma.staffTimeOff.findMany({
      where: {
        staffId: template.staffId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    const createdSchedules: any[] = [];
    const skippedDates: { date: string; reason: string }[] = [];

    // Calculate rotation week based on effectiveFrom
    const effectiveStart = new Date(template.effectiveFrom);
    const weeksSinceStart = Math.floor(
      (start.getTime() - effectiveStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Iterate through each day in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      const dayOfWeek = currentDate.getDay();

      // Check if it's a holiday
      const isHoliday = holidays.some(
        (h) => h.toDateString() === currentDate.toDateString()
      );
      if (isHoliday) {
        skippedDates.push({
          date: currentDate.toISOString().split('T')[0],
          reason: 'Holiday',
        });
        continue;
      }

      // Check if staff has time off
      const hasTimeOff = timeOff.some(
        (t) => currentDate >= t.startDate && currentDate <= t.endDate
      );
      if (hasTimeOff) {
        skippedDates.push({
          date: currentDate.toISOString().split('T')[0],
          reason: 'Time off',
        });
        continue;
      }

      // Calculate which rotation week we're in
      const daysSinceStart = Math.floor(
        (currentDate.getTime() - effectiveStart.getTime()) /
          (24 * 60 * 60 * 1000)
      );
      const currentRotationWeek =
        Math.floor(daysSinceStart / 7) % template.rotationWeeks;

      // Find entries for this day and rotation
      const entriesForDay = template.entries.filter(
        (e) =>
          e.dayOfWeek === dayOfWeek && e.rotationWeek === currentRotationWeek
      );

      for (const entry of entriesForDay) {
        // Check for existing schedule
        const existingSchedule = await prisma.staffSchedule.findFirst({
          where: {
            tenantId,
            staffId: template.staffId,
            date: {
              gte: new Date(currentDate.setHours(0, 0, 0, 0)),
              lt: new Date(currentDate.setHours(23, 59, 59, 999)),
            },
            startTime: entry.startTime,
            endTime: entry.endTime,
          },
        });

        if (existingSchedule) {
          skippedDates.push({
            date: currentDate.toISOString().split('T')[0],
            reason: 'Schedule already exists',
          });
          continue;
        }

        // Create the schedule
        const schedule = await prisma.staffSchedule.create({
          data: {
            tenantId,
            staffId: template.staffId,
            date: new Date(currentDate),
            startTime: entry.startTime,
            endTime: entry.endTime,
            location: entry.location,
            role: entry.role,
            notes: entry.notes ? `[Auto] ${entry.notes}` : '[Auto-generated]',
            status: 'SCHEDULED',
          },
        });
        createdSchedules.push(schedule);
      }
    }

    // Update lastGeneratedDate
    await prisma.scheduleTemplate.update({
      where: { id: templateId },
      data: { lastGeneratedDate: end },
    });

    res.status(201).json({
      status: 'success',
      data: {
        created: createdSchedules.length,
        skipped: skippedDates.length,
        schedules: createdSchedules,
        skippedDates,
      },
    });
  } catch (error: any) {
    logger.error('Error generating schedules', { error: error.message });
    next(error);
  }
};

/**
 * Generate schedules for all active templates
 */
export const generateAllSchedules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;

    const templates = await prisma.scheduleTemplate.findMany({
      where: {
        tenantId,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: { entries: true },
    });

    const results: any[] = [];

    for (const template of templates) {
      const start = template.lastGeneratedDate
        ? new Date(template.lastGeneratedDate.getTime() + 24 * 60 * 60 * 1000)
        : new Date();
      const end = new Date(
        start.getTime() + template.generateAheadDays * 24 * 60 * 60 * 1000
      );

      // Skip if already generated up to date
      if (template.lastGeneratedDate && template.lastGeneratedDate >= end) {
        results.push({
          templateId: template.id,
          staffId: template.staffId,
          status: 'skipped',
          reason: 'Already up to date',
        });
        continue;
      }

      // Get holidays
      let holidays: Date[] = [];
      if (template.skipHolidays) {
        const holidayRecords = await prisma.businessHoliday.findMany({
          where: {
            tenantId,
            isClosed: true,
            date: { gte: start, lte: end },
          },
        });
        holidays = holidayRecords.map((h) => h.date);
      }

      // Get time off
      const timeOff = await prisma.staffTimeOff.findMany({
        where: {
          staffId: template.staffId,
          status: 'APPROVED',
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });

      let createdCount = 0;
      const effectiveStart = new Date(template.effectiveFrom);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);
        const dayOfWeek = currentDate.getDay();

        // Skip holidays and time off
        const isHoliday = holidays.some(
          (h) => h.toDateString() === currentDate.toDateString()
        );
        const hasTimeOff = timeOff.some(
          (t) => currentDate >= t.startDate && currentDate <= t.endDate
        );
        if (isHoliday || hasTimeOff) continue;

        const daysSinceStart = Math.floor(
          (currentDate.getTime() - effectiveStart.getTime()) /
            (24 * 60 * 60 * 1000)
        );
        const currentRotationWeek =
          Math.floor(daysSinceStart / 7) % template.rotationWeeks;

        const entriesForDay = template.entries.filter(
          (e) =>
            e.dayOfWeek === dayOfWeek && e.rotationWeek === currentRotationWeek
        );

        for (const entry of entriesForDay) {
          const existingSchedule = await prisma.staffSchedule.findFirst({
            where: {
              tenantId,
              staffId: template.staffId,
              date: {
                gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                lt: new Date(currentDate.setHours(23, 59, 59, 999)),
              },
              startTime: entry.startTime,
              endTime: entry.endTime,
            },
          });

          if (!existingSchedule) {
            await prisma.staffSchedule.create({
              data: {
                tenantId,
                staffId: template.staffId,
                date: new Date(currentDate),
                startTime: entry.startTime,
                endTime: entry.endTime,
                location: entry.location,
                role: entry.role,
                notes: entry.notes
                  ? `[Auto] ${entry.notes}`
                  : '[Auto-generated]',
                status: 'SCHEDULED',
              },
            });
            createdCount++;
          }
        }
      }

      await prisma.scheduleTemplate.update({
        where: { id: template.id },
        data: { lastGeneratedDate: end },
      });

      results.push({
        templateId: template.id,
        staffId: template.staffId,
        status: 'success',
        created: createdCount,
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        templatesProcessed: templates.length,
        results,
      },
    });
  } catch (error: any) {
    logger.error('Error generating all schedules', { error: error.message });
    next(error);
  }
};

// ============================================
// BUSINESS HOLIDAYS
// ============================================

/**
 * Get all business holidays
 */
export const getHolidays = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { year } = req.query;

    const where: any = { tenantId };
    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);
      where.date = { gte: startOfYear, lte: endOfYear };
    }

    const holidays = await prisma.businessHoliday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: holidays,
    });
  } catch (error: any) {
    logger.error('Error fetching holidays', { error: error.message });
    next(error);
  }
};

/**
 * Create a business holiday
 */
export const createHoliday = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { name, date, isRecurring, isClosed, notes } = req.body;

    if (!name || !date) {
      return next(new AppError('Name and date are required', 400));
    }

    const holiday = await prisma.businessHoliday.create({
      data: {
        tenantId,
        name,
        date: new Date(date),
        isRecurring: isRecurring || false,
        isClosed: isClosed !== false,
        notes,
      },
    });

    res.status(201).json({
      status: 'success',
      data: holiday,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A holiday already exists for this date', 400));
    }
    logger.error('Error creating holiday', { error: error.message });
    next(error);
  }
};

/**
 * Update a business holiday
 */
export const updateHoliday = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { holidayId } = req.params;
    const { name, date, isRecurring, isClosed, notes } = req.body;

    const existing = await prisma.businessHoliday.findFirst({
      where: { id: holidayId, tenantId },
    });
    if (!existing) {
      return next(new AppError('Holiday not found', 404));
    }

    const holiday = await prisma.businessHoliday.update({
      where: { id: holidayId },
      data: {
        name,
        date: date ? new Date(date) : undefined,
        isRecurring,
        isClosed,
        notes,
      },
    });

    res.status(200).json({
      status: 'success',
      data: holiday,
    });
  } catch (error: any) {
    logger.error('Error updating holiday', { error: error.message });
    next(error);
  }
};

/**
 * Delete a business holiday
 */
export const deleteHoliday = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { holidayId } = req.params;

    const existing = await prisma.businessHoliday.findFirst({
      where: { id: holidayId, tenantId },
    });
    if (!existing) {
      return next(new AppError('Holiday not found', 404));
    }

    await prisma.businessHoliday.delete({
      where: { id: holidayId },
    });

    res.status(200).json({
      status: 'success',
      message: 'Holiday deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting holiday', { error: error.message });
    next(error);
  }
};
