/**
 * Waitlist Controller
 * 
 * Handles waitlist operations for fully booked services:
 * - Adding customers to waitlist
 * - Checking availability and notifying customers
 * - Converting waitlist entries to reservations
 * - Managing waitlist positions
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import AppError from '../utils/appError';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'STAFF';
    tenantId?: string;
  };
  tenantId?: string;
}

/**
 * Add customer to waitlist
 * POST /api/waitlist
 */
export const addToWaitlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const {
      customerId,
      petId,
      serviceType,
      requestedStartDate,
      requestedEndDate,
      requestedTime,
      flexibleDates,
      dateFlexibilityDays,
      serviceId,
      resourceId,
      groomerId,
      classId,
      preferences,
      customerNotes
    } = req.body;

    // Validate required fields
    if (!customerId || !petId || !serviceType || !requestedStartDate) {
      return next(new AppError('Missing required fields', 400));
    }

    // Verify customer and pet exist and belong to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId }
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const pet = await prisma.pet.findFirst({
      where: { id: petId, customerId, tenantId }
    });

    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }

    // Calculate priority (timestamp-based - earlier = higher priority)
    const priority = BigInt(new Date().getTime());

    // Calculate position in queue
    const currentPosition = await prisma.waitlistEntry.count({
      where: {
        tenantId,
        serviceType,
        status: 'ACTIVE'
      }
    });

    // Calculate expiration date (30 days from now by default)
    const config = await prisma.waitlistConfig.findUnique({
      where: { tenantId }
    });

    const expirationDays = config?.entryExpirationDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create waitlist entry
    const entry = await prisma.waitlistEntry.create({
      data: {
        tenantId,
        customerId,
        petId,
        serviceType,
        requestedStartDate: new Date(requestedStartDate),
        requestedEndDate: requestedEndDate ? new Date(requestedEndDate) : null,
        requestedTime,
        flexibleDates: flexibleDates || false,
        dateFlexibilityDays,
        serviceId,
        resourceId,
        groomerId,
        classId,
        preferences: JSON.stringify(preferences || {}),
        customerNotes,
        priority,
        position: currentPosition + 1,
        expiresAt,
        status: 'ACTIVE'
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            breed: true
          }
        }
      }
    });

    // TODO: Send confirmation notification to customer

    res.status(201).json({
      status: 'success',
      data: {
        ...entry,
        preferences: JSON.parse(entry.preferences)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer's waitlist entries
 * GET /api/waitlist/my-entries
 */
export const getMyWaitlistEntries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.query;

    if (!tenantId || !customerId) {
      return next(new AppError('Tenant ID and Customer ID are required', 400));
    }

    const entries = await prisma.waitlistEntry.findMany({
      where: {
        tenantId,
        customerId: customerId as string,
        status: {
          in: ['ACTIVE', 'NOTIFIED']
        }
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    res.json({
      status: 'success',
      data: entries.map(entry => ({
        ...entry,
        preferences: JSON.parse(entry.preferences)
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove from waitlist
 * DELETE /api/waitlist/:id
 */
export const removeFromWaitlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    // Find and verify entry
    const entry = await prisma.waitlistEntry.findFirst({
      where: { id, tenantId }
    });

    if (!entry) {
      return next(new AppError('Waitlist entry not found', 404));
    }

    // Update status to CANCELLED
    await prisma.waitlistEntry.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    // Update positions for remaining entries
    await updateWaitlistPositions(tenantId, entry.serviceType);

    res.json({
      status: 'success',
      message: 'Removed from waitlist'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get waitlist position
 * GET /api/waitlist/:id/position
 */
export const getWaitlistPosition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const entry = await prisma.waitlistEntry.findFirst({
      where: { id, tenantId },
      select: {
        position: true,
        status: true,
        requestedStartDate: true,
        serviceType: true
      }
    });

    if (!entry) {
      return next(new AppError('Waitlist entry not found', 404));
    }

    // Get total count for this service type
    const totalInQueue = await prisma.waitlistEntry.count({
      where: {
        tenantId,
        serviceType: entry.serviceType,
        status: 'ACTIVE'
      }
    });

    res.json({
      status: 'success',
      data: {
        position: entry.position,
        totalInQueue,
        status: entry.status,
        estimatedWaitTime: calculateEstimatedWait(entry.position)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all waitlist entries (staff only)
 * GET /api/waitlist
 */
export const listWaitlistEntries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const { serviceType, status, startDate, endDate } = req.query;

    const where: any = { tenantId };

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.requestedStartDate = {};
      if (startDate) {
        where.requestedStartDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.requestedStartDate.lte = new Date(endDate as string);
      }
    }

    const entries = await prisma.waitlistEntry.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            breed: true
          }
        }
      },
      orderBy: [
        { serviceType: 'asc' },
        { position: 'asc' }
      ]
    });

    // Group by service type
    const grouped = entries.reduce((acc: any, entry) => {
      const type = entry.serviceType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        ...entry,
        preferences: JSON.parse(entry.preferences)
      });
      return acc;
    }, {});

    res.json({
      status: 'success',
      data: {
        entries: entries.map(e => ({
          ...e,
          preferences: JSON.parse(e.preferences)
        })),
        grouped,
        summary: {
          total: entries.length,
          byServiceType: Object.keys(grouped).map(type => ({
            serviceType: type,
            count: grouped[type].length
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update waitlist entry (staff only)
 * PATCH /api/waitlist/:id
 */
export const updateWaitlistEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { notes, status, position } = req.body;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const entry = await prisma.waitlistEntry.findFirst({
      where: { id, tenantId }
    });

    if (!entry) {
      return next(new AppError('Waitlist entry not found', 404));
    }

    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data: {
        notes,
        status,
        position,
        updatedAt: new Date()
      },
      include: {
        customer: true,
        pet: true
      }
    });

    res.json({
      status: 'success',
      data: {
        ...updated,
        preferences: JSON.parse(updated.preferences)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Convert waitlist entry to reservation (staff only)
 * POST /api/waitlist/:id/convert
 */
export const convertToReservation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { reservationId } = req.body;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    if (!reservationId) {
      return next(new AppError('Reservation ID is required', 400));
    }

    const entry = await prisma.waitlistEntry.findFirst({
      where: { id, tenantId }
    });

    if (!entry) {
      return next(new AppError('Waitlist entry not found', 404));
    }

    // Update entry as converted
    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedToReservationId: reservationId,
        convertedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update positions for remaining entries
    await updateWaitlistPositions(tenantId, entry.serviceType);

    // TODO: Send confirmation notification to customer

    res.json({
      status: 'success',
      data: updated,
      message: 'Waitlist entry converted to reservation'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check for matching availability and notify waitlist
 * POST /api/waitlist/check-availability
 */
export const checkAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const { serviceType, startDate, endDate, resourceId } = req.body;

    if (!serviceType || !startDate) {
      return next(new AppError('Service type and start date are required', 400));
    }

    // Find matching waitlist entries
    const matchingEntries = await findMatchingWaitlistEntries(
      tenantId,
      serviceType,
      new Date(startDate),
      endDate ? new Date(endDate) : undefined,
      resourceId
    );

    // Get config for max notifications
    const config = await prisma.waitlistConfig.findUnique({
      where: { tenantId }
    });

    const maxNotifications = config?.maxNotificationsPerAvailability || 3;

    // Notify top N entries
    const entriesToNotify = matchingEntries.slice(0, maxNotifications);

    const notifications = await Promise.all(
      entriesToNotify.map(entry => createNotification(entry, 'SPOT_AVAILABLE'))
    );

    res.json({
      status: 'success',
      data: {
        matchingEntries: matchingEntries.length,
        notified: entriesToNotify.length,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions

/**
 * Update positions for all active entries of a service type
 */
async function updateWaitlistPositions(tenantId: string, serviceType: string) {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      tenantId,
      serviceType: serviceType as any,
      status: 'ACTIVE'
    },
    orderBy: {
      priority: 'asc'
    }
  });

  // Update positions
  await Promise.all(
    entries.map((entry, index) =>
      prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { position: index + 1 }
      })
    )
  );
}

/**
 * Find waitlist entries matching availability
 */
async function findMatchingWaitlistEntries(
  tenantId: string,
  serviceType: string,
  startDate: Date,
  endDate?: Date,
  resourceId?: string
) {
  const where: any = {
    tenantId,
    serviceType,
    status: 'ACTIVE'
  };

  // Basic date matching (can be enhanced with flexible dates)
  where.requestedStartDate = {
    lte: startDate
  };

  if (resourceId) {
    where.OR = [
      { resourceId: null },
      { resourceId }
    ];
  }

  const entries = await prisma.waitlistEntry.findMany({
    where,
    include: {
      customer: true,
      pet: true
    },
    orderBy: {
      priority: 'asc'
    }
  });

  return entries;
}

/**
 * Create notification for waitlist entry
 */
async function createNotification(entry: any, type: string) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

  const notification = await prisma.waitlistNotification.create({
    data: {
      waitlistEntryId: entry.id,
      notificationType: type as any,
      recipientType: 'CUSTOMER',
      recipientId: entry.customerId,
      channel: 'EMAIL',
      status: 'PENDING',
      subject: 'Spot Available!',
      message: `Good news! A spot has opened up for your requested ${entry.serviceType} service.`,
      expiresAt
    }
  });

  // Update entry
  await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      status: 'NOTIFIED',
      lastNotifiedAt: new Date(),
      notificationsSent: entry.notificationsSent + 1
    }
  });

  return notification;
}

/**
 * Calculate estimated wait time based on position
 */
function calculateEstimatedWait(position: number): string {
  if (position === 1) return 'Next available';
  if (position <= 3) return '1-3 days';
  if (position <= 7) return '3-7 days';
  if (position <= 14) return '1-2 weeks';
  return '2+ weeks';
}
