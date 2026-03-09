import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

/**
 * Groomer Appointment Controller
 * Manages grooming appointments assigned to specific groomers
 */

// Get all groomer appointments
export const getAllGroomerAppointments = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { groomerId, status, startDate, endDate } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const where: any = { tenantId };
    if (groomerId) where.groomerId = groomerId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate as string);
      if (endDate) where.scheduledDate.lte = new Date(endDate as string);
    }
    
    const appointments = await prisma.groomerAppointment.findMany({
      where,
      include: {
        groomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialties: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            breed: true
          }
        },
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
      orderBy: { scheduledDate: 'asc' }
    });
    
    res.status(200).json({ status: 'success', data: appointments });
  } catch (error) {
    next(error);
  }
};

// Get groomer appointment by ID
export const getGroomerAppointmentById = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const appointment = await prisma.groomerAppointment.findFirst({
      where: { id, tenantId },
      include: {
        groomer: true,
        service: true,
        pet: true,
        customer: true
      }
    });
    
    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }
    
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Create groomer appointment
export const createGroomerAppointment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const {
      reservationId,
      groomerId,
      serviceId,
      petId,
      customerId,
      scheduledDate,
      scheduledTime,
      duration,
      notes
    } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Validate required fields
    if (!groomerId || !serviceId || !petId || !customerId || !scheduledDate || !scheduledTime) {
      return next(new AppError('Missing required fields', 400));
    }
    
    // Check groomer availability
    const existingAppointments = await prisma.groomerAppointment.findMany({
      where: {
        tenantId,
        groomerId,
        scheduledDate: new Date(scheduledDate),
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    });
    
    // Check for time conflicts (simplified - should be more sophisticated)
    const hasConflict = existingAppointments.some(apt => {
      return apt.scheduledTime === scheduledTime;
    });
    
    if (hasConflict) {
      return next(new AppError('Groomer has conflicting appointment at this time', 409));
    }
    
    const appointment = await prisma.groomerAppointment.create({
      data: {
        tenantId,
        reservationId: reservationId || '',
        groomerId,
        serviceId,
        petId,
        customerId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        duration: duration || 60,
        notes
      },
      include: {
        groomer: true,
        service: true,
        pet: true,
        customer: true
      }
    });
    
    res.status(201).json({ status: 'success', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Update groomer appointment
export const updateGroomerAppointment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Verify appointment exists and belongs to tenant
    const existing = await prisma.groomerAppointment.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return next(new AppError('Appointment not found', 404));
    }
    
    const updateData: any = {};
    const allowedFields = ['scheduledDate', 'scheduledTime', 'duration', 'status', 'notes'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'scheduledDate') {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    const appointment = await prisma.groomerAppointment.update({
      where: { id },
      data: updateData,
      include: {
        groomer: true,
        service: true,
        pet: true,
        customer: true
      }
    });
    
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Reassign appointment to different groomer
export const reassignGroomerAppointment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newGroomerId, reason } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!newGroomerId) {
      return next(new AppError('New groomer ID is required', 400));
    }
    
    // Verify appointment exists
    const existing = await prisma.groomerAppointment.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return next(new AppError('Appointment not found', 404));
    }
    
    // Check new groomer availability
    const conflicts = await prisma.groomerAppointment.findMany({
      where: {
        tenantId,
        groomerId: newGroomerId,
        scheduledDate: existing.scheduledDate,
        scheduledTime: existing.scheduledTime,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    });
    
    if (conflicts.length > 0) {
      return next(new AppError('New groomer has conflicting appointment', 409));
    }
    
    const appointment = await prisma.groomerAppointment.update({
      where: { id },
      data: {
        groomerId: newGroomerId,
        notes: reason ? `${existing.notes || ''}\nReassigned: ${reason}` : existing.notes
      },
      include: {
        groomer: true,
        service: true,
        pet: true,
        customer: true
      }
    });
    
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Start appointment (mark as in progress)
export const startGroomerAppointment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const appointment = await prisma.groomerAppointment.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        actualStartTime: new Date()
      },
      include: {
        groomer: true,
        service: true,
        pet: true,
        customer: true
      }
    });
    
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Complete appointment
export const completeGroomerAppointment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const appointment = await prisma.groomerAppointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualEndTime: new Date(),
        notes: notes || undefined
      },
      include: {
        groomer: true,
        service: true,
        pet: true,
        customer: true
      }
    });
    
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Cancel appointment
export const cancelGroomerAppointment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const existing = await prisma.groomerAppointment.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return next(new AppError('Appointment not found', 404));
    }
    
    const appointment = await prisma.groomerAppointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${existing.notes || ''}\nCancelled: ${reason}` : existing.notes
      }
    });
    
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error) {
    next(error);
  }
};

// Delete appointment
export const deleteGroomerAppointment = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const existing = await prisma.groomerAppointment.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return next(new AppError('Appointment not found', 404));
    }
    
    await prisma.groomerAppointment.delete({ where: { id } });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get groomer's schedule for date range
export const getGroomerSchedule = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { groomerId } = req.params;
    const { startDate, endDate } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }
    
    const appointments = await prisma.groomerAppointment.findMany({
      where: {
        tenantId,
        groomerId,
        scheduledDate: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      include: {
        service: true,
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
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' }
      ]
    });
    
    // Get groomer breaks for the same period
    const breaks = await prisma.groomerBreak.findMany({
      where: {
        tenantId,
        groomerId,
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        appointments,
        breaks
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get available groomers for specific date/time
export const getAvailableGroomers = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const { date, time, duration, serviceId } = req.query;
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    if (!date || !time) {
      return next(new AppError('Date and time are required', 400));
    }
    
    // Get all active groomers with grooming specialty
    const groomers = await prisma.staff.findMany({
      where: {
        tenantId,
        isActive: true,
        specialties: {
          has: 'GROOMING'
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialties: true,
        groomingSkills: true,
        maxAppointmentsPerDay: true,
        averageServiceTime: true
      }
    });
    
    const groomerIds = groomers.map(g => g.id);
    const scheduledDate = new Date(date as string);
    
    // Batch fetch all appointments for all groomers (prevents N+1 query)
    const allAppointments = await prisma.groomerAppointment.findMany({
      where: {
        tenantId,
        groomerId: { in: groomerIds },
        scheduledDate,
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] }
      },
      select: {
        groomerId: true,
        scheduledTime: true,
        status: true
      }
    });
    
    // Batch fetch all breaks for all groomers (prevents N+1 query)
    const allBreaks = await prisma.groomerBreak.findMany({
      where: {
        tenantId,
        groomerId: { in: groomerIds },
        date: scheduledDate,
        startTime: { lte: time as string },
        endTime: { gte: time as string }
      },
      select: {
        groomerId: true
      }
    });
    
    // Create lookup maps for O(1) access
    const appointmentsByGroomer = allAppointments.reduce((acc, apt) => {
      if (!acc[apt.groomerId]) acc[apt.groomerId] = [];
      acc[apt.groomerId].push(apt);
      return acc;
    }, {} as Record<string, typeof allAppointments>);
    
    const breaksByGroomer = new Set(allBreaks.map(b => b.groomerId));
    
    // Check each groomer's availability using pre-fetched data
    const availableGroomers = [];
    
    for (const groomer of groomers) {
      const groomerAppointments = appointmentsByGroomer[groomer.id] || [];
      const hasBreak = breaksByGroomer.has(groomer.id);
      
      // Check for conflicts at the specific time
      const conflicts = groomerAppointments.filter(
        apt => apt.scheduledTime === time && 
        (apt.status === 'SCHEDULED' || apt.status === 'IN_PROGRESS')
      );
      
      if (conflicts.length === 0 && !hasBreak) {
        // Check daily capacity if set
        if (groomer.maxAppointmentsPerDay) {
          const dailyCount = groomerAppointments.length;
          
          if (dailyCount >= groomer.maxAppointmentsPerDay) {
            continue;
          }
        }
        
        availableGroomers.push(groomer);
      }
    }
    
    res.status(200).json({ status: 'success', data: availableGroomers });
  } catch (error) {
    next(error);
  }
};
