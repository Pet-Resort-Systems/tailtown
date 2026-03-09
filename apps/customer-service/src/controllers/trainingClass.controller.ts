import { TenantRequest } from '../middleware/tenant.middleware';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { addDays, addWeeks, format, parse } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Training Class Controller
 * Manages multi-week training class series
 */

// Get all training classes
export const getAllTrainingClasses = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { status, category, level, instructorId, isActive } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const where: any = { tenantId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (level) where.level = level;
    if (instructorId) where.instructorId = instructorId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const classes = await prisma.trainingClass.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialties: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            sessions: true
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    res.status(200).json({ status: 'success', data: classes });
  } catch (error) {
    next(error);
  }
};

// Get training class by ID
export const getTrainingClassById = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const trainingClass = await prisma.trainingClass.findFirst({
      where: { id, tenantId },
      include: {
        instructor: true,
        sessions: {
          orderBy: { sessionNumber: 'asc' }
        },
        enrollments: {
          include: {
            pet: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        classWaitlist: {
          include: {
            pet: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          },
          orderBy: { position: 'asc' }
        }
      }
    });
    
    if (!trainingClass) {
      return next(new AppError('Training class not found', 404));
    }
    
    res.status(200).json({ status: 'success', data: trainingClass });
  } catch (error) {
    next(error);
  }
};

// Create training class
export const createTrainingClass = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      level,
      category,
      instructorId,
      maxCapacity,
      startDate,
      endDate,
      totalWeeks,
      daysOfWeek,
      startTime,
      endTime,
      duration,
      pricePerSeries,
      pricePerSession,
      depositRequired,
      minAge,
      maxAge,
      prerequisites,
      notes
    } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Validate required fields
    if (!name || !level || !category || !maxCapacity || 
        !startDate || !totalWeeks || !daysOfWeek || !startTime || !endTime || !pricePerSeries) {
      return next(new AppError('Missing required fields', 400));
    }
    
    // If instructorId is 'default-instructor' or missing, find the first available staff member
    let validInstructorId = instructorId;
    if (!instructorId || instructorId === 'default-instructor') {
      const firstStaff = await prisma.staff.findFirst({
        where: { tenantId, isActive: true }
      });
      if (!firstStaff) {
        return next(new AppError('No active staff members found to assign as instructor', 400));
      }
      validInstructorId = firstStaff.id;
    }
    
    // Calculate end date if not provided
    const calculatedEndDate = endDate || addWeeks(new Date(startDate), totalWeeks);
    
    // Create the class
    const trainingClass = await prisma.trainingClass.create({
      data: {
        tenantId,
        name,
        description,
        level,
        category,
        instructorId: validInstructorId,
        maxCapacity,
        startDate: new Date(startDate),
        endDate: new Date(calculatedEndDate),
        totalWeeks,
        daysOfWeek,
        startTime,
        endTime,
        duration: duration || 60,
        pricePerSeries,
        pricePerSession,
        depositRequired,
        minAge,
        maxAge,
        prerequisites: prerequisites || [],
        notes
      },
      include: {
        instructor: true
      }
    });
    
    // Auto-generate sessions
    await generateClassSessions(trainingClass.id, {
      startDate: new Date(startDate),
      totalWeeks,
      daysOfWeek,
      startTime,
      duration: duration || 60,
      tenantId
    });
    
    res.status(201).json({ status: 'success', data: trainingClass });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate class sessions
async function generateClassSessions(
  classId: string,
  config: {
    startDate: Date;
    totalWeeks: number;
    daysOfWeek: number[];
    startTime: string;
    duration: number;
    tenantId: string;
  }
) {
  const sessions = [];
  let sessionNumber = 1;
  
  for (let week = 0; week < config.totalWeeks; week++) {
    for (const dayOfWeek of config.daysOfWeek) {
      const sessionDate = addDays(config.startDate, week * 7 + dayOfWeek);
      
      sessions.push({
        tenantId: config.tenantId,
        classId,
        sessionNumber,
        scheduledDate: sessionDate,
        scheduledTime: config.startTime,
        duration: config.duration
      });
      
      sessionNumber++;
    }
  }
  
  await prisma.classSession.createMany({
    data: sessions
  });
}

// Update training class
export const updateTrainingClass = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Verify class exists
    const existing = await prisma.trainingClass.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return next(new AppError('Training class not found', 404));
    }
    
    const updateData: any = {};
    const allowedFields = [
      'name', 'description', 'level', 'category', 'maxCapacity',
      'startTime', 'endTime', 'duration', 'pricePerSeries', 'pricePerSession',
      'depositRequired', 'status', 'isActive', 'minAge', 'maxAge', 'notes'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const trainingClass = await prisma.trainingClass.update({
      where: { id },
      data: updateData,
      include: {
        instructor: true,
        _count: {
          select: {
            enrollments: true,
            sessions: true
          }
        }
      }
    });
    
    res.status(200).json({ status: 'success', data: trainingClass });
  } catch (error) {
    next(error);
  }
};

// Delete training class
export const deleteTrainingClass = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const existing = await prisma.trainingClass.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { enrollments: true }
        }
      }
    });
    
    if (!existing) {
      return next(new AppError('Training class not found', 404));
    }
    
    if (existing._count.enrollments > 0) {
      return next(new AppError('Cannot delete class with enrollments. Cancel the class instead.', 400));
    }
    
    await prisma.trainingClass.delete({ where: { id } });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Duplicate training class for next session
export const duplicateTrainingClass = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startDate } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!startDate) {
      return next(new AppError('Start date is required', 400));
    }
    
    const original = await prisma.trainingClass.findFirst({
      where: { id, tenantId }
    });
    
    if (!original) {
      return next(new AppError('Training class not found', 404));
    }
    
    // Calculate new end date
    const newEndDate = addWeeks(new Date(startDate), original.totalWeeks);
    
    // Create duplicate
    const duplicate = await prisma.trainingClass.create({
      data: {
        tenantId,
        name: `${original.name} (${format(new Date(startDate), 'MMM yyyy')})`,
        description: original.description,
        level: original.level,
        category: original.category,
        instructorId: original.instructorId,
        maxCapacity: original.maxCapacity,
        startDate: new Date(startDate),
        endDate: newEndDate,
        totalWeeks: original.totalWeeks,
        daysOfWeek: original.daysOfWeek,
        startTime: original.startTime,
        endTime: original.endTime,
        duration: original.duration,
        pricePerSeries: original.pricePerSeries,
        pricePerSession: original.pricePerSession,
        depositRequired: original.depositRequired,
        minAge: original.minAge,
        maxAge: original.maxAge,
        prerequisites: original.prerequisites,
        notes: original.notes
      },
      include: {
        instructor: true
      }
    });
    
    // Generate sessions for duplicate
    await generateClassSessions(duplicate.id, {
      startDate: new Date(startDate),
      totalWeeks: original.totalWeeks,
      daysOfWeek: original.daysOfWeek,
      startTime: original.startTime,
      duration: original.duration,
      tenantId
    });
    
    res.status(201).json({ status: 'success', data: duplicate });
  } catch (error) {
    next(error);
  }
};

// Get class sessions
export const getClassSessions = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const sessions = await prisma.classSession.findMany({
      where: {
        tenantId,
        classId
      },
      include: {
        _count: {
          select: { attendance: true }
        }
      },
      orderBy: { sessionNumber: 'asc' }
    });
    
    res.status(200).json({ status: 'success', data: sessions });
  } catch (error) {
    next(error);
  }
};

// Update class session
export const updateClassSession = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const updateData: any = {};
    const allowedFields = ['topic', 'objectives', 'materials', 'homework', 'status', 'notes'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const session = await prisma.classSession.update({
      where: { id },
      data: updateData
    });
    
    res.status(200).json({ status: 'success', data: session });
  } catch (error) {
    next(error);
  }
};

// Start class session
export const startClassSession = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.classSession.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        actualStartTime: new Date()
      }
    });
    
    res.status(200).json({ status: 'success', data: session });
  } catch (error) {
    next(error);
  }
};

// Complete class session
export const completeClassSession = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const session = await prisma.classSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualEndTime: new Date(),
        notes: notes || undefined
      }
    });
    
    res.status(200).json({ status: 'success', data: session });
  } catch (error) {
    next(error);
  }
};
