import { TenantRequest } from '../middleware/tenant.middleware';
import { Request, Response } from 'express';
import { smsService } from '../services/sms.service';
import { prisma } from '../config/prisma';

/**
 * SMS Controller
 * 
 * Handles SMS messaging endpoints for Twilio integration
 * Supports appointment reminders, confirmations, and marketing messages
 */

export class SMSController {
  /**
   * GET /api/sms/config
   * Check Twilio configuration status
   */
  async getConfig(req: TenantRequest, res: Response) {
    try {
      const isConfigured = smsService.isConfigured();
      
      res.json({
        success: true,
        data: {
          twilioConfigured: isConfigured,
          message: isConfigured 
            ? 'Twilio is configured and ready to send SMS' 
            : 'Twilio is not configured. SMS messages will be logged but not sent.',
        },
      });
    } catch (error: any) {
      console.error('Error checking SMS config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check SMS configuration',
      });
    }
  }

  /**
   * POST /api/sms/test
   * Send a test SMS message
   */
  async sendTestSMS(req: TenantRequest, res: Response) {
    try {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required',
        });
      }

      const result = await smsService.sendSMS({
        to: phoneNumber,
        message: message || 'This is a test message from Tailtown Pet Resort!',
      });

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send test SMS',
      });
    }
  }

  /**
   * POST /api/sms/reservation-reminder/:reservationId
   * Send appointment reminder for a reservation
   */
  async sendReservationReminder(req: TenantRequest, res: Response) {
    try {
      const { reservationId } = req.params;
      const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

      // Fetch reservation with customer and pet details
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

      if (!reservation.customer.phone) {
        return res.status(400).json({
          success: false,
          error: 'Customer phone number not available',
        });
      }

      // Get tenant info (you might want to fetch this from a tenant table)
      const tenantName = process.env.BUSINESS_NAME || 'Tailtown Pet Resort';
      const tenantPhone = process.env.BUSINESS_PHONE;

      const result = await smsService.sendAppointmentReminder({
        customerName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
        customerPhone: reservation.customer.phone,
        petName: reservation.pet.name,
        serviceName: reservation.service.name,
        startDate: new Date(reservation.startDate),
        tenantName,
        tenantPhone,
      });

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Error sending reservation reminder:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send reservation reminder',
      });
    }
  }

  /**
   * POST /api/sms/reservation-confirmation/:reservationId
   * Send reservation confirmation SMS
   */
  async sendReservationConfirmation(req: TenantRequest, res: Response) {
    try {
      const { reservationId } = req.params;
      const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

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

      if (!reservation.customer.phone) {
        return res.status(400).json({
          success: false,
          error: 'Customer phone number not available',
        });
      }

      const tenantName = process.env.BUSINESS_NAME || 'Tailtown Pet Resort';
      const tenantPhone = process.env.BUSINESS_PHONE;

      const result = await smsService.sendReservationConfirmation({
        customerName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
        customerPhone: reservation.customer.phone,
        petName: reservation.pet.name,
        serviceName: reservation.service.name,
        startDate: new Date(reservation.startDate),
        endDate: new Date(reservation.endDate),
        orderNumber: reservation.orderNumber || undefined,
        tenantName,
        tenantPhone,
      });

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Error sending reservation confirmation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send reservation confirmation',
      });
    }
  }

  /**
   * POST /api/sms/welcome/:customerId
   * Send welcome message to new customer
   */
  async sendWelcomeMessage(req: TenantRequest, res: Response) {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      if (!customer.phone) {
        return res.status(400).json({
          success: false,
          error: 'Customer phone number not available',
        });
      }

      const tenantName = process.env.BUSINESS_NAME || 'Tailtown Pet Resort';
      const tenantPhone = process.env.BUSINESS_PHONE;

      const result = await smsService.sendWelcomeMessage({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
        tenantName,
        tenantPhone,
      });

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Error sending welcome message:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send welcome message',
      });
    }
  }

  /**
   * POST /api/sms/marketing
   * Send marketing message to customers
   */
  async sendMarketingMessage(req: TenantRequest, res: Response) {
    try {
      const { customerIds, message } = req.body;
      const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Customer IDs array is required',
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
        });
      }

      const customers = await prisma.customer.findMany({
        where: {
          id: { in: customerIds },
          tenantId,
        },
      });

      const tenantName = process.env.BUSINESS_NAME || 'Tailtown Pet Resort';
      const results = [];

      for (const customer of customers) {
        if (customer.phone) {
          const result = await smsService.sendMarketingMessage({
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerPhone: customer.phone,
            message,
            tenantName,
          });
          
          results.push({
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            ...result,
          });
        } else {
          results.push({
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            success: false,
            error: 'No phone number',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        data: {
          sent: successCount,
          failed: failureCount,
          results,
        },
      });
    } catch (error: any) {
      console.error('Error sending marketing messages:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send marketing messages',
      });
    }
  }

  /**
   * POST /api/sms/check-in/:reservationId
   * Send check-in notification
   */
  async sendCheckInNotification(req: TenantRequest, res: Response) {
    try {
      const { reservationId } = req.params;
      const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          customer: true,
          pet: true,
        },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }

      if (!reservation.customer.phone) {
        return res.status(400).json({
          success: false,
          error: 'Customer phone number not available',
        });
      }

      const tenantName = process.env.BUSINESS_NAME || 'Tailtown Pet Resort';

      const result = await smsService.sendCheckInNotification({
        customerName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
        customerPhone: reservation.customer.phone,
        petName: reservation.pet.name,
        tenantName,
      });

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Error sending check-in notification:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send check-in notification',
      });
    }
  }

  /**
   * POST /api/sms/check-out/:reservationId
   * Send check-out notification
   */
  async sendCheckOutNotification(req: TenantRequest, res: Response) {
    try {
      const { reservationId } = req.params;
      const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');

      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
        },
        include: {
          customer: true,
          pet: true,
        },
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }

      if (!reservation.customer.phone) {
        return res.status(400).json({
          success: false,
          error: 'Customer phone number not available',
        });
      }

      const tenantName = process.env.BUSINESS_NAME || 'Tailtown Pet Resort';

      const result = await smsService.sendCheckOutNotification({
        customerName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
        customerPhone: reservation.customer.phone,
        petName: reservation.pet.name,
        tenantName,
      });

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Error sending check-out notification:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send check-out notification',
      });
    }
  }
}

export const smsController = new SMSController();
