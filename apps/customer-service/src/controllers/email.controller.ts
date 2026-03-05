import { Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { emailService } from '../services/email.service';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';

export class EmailController {
  /**
   * POST /api/emails/test
   * Send a test email
   */
  async sendTestEmail(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { to, subject, message } = req.body;

      if (!to || !subject || !message) {
        throw new AppError('Missing required fields: to, subject, message', 400);
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4c8bf5; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Test Email</h1>
              </div>
              <div class="content">
                <p>${message}</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await emailService.sendEmail({
        to,
        subject,
        html,
      });

      res.json({
        success: true,
        message: 'Test email sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/emails/reservation-confirmation/:reservationId
   * Send reservation confirmation email
   */
  async sendReservationConfirmation(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { reservationId } = req.params;
      const tenantId = req.tenantId!;

      // Fetch reservation with related data
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          pet: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new AppError('Reservation not found', 404);
      }

      // Fetch customer
      const customer = await prisma.customer.findUnique({
        where: { id: reservation.customerId },
      });

      if (!customer?.email) {
        throw new AppError('Customer email not found', 400);
      }

      // Get tenant info for business name
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessName: true, contactEmail: true, contactPhone: true },
      });

      // Create reservation with customer and pets array
      const reservationWithData = {
        ...reservation,
        customer,
        pets: reservation.pet ? [reservation.pet] : [],
      };

      await emailService.sendReservationConfirmation({
        reservation: reservationWithData,
        businessName: tenant?.businessName,
        businessEmail: tenant?.contactEmail || undefined,
        businessPhone: tenant?.contactPhone || undefined,
      });

      res.json({
        success: true,
        message: 'Confirmation email sent successfully',
        sentTo: customer.email,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/emails/reservation-reminder/:reservationId
   * Send reservation reminder email
   */
  async sendReservationReminder(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { reservationId } = req.params;
      const tenantId = req.tenantId!;

      // Fetch reservation with related data
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          pet: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new AppError('Reservation not found', 404);
      }

      // Fetch customer
      const customer = await prisma.customer.findUnique({
        where: { id: reservation.customerId },
      });

      if (!customer?.email) {
        throw new AppError('Customer email not found', 400);
      }

      // Get tenant info for business name
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessName: true, contactEmail: true, contactPhone: true },
      });

      // Create reservation with customer and pets array
      const reservationWithData = {
        ...reservation,
        customer,
        pets: reservation.pet ? [reservation.pet] : [],
      };

      await emailService.sendReservationReminder({
        reservation: reservationWithData,
        businessName: tenant?.businessName,
        businessEmail: tenant?.contactEmail || undefined,
        businessPhone: tenant?.contactPhone || undefined,
      });

      res.json({
        success: true,
        message: 'Reminder email sent successfully',
        sentTo: customer.email,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/emails/welcome/:customerId
   * Send welcome email to new customer
   */
  async sendWelcomeEmail(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId!;

      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      if (!customer.email) {
        throw new AppError('Customer email not found', 400);
      }

      // Get tenant info for business name
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessName: true },
      });

      await emailService.sendWelcomeEmail(customer, tenant?.businessName);

      res.json({
        success: true,
        message: 'Welcome email sent successfully',
        sentTo: customer.email,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/config
   * Get email configuration status
   */
  async getEmailConfig(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const isConfigured = !!process.env.SENDGRID_API_KEY;
      
      res.json({
        success: true,
        data: {
          isConfigured,
          fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@tailtown.com',
          fromName: process.env.SENDGRID_FROM_NAME || 'Tailtown Pet Resort',
          provider: 'SendGrid',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const emailController = new EmailController();
