/**
 * Waitlist Notification Service
 * 
 * Handles sending notifications for waitlist events
 * Supports: Email, SMS, In-App, Push notifications
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationPayload {
  waitlistEntryId: string;
  notificationType: 'SPOT_AVAILABLE' | 'POSITION_UPDATE' | 'EXPIRING_SOON' | 'CONVERTED' | 'CANCELLED';
  recipientType: 'STAFF' | 'CUSTOMER';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  data: {
    customerName?: string;
    petName?: string;
    serviceType?: string;
    requestedDate?: string;
    position?: number;
    expiresAt?: string;
    reservationId?: string;
  };
}

export interface NotificationTemplate {
  subject: string;
  message: string;
  emailHtml?: string;
  smsText?: string;
}

class WaitlistNotificationService {
  /**
   * Send notification for waitlist event
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const template = this.getTemplate(payload.notificationType, payload.data);
    const config = await this.getNotificationConfig(payload.recipientType);

    // Create notification record
    const notification = await prisma.waitlistNotification.create({
      data: {
        waitlistEntryId: payload.waitlistEntryId,
        notificationType: payload.notificationType,
        recipientType: payload.recipientType,
        recipientId: payload.recipientId,
        channel: 'EMAIL', // Default, can be determined by config
        status: 'PENDING',
        subject: template.subject,
        message: template.message,
        expiresAt: this.calculateExpiration(payload.notificationType)
      }
    });

    // Send via configured channels
    const channels = this.getChannels(payload.recipientType, config);
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'EMAIL':
            if (payload.recipientEmail) {
              await this.sendEmail(payload.recipientEmail, template);
            }
            break;
          case 'SMS':
            if (payload.recipientPhone) {
              await this.sendSMS(payload.recipientPhone, template);
            }
            break;
          case 'IN_APP':
            await this.sendInAppNotification(payload.recipientId, template);
            break;
          case 'PUSH':
            await this.sendPushNotification(payload.recipientId, template);
            break;
        }

        // Update notification status
        await prisma.waitlistNotification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        });
      } catch (error: any) {
        console.error(`Failed to send ${channel} notification:`, error);
        
        // Update notification with error
        await prisma.waitlistNotification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message
          }
        });
      }
    }
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(payloads: NotificationPayload[]): Promise<void> {
    await Promise.all(payloads.map(payload => this.sendNotification(payload)));
  }

  /**
   * Notify staff of new waitlist entry
   */
  async notifyStaffNewEntry(waitlistEntry: any): Promise<void> {
    // Get all staff members who should be notified
    const staff = await prisma.staff.findMany({
      where: {
        tenantId: waitlistEntry.tenantId,
        isActive: true,
        role: {
          in: ['TENANT_ADMIN', 'MANAGER']
        }
      }
    });

    const notifications = staff.map(staffMember => ({
      waitlistEntryId: waitlistEntry.id,
      notificationType: 'SPOT_AVAILABLE' as const,
      recipientType: 'STAFF' as const,
      recipientId: staffMember.id,
      recipientEmail: staffMember.email,
      recipientName: `${staffMember.firstName} ${staffMember.lastName}`,
      data: {
        customerName: `${waitlistEntry.customer.firstName} ${waitlistEntry.customer.lastName}`,
        petName: waitlistEntry.pet.name,
        serviceType: waitlistEntry.serviceType,
        requestedDate: waitlistEntry.requestedStartDate,
        position: waitlistEntry.position
      }
    }));

    await this.sendBatchNotifications(notifications);
  }

  /**
   * Notify customer of spot availability
   */
  async notifyCustomerSpotAvailable(waitlistEntry: any): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    await this.sendNotification({
      waitlistEntryId: waitlistEntry.id,
      notificationType: 'SPOT_AVAILABLE',
      recipientType: 'CUSTOMER',
      recipientId: waitlistEntry.customerId,
      recipientEmail: waitlistEntry.customer.email,
      recipientPhone: waitlistEntry.customer.phone,
      recipientName: `${waitlistEntry.customer.firstName} ${waitlistEntry.customer.lastName}`,
      data: {
        customerName: `${waitlistEntry.customer.firstName} ${waitlistEntry.customer.lastName}`,
        petName: waitlistEntry.pet.name,
        serviceType: waitlistEntry.serviceType,
        requestedDate: waitlistEntry.requestedStartDate,
        expiresAt: expiresAt.toISOString()
      }
    });
  }

  /**
   * Notify customer of position update
   */
  async notifyCustomerPositionUpdate(waitlistEntry: any, oldPosition: number): Promise<void> {
    // Only notify if moved up significantly (e.g., 3+ positions)
    if (oldPosition - waitlistEntry.position < 3) {
      return;
    }

    await this.sendNotification({
      waitlistEntryId: waitlistEntry.id,
      notificationType: 'POSITION_UPDATE',
      recipientType: 'CUSTOMER',
      recipientId: waitlistEntry.customerId,
      recipientEmail: waitlistEntry.customer.email,
      recipientPhone: waitlistEntry.customer.phone,
      recipientName: `${waitlistEntry.customer.firstName} ${waitlistEntry.customer.lastName}`,
      data: {
        customerName: `${waitlistEntry.customer.firstName} ${waitlistEntry.customer.lastName}`,
        petName: waitlistEntry.pet.name,
        serviceType: waitlistEntry.serviceType,
        position: waitlistEntry.position
      }
    });
  }

  /**
   * Get notification template
   */
  private getTemplate(type: string, data: any): NotificationTemplate {
    const templates: Record<string, NotificationTemplate> = {
      SPOT_AVAILABLE: {
        subject: '🎉 Great News! A Spot Opened Up',
        message: `Good news, ${data.customerName}! A spot has opened up for ${data.petName}'s ${data.serviceType} on ${data.requestedDate}. Book now before it's gone! This offer expires in 24 hours.`,
        emailHtml: this.generateSpotAvailableEmail(data),
        smsText: `Good news! A spot opened for ${data.petName}'s ${data.serviceType} on ${data.requestedDate}. Book now! Expires in 24hrs. Reply YES to book.`
      },
      POSITION_UPDATE: {
        subject: 'You Moved Up on the Waitlist!',
        message: `Great news, ${data.customerName}! You've moved up to position #${data.position} on the waitlist for ${data.petName}'s ${data.serviceType}.`,
        emailHtml: this.generatePositionUpdateEmail(data),
        smsText: `You're now #${data.position} on the waitlist for ${data.petName}'s ${data.serviceType}!`
      },
      EXPIRING_SOON: {
        subject: 'Waitlist Entry Expiring Soon',
        message: `Hi ${data.customerName}, your waitlist entry for ${data.petName}'s ${data.serviceType} will expire on ${data.expiresAt}. Please contact us if you'd like to stay on the waitlist.`,
        emailHtml: this.generateExpiringSoonEmail(data),
        smsText: `Your waitlist entry for ${data.petName} expires soon. Contact us to stay on the list.`
      },
      CONVERTED: {
        subject: 'Reservation Confirmed!',
        message: `Congratulations, ${data.customerName}! Your waitlist entry has been converted to a confirmed reservation for ${data.petName}'s ${data.serviceType}.`,
        emailHtml: this.generateConvertedEmail(data),
        smsText: `Confirmed! Your reservation for ${data.petName} is booked. Reservation #${data.reservationId}`
      },
      CANCELLED: {
        subject: 'Waitlist Entry Cancelled',
        message: `Hi ${data.customerName}, your waitlist entry for ${data.petName}'s ${data.serviceType} has been cancelled as requested.`,
        emailHtml: this.generateCancelledEmail(data),
        smsText: `Your waitlist entry for ${data.petName} has been cancelled.`
      }
    };

    return templates[type] || {
      subject: 'Waitlist Update',
      message: 'Your waitlist status has been updated.',
      emailHtml: '<p>Your waitlist status has been updated.</p>'
    };
  }

  /**
   * Generate HTML email for spot available
   */
  private generateSpotAvailableEmail(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Great News!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>A spot has opened up for <strong>${data.petName}'s ${data.serviceType}</strong> service!</p>
            <p><strong>Requested Date:</strong> ${data.requestedDate}</p>
            
            <div class="alert">
              <strong>⏰ Act Fast!</strong> This offer expires in 24 hours. Book now to secure your spot!
            </div>

            <center>
              <a href="https://yourdomain.com/book" class="button">Book Now</a>
            </center>

            <p>If you have any questions or need to make changes, please contact us.</p>
            <p>Thank you for your patience!</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from your waitlist.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML email for position update
   */
  private generatePositionUpdateEmail(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .position { font-size: 48px; color: #2196F3; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You Moved Up!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Great news! You've moved up on the waitlist for <strong>${data.petName}'s ${data.serviceType}</strong>.</p>
            
            <div class="position">#${data.position}</div>
            <p style="text-align: center; color: #666;">Your new position in the queue</p>

            <p>We'll notify you as soon as a spot becomes available!</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from your waitlist.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML email for expiring soon
   */
  private generateExpiringSoonEmail(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Waitlist Entry Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <div class="warning">
              <strong>Your waitlist entry will expire on ${data.expiresAt}</strong>
            </div>

            <p>Service: <strong>${data.petName}'s ${data.serviceType}</strong></p>
            
            <p>If you'd like to stay on the waitlist, please contact us to extend your entry.</p>

            <center>
              <a href="https://yourdomain.com/contact" class="button">Contact Us</a>
            </center>
          </div>
          <div class="footer">
            <p>This is an automated notification from your waitlist.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML email for converted
   */
  private generateConvertedEmail(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Reservation Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <div class="success">
              <strong>Congratulations!</strong> Your waitlist entry has been converted to a confirmed reservation.
            </div>

            <p><strong>Service:</strong> ${data.petName}'s ${data.serviceType}</p>
            <p><strong>Reservation ID:</strong> ${data.reservationId}</p>

            <p>We look forward to seeing you and ${data.petName}!</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from your waitlist.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML email for cancelled
   */
  private generateCancelledEmail(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #666; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Waitlist Entry Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your waitlist entry for <strong>${data.petName}'s ${data.serviceType}</strong> has been cancelled as requested.</p>
            <p>If this was a mistake or you'd like to rejoin the waitlist, please contact us.</p>
            <p>Thank you!</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from your waitlist.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send email notification
   */
  private async sendEmail(email: string, template: NotificationTemplate): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL] Sending to ${email}:`, template.subject);
    
    // Example SendGrid integration:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: email,
    //   from: 'noreply@yourdomain.com',
    //   subject: template.subject,
    //   text: template.message,
    //   html: template.emailHtml
    // });
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(phone: string, template: NotificationTemplate): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`[SMS] Sending to ${phone}:`, template.smsText);
    
    // Example Twilio integration:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: template.smsText,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(userId: string, template: NotificationTemplate): Promise<void> {
    // TODO: Implement in-app notification (WebSocket, database record, etc.)
    console.log(`[IN-APP] Sending to user ${userId}:`, template.subject);
    
    // Could create a notification record in the database
    // that the frontend polls or receives via WebSocket
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(userId: string, template: NotificationTemplate): Promise<void> {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    console.log(`[PUSH] Sending to user ${userId}:`, template.subject);
    
    // Example Firebase integration:
    // const admin = require('firebase-admin');
    // await admin.messaging().send({
    //   token: userDeviceToken,
    //   notification: {
    //     title: template.subject,
    //     body: template.message
    //   }
    // });
  }

  /**
   * Get notification config for tenant
   */
  private async getNotificationConfig(recipientType: string): Promise<any> {
    // Get from waitlist config or use defaults
    return {
      customerChannels: ['EMAIL', 'SMS'],
      staffChannels: ['IN_APP', 'EMAIL']
    };
  }

  /**
   * Get channels for recipient type
   */
  private getChannels(recipientType: string, config: any): string[] {
    return recipientType === 'CUSTOMER' 
      ? config.customerChannels 
      : config.staffChannels;
  }

  /**
   * Calculate expiration for notification
   */
  private calculateExpiration(type: string): Date | null {
    if (type === 'SPOT_AVAILABLE') {
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);
      return expires;
    }
    return null;
  }
}

export const waitlistNotificationService = new WaitlistNotificationService();
export default waitlistNotificationService;
