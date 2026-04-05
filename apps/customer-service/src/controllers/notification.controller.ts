import { env } from '../env.js';
/**
 * Notification Controller
 *
 * Handles email notification endpoints for reservation events.
 * Called by the reservation service to send customer notifications.
 */

import { type Response } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';
import { type TenantRequest } from '../middleware/tenant.middleware.js';
import { emailService } from '../services/email.service.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

class NotificationController {
  /**
   * POST /api/notifications/reservation-confirmation/:reservationId
   * Send reservation confirmation email
   */
  async sendReservationConfirmation(req: TenantRequest, res: Response) {
    try {
      const reservationId = assertStringRouteParam(
        req.params.reservationId,
        req.originalUrl,
        AppError.validationError,
        'Reservation ID is required'
      );
      const tenantId =
        req.tenantId || (env.NODE_ENV !== 'production' && 'dev');

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          customer: true,
          pet: true,
          service: true,
        },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }

      if (!reservation.customer.email) {
        return res.status(400).json({
          success: false,
          error: 'Customer email not available',
        });
      }

      const businessName = env.BUSINESS_NAME || 'Tailtown Pet Resort';

      await emailService.sendReservationConfirmation({
        reservation: {
          ...reservation,
          pets: [reservation.pet],
        },
        businessName,
      });

      res.json({
        success: true,
        message: 'Confirmation email sent',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error sending confirmation email:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send confirmation email',
      });
    }
  }

  /**
   * POST /api/notifications/check-in/:reservationId
   * Send check-in notification email
   */
  async sendCheckInNotification(req: TenantRequest, res: Response) {
    try {
      const reservationId = assertStringRouteParam(
        req.params.reservationId,
        req.originalUrl,
        AppError.validationError,
        'Reservation ID is required'
      );
      const tenantId =
        req.tenantId || (env.NODE_ENV !== 'production' && 'dev');

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          customer: true,
          pet: true,
          service: true,
        },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }

      if (!reservation.customer.email) {
        return res.status(400).json({
          success: false,
          error: 'Customer email not available',
        });
      }

      const businessName = env.BUSINESS_NAME || 'Tailtown Pet Resort';

      await emailService.sendReservationStatusChange(
        {
          reservation: {
            ...reservation,
            pets: [reservation.pet],
          },
          businessName,
        },
        reservation.status || 'PENDING',
        'CHECKED_IN'
      );

      res.json({
        success: true,
        message: 'Check-in email sent',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error sending check-in email:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send check-in email',
      });
    }
  }

  /**
   * POST /api/notifications/check-out/:reservationId
   * Send check-out notification email
   */
  async sendCheckOutNotification(req: TenantRequest, res: Response) {
    try {
      const reservationId = assertStringRouteParam(
        req.params.reservationId,
        req.originalUrl,
        AppError.validationError,
        'Reservation ID is required'
      );
      const tenantId =
        req.tenantId || (env.NODE_ENV !== 'production' && 'dev');

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          customer: true,
          pet: true,
          service: true,
        },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }

      if (!reservation.customer.email) {
        return res.status(400).json({
          success: false,
          error: 'Customer email not available',
        });
      }

      const businessName = env.BUSINESS_NAME || 'Tailtown Pet Resort';

      await emailService.sendReservationStatusChange(
        {
          reservation: {
            ...reservation,
            pets: [reservation.pet],
          },
          businessName,
        },
        reservation.status || 'CHECKED_IN',
        'CHECKED_OUT'
      );

      res.json({
        success: true,
        message: 'Check-out email sent',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error sending check-out email:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send check-out email',
      });
    }
  }

  /**
   * POST /api/notifications/status-change/:reservationId
   * Send status change notification email
   */
  async sendStatusChangeNotification(req: TenantRequest, res: Response) {
    try {
      const reservationId = assertStringRouteParam(
        req.params.reservationId,
        req.originalUrl,
        AppError.validationError,
        'Reservation ID is required'
      );
      const { oldStatus, newStatus } = req.body;
      const tenantId =
        req.tenantId || (env.NODE_ENV !== 'production' && 'dev');

      if (!oldStatus || !newStatus) {
        return res.status(400).json({
          success: false,
          error: 'oldStatus and newStatus are required',
        });
      }

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          customer: true,
          pet: true,
          service: true,
        },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }

      if (!reservation.customer.email) {
        return res.status(400).json({
          success: false,
          error: 'Customer email not available',
        });
      }

      const businessName = env.BUSINESS_NAME || 'Tailtown Pet Resort';

      await emailService.sendReservationStatusChange(
        {
          reservation: {
            ...reservation,
            pets: [reservation.pet],
          },
          businessName,
        },
        oldStatus,
        newStatus
      );

      res.json({
        success: true,
        message: 'Status change email sent',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error sending status change email:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send status change email',
      });
    }
  }

  /**
   * POST /api/notifications/reminder/:reservationId
   * Send reservation reminder email
   */
  async sendReservationReminder(req: TenantRequest, res: Response) {
    try {
      const reservationId = assertStringRouteParam(
        req.params.reservationId,
        req.originalUrl,
        AppError.validationError,
        'Reservation ID is required'
      );
      const tenantId =
        req.tenantId || (env.NODE_ENV !== 'production' && 'dev');

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          customer: true,
          pet: true,
          service: true,
        },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }

      if (!reservation.customer.email) {
        return res.status(400).json({
          success: false,
          error: 'Customer email not available',
        });
      }

      const businessName = env.BUSINESS_NAME || 'Tailtown Pet Resort';
      const businessPhone = env.BUSINESS_PHONE;

      await emailService.sendReservationReminder({
        reservation: {
          ...reservation,
          pets: [reservation.pet],
        },
        businessName,
        businessPhone,
      });

      res.json({
        success: true,
        message: 'Reminder email sent',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error sending reminder email:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send reminder email',
      });
    }
  }
}

export const notificationController = new NotificationController();
