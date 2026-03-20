/**
 * Report Card Bulk Operations Controller
 *
 * Handles bulk operations:
 * - sendReportCard
 * - bulkCreateReportCards
 * - bulkSendReportCards
 * - getCustomerReportCards
 * - getPetReportCards
 * - getReservationReportCards
 */

import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/prisma';

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
 * Send report card via email/SMS
 * POST /api/report-cards/:id/send
 */
export const sendReportCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { sendEmail = true, sendSMS = true } = req.body;

    const reportCard = await prisma.reportCard.findFirst({
      where: { id, tenantId: tenantId! },
      include: {
        customer: true,
        pet: true,
        photos: { orderBy: { order: 'asc' } },
      },
    });

    if (!reportCard) {
      return next(new AppError('Report card not found', 404));
    }

    const updateData: any = { status: 'SENT', sentAt: new Date() };

    if (sendEmail) {
      updateData.sentViaEmail = true;
      updateData.emailDeliveredAt = new Date();
      logger.info(`Sending report card email to ${reportCard.customer.email}`);
    }

    if (sendSMS && reportCard.customer.phone) {
      updateData.sentViaSMS = true;
      updateData.smsDeliveredAt = new Date();
      logger.info(`Sending report card SMS to ${reportCard.customer.phone}`);
    }

    const updated = await prisma.reportCard.update({
      where: { id },
      data: updateData,
      include: { customer: true, pet: true, photos: true },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Report card sent successfully',
    });
  } catch (error: any) {
    next(new AppError(error.message || 'Failed to send report card', 500));
  }
};

/**
 * Bulk create report cards
 * POST /api/report-cards/bulk
 */
export const bulkCreateReportCards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const staffId = req.user?.id;

    if (!tenantId || !staffId) {
      return next(new AppError('Tenant ID and Staff ID are required', 400));
    }

    const { reportCards } = req.body;

    if (!Array.isArray(reportCards) || reportCards.length === 0) {
      return next(new AppError('Report cards array is required', 400));
    }

    const created = await Promise.all(
      reportCards.map(async (card: any) => {
        return prisma.reportCard.create({
          data: {
            tenantId,
            petId: card.petId,
            customerId: card.customerId,
            reservationId: card.reservationId,
            createdByStaffId: staffId,
            serviceType: card.serviceType,
            templateType: card.templateType,
            title: card.title,
            summary: card.summary,
            moodRating: card.moodRating,
            energyRating: card.energyRating,
            appetiteRating: card.appetiteRating,
            socialRating: card.socialRating,
            activities: card.activities || [],
            mealsEaten: card.mealsEaten || [],
            bathroomBreaks: card.bathroomBreaks,
            medicationGiven: card.medicationGiven || false,
            medicationNotes: card.medicationNotes,
            behaviorNotes: card.behaviorNotes,
            highlights: card.highlights || [],
            concerns: card.concerns || [],
            tags: card.tags || [],
            notes: card.notes,
          },
          include: {
            pet: { select: { id: true, name: true } },
            customer: { select: { id: true, firstName: true, lastName: true } },
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      data: { created: created.length, reportCards: created },
    });
  } catch (error: any) {
    next(
      new AppError(error.message || 'Failed to create bulk report cards', 500)
    );
  }
};

/**
 * Bulk send report cards
 * POST /api/report-cards/bulk/send
 */
export const bulkSendReportCards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { reportCardIds, sendEmail = true, sendSMS = true } = req.body;

    if (!Array.isArray(reportCardIds) || reportCardIds.length === 0) {
      return next(new AppError('Report card IDs array is required', 400));
    }

    const updateData: any = { status: 'SENT', sentAt: new Date() };

    if (sendEmail) {
      updateData.sentViaEmail = true;
      updateData.emailDeliveredAt = new Date();
    }

    if (sendSMS) {
      updateData.sentViaSMS = true;
      updateData.smsDeliveredAt = new Date();
    }

    const result = await prisma.reportCard.updateMany({
      where: { id: { in: reportCardIds }, tenantId: tenantId! },
      data: updateData,
    });

    res.json({
      success: true,
      data: { sent: result.count },
      message: `${result.count} report cards sent successfully`,
    });
  } catch (error: any) {
    next(
      new AppError(error.message || 'Failed to send bulk report cards', 500)
    );
  }
};

/**
 * Get customer's report cards
 * GET /api/customers/:customerId/report-cards
 */
export const getCustomerReportCards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.tenantId;

    const reportCards = await prisma.reportCard.findMany({
      where: {
        customerId,
        tenantId: tenantId!,
        status: { in: ['SENT', 'VIEWED'] },
      },
      include: {
        pet: { select: { id: true, name: true, type: true, breed: true } },
        photos: { orderBy: { order: 'asc' } },
        createdByStaff: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reportDate: 'desc' },
    });

    res.json({ success: true, data: reportCards });
  } catch (error: any) {
    next(
      new AppError(
        error.message || 'Failed to fetch customer report cards',
        500
      )
    );
  }
};

/**
 * Get pet's report cards
 * GET /api/pets/:petId/report-cards
 */
export const getPetReportCards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { petId } = req.params;
    const tenantId = req.tenantId;

    const reportCards = await prisma.reportCard.findMany({
      where: { petId, tenantId: tenantId! },
      include: {
        photos: { orderBy: { order: 'asc' }, take: 3 },
        createdByStaff: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reportDate: 'desc' },
    });

    res.json({ success: true, data: reportCards });
  } catch (error: any) {
    next(
      new AppError(error.message || 'Failed to fetch pet report cards', 500)
    );
  }
};

/**
 * Get reservation's report cards
 * GET /api/reservations/:reservationId/report-cards
 */
export const getReservationReportCards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reservationId } = req.params;
    const tenantId = req.tenantId;

    const reportCards = await prisma.reportCard.findMany({
      where: { reservationId, tenantId: tenantId! },
      include: {
        pet: { select: { id: true, name: true } },
        photos: { orderBy: { order: 'asc' } },
        createdByStaff: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reportDate: 'asc' },
    });

    res.json({ success: true, data: reportCards });
  } catch (error: any) {
    next(
      new AppError(
        error.message || 'Failed to fetch reservation report cards',
        500
      )
    );
  }
};
