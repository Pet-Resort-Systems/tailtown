import { TenantRequest } from '../middleware/tenant.middleware';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

/**
 * Enrollment Controller
 * Manages pet enrollments in training classes
 */

// Enroll pet in class
export const enrollInClass = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;
    const { petId, customerId, amountPaid } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!petId || !customerId) {
      return next(new AppError('Pet ID and Customer ID are required', 400));
    }
    
    // Get class details
    const trainingClass = await prisma.trainingClass.findFirst({
      where: { id: classId, tenantId },
      include: {
        _count: {
          select: { enrollments: true, sessions: true }
        }
      }
    });
    
    if (!trainingClass) {
      return next(new AppError('Training class not found', 404));
    }
    
    // Check if class is full
    if (trainingClass.currentEnrolled >= trainingClass.maxCapacity) {
      return next(new AppError('Class is full. Pet can be added to waitlist.', 409));
    }
    
    // Check if already enrolled
    const existing = await prisma.classEnrollment.findFirst({
      where: { classId, petId, tenantId }
    });
    
    if (existing) {
      return next(new AppError('Pet is already enrolled in this class', 409));
    }
    
    // Create enrollment
    const enrollment = await prisma.classEnrollment.create({
      data: {
        tenantId,
        classId,
        petId,
        customerId,
        amountPaid: amountPaid || 0,
        amountDue: trainingClass.pricePerSeries,
        totalSessions: trainingClass._count.sessions,
        paymentStatus: amountPaid >= trainingClass.pricePerSeries ? 'PAID' : 'PENDING'
      },
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
        },
        class: true
      }
    });
    
    // Update class enrollment count
    await prisma.trainingClass.update({
      where: { id: classId },
      data: {
        currentEnrolled: { increment: 1 }
      }
    });
    
    // Remove from waitlist if present
    await prisma.classWaitlist.deleteMany({
      where: { classId, petId, tenantId }
    });
    
    res.status(201).json({ status: 'success', data: enrollment });
  } catch (error) {
    next(error);
  }
};

// Get enrollment by ID
export const getEnrollmentById = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { id, tenantId },
      include: {
        pet: true,
        customer: true,
        class: {
          include: {
            instructor: true
          }
        },
        attendance: {
          include: {
            session: true
          },
          orderBy: {
            session: {
              sessionNumber: 'asc'
            }
          }
        }
      }
    });
    
    if (!enrollment) {
      return next(new AppError('Enrollment not found', 404));
    }
    
    res.status(200).json({ status: 'success', data: enrollment });
  } catch (error) {
    next(error);
  }
};

// Update enrollment
export const updateEnrollment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const updateData: any = {};
    const allowedFields = ['amountPaid', 'paymentStatus', 'status', 'notes'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const enrollment = await prisma.classEnrollment.update({
      where: { id },
      data: updateData,
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
      }
    });
    
    res.status(200).json({ status: 'success', data: enrollment });
  } catch (error) {
    next(error);
  }
};

// Drop from class
export const dropFromClass = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { id, tenantId },
      include: { class: true }
    });
    
    if (!enrollment) {
      return next(new AppError('Enrollment not found', 404));
    }
    
    // Update enrollment status
    await prisma.classEnrollment.update({
      where: { id },
      data: {
        status: 'DROPPED',
        notes: reason ? `${enrollment.notes || ''}\nDropped: ${reason}` : enrollment.notes
      }
    });
    
    // Decrement class enrollment count
    await prisma.trainingClass.update({
      where: { id: enrollment.classId },
      data: {
        currentEnrolled: { decrement: 1 }
      }
    });
    
    // Check waitlist and notify first person
    const waitlistEntry = await prisma.classWaitlist.findFirst({
      where: {
        classId: enrollment.classId,
        status: 'WAITING'
      },
      orderBy: { position: 'asc' }
    });
    
    if (waitlistEntry) {
      await prisma.classWaitlist.update({
        where: { id: waitlistEntry.id },
        data: {
          notified: true,
          notifiedDate: new Date()
        }
      });
      
      // TODO: Send notification to customer
    }
    
    res.status(200).json({ status: 'success', message: 'Dropped from class successfully' });
  } catch (error) {
    next(error);
  }
};

// Get customer's enrollments
export const getCustomerEnrollments = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { status } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const where: any = { tenantId, customerId };
    if (status) where.status = status;
    
    const enrollments = await prisma.classEnrollment.findMany({
      where,
      include: {
        pet: true,
        class: {
          include: {
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        class: {
          startDate: 'desc'
        }
      }
    });
    
    res.status(200).json({ status: 'success', data: enrollments });
  } catch (error) {
    next(error);
  }
};

// Get pet's enrollment history
export const getPetEnrollments = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { petId } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const enrollments = await prisma.classEnrollment.findMany({
      where: { tenantId, petId },
      include: {
        class: {
          include: {
            instructor: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: { attendance: true }
        }
      },
      orderBy: {
        class: {
          startDate: 'desc'
        }
      }
    });
    
    res.status(200).json({ status: 'success', data: enrollments });
  } catch (error) {
    next(error);
  }
};

// Issue certificate
export const issueCertificate = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { id, tenantId }
    });
    
    if (!enrollment) {
      return next(new AppError('Enrollment not found', 404));
    }
    
    if (enrollment.status !== 'COMPLETED') {
      return next(new AppError('Can only issue certificate for completed enrollments', 400));
    }
    
    const updated = await prisma.classEnrollment.update({
      where: { id },
      data: {
        certificateIssued: true,
        certificateDate: new Date()
      },
      include: {
        pet: true,
        customer: true,
        class: true
      }
    });
    
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};

// Add to waitlist
export const addToWaitlist = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;
    const { petId, customerId } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!petId || !customerId) {
      return next(new AppError('Pet ID and Customer ID are required', 400));
    }
    
    // Check if already on waitlist
    const existing = await prisma.classWaitlist.findFirst({
      where: { classId, petId, tenantId }
    });
    
    if (existing) {
      return next(new AppError('Pet is already on waitlist', 409));
    }
    
    // Get next position
    const maxPosition = await prisma.classWaitlist.findFirst({
      where: { classId, tenantId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });
    
    const nextPosition = (maxPosition?.position || 0) + 1;
    
    const waitlistEntry = await prisma.classWaitlist.create({
      data: {
        tenantId,
        classId,
        petId,
        customerId,
        position: nextPosition
      },
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
      }
    });
    
    res.status(201).json({ status: 'success', data: waitlistEntry });
  } catch (error) {
    next(error);
  }
};

// Remove from waitlist
export const removeFromWaitlist = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const entry = await prisma.classWaitlist.findFirst({
      where: { id, tenantId }
    });
    
    if (!entry) {
      return next(new AppError('Waitlist entry not found', 404));
    }
    
    await prisma.classWaitlist.delete({ where: { id } });
    
    // Reorder remaining waitlist entries
    await prisma.$executeRaw`
      UPDATE class_waitlist 
      SET position = position - 1 
      WHERE class_id = ${entry.classId} 
      AND position > ${entry.position}
      AND tenant_id = ${tenantId}
    `;
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get class waitlist
export const getClassWaitlist = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const waitlist = await prisma.classWaitlist.findMany({
      where: { classId, tenantId },
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
      },
      orderBy: { position: 'asc' }
    });
    
    res.status(200).json({ status: 'success', data: waitlist });
  } catch (error) {
    next(error);
  }
};
