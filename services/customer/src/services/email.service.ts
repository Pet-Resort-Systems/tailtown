import sgMail from "@sendgrid/mail";
import { Reservation, Customer, Pet } from "@prisma/client";

// Initialize SendGrid with API key from environment
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ReservationEmailData {
  reservation: Reservation & {
    customer?: Customer;
    pets?: Pet[];
    service?: { name: string };
  };
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@tailtown.com";
    this.fromName = process.env.SENDGRID_FROM_NAME || "Tailtown Pet Resort";
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn(
        "[Email Service] SendGrid API key not configured. Email not sent."
      );
      console.log("[Email Service] Would have sent:", options);
      return;
    }

    try {
      await sgMail.send({
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      console.log(
        `[Email Service] Email sent to ${options.to}: ${options.subject}`
      );
    } catch (error: any) {
      console.error(
        "[Email Service] Failed to send email:",
        error.response?.body || error.message
      );
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send reservation confirmation email
   */
  async sendReservationConfirmation(data: ReservationEmailData): Promise<void> {
    const { reservation, businessName = "Tailtown Pet Resort" } = data;

    if (!reservation.customer?.email) {
      console.warn(
        "[Email Service] No customer email provided for reservation confirmation"
      );
      return;
    }

    const petNames =
      reservation.pets?.map((p) => p.name).join(", ") || "your pet(s)";
    const serviceName = reservation.service?.name || "service";
    const startDate = new Date(reservation.startDate).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
    const startTime = new Date(reservation.startDate).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4c8bf5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4c8bf5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reservation Confirmed!</h1>
            </div>
            <div class="content">
              <p>Dear ${reservation.customer.firstName} ${
      reservation.customer.lastName
    },</p>
              
              <p>Thank you for choosing ${businessName}! Your reservation has been confirmed.</p>
              
              <div class="detail-row">
                <span class="label">Confirmation Number:</span>
                <span class="value">${
                  reservation.orderNumber || reservation.id
                }</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Pet(s):</span>
                <span class="value">${petNames}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Service:</span>
                <span class="value">${serviceName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${startDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${startTime}</span>
              </div>
              
              ${
                reservation.status === "CONFIRMED"
                  ? `
                <p style="margin-top: 30px;">
                  <strong>What to bring:</strong><br>
                  • Current vaccination records<br>
                  • Any medications your pet may need<br>
                  • Your pet's favorite toys or bedding (optional)<br>
                  • Food if your pet has special dietary requirements
                </p>
              `
                  : ""
              }
              
              <p style="margin-top: 30px;">
                If you need to make any changes to your reservation, please contact us as soon as possible.
              </p>
              
              <p>We look forward to seeing ${petNames}!</p>
              
              <p>Best regards,<br>
              The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${businessName}. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: reservation.customer.email,
      subject: `Reservation Confirmed - ${businessName}`,
      html,
    });
  }

  /**
   * Send reservation reminder email
   */
  async sendReservationReminder(data: ReservationEmailData): Promise<void> {
    const {
      reservation,
      businessName = "Tailtown Pet Resort",
      businessPhone,
    } = data;

    if (!reservation.customer?.email) {
      console.warn(
        "[Email Service] No customer email provided for reservation reminder"
      );
      return;
    }

    const petNames =
      reservation.pets?.map((p) => p.name).join(", ") || "your pet(s)";
    const serviceName = reservation.service?.name || "service";
    const startDate = new Date(reservation.startDate).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
    const startTime = new Date(reservation.startDate).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
            .reminder-box { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Reservation Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${reservation.customer.firstName} ${
      reservation.customer.lastName
    },</p>
              
              <div class="reminder-box">
                <strong>This is a friendly reminder about your upcoming reservation!</strong>
              </div>
              
              <div class="detail-row">
                <span class="label">Confirmation Number:</span>
                <span class="value">${
                  reservation.orderNumber || reservation.id
                }</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Pet(s):</span>
                <span class="value">${petNames}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Service:</span>
                <span class="value">${serviceName}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${startDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${startTime}</span>
              </div>
              
              <p style="margin-top: 30px;">
                <strong>Please remember to bring:</strong><br>
                • Current vaccination records<br>
                • Any medications your pet may need<br>
                • Your pet's favorite toys or bedding (optional)<br>
                • Food if your pet has special dietary requirements
              </p>
              
              ${
                businessPhone
                  ? `
                <p>If you need to make any changes or have questions, please call us at ${businessPhone}.</p>
              `
                  : `
                <p>If you need to make any changes or have questions, please contact us.</p>
              `
              }
              
              <p>We look forward to seeing ${petNames}!</p>
              
              <p>Best regards,<br>
              The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder from ${businessName}. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: reservation.customer.email,
      subject: `Reminder: Upcoming Reservation - ${businessName}`,
      html,
    });
  }

  /**
   * Send reservation status change email
   */
  async sendReservationStatusChange(
    data: ReservationEmailData,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const { reservation, businessName = "Tailtown Pet Resort" } = data;

    if (!reservation.customer?.email) {
      console.warn(
        "[Email Service] No customer email provided for status change notification"
      );
      return;
    }

    const petNames =
      reservation.pets?.map((p) => p.name).join(", ") || "your pet(s)";
    const serviceName = reservation.service?.name || "service";

    const statusMessages: Record<
      string,
      { title: string; message: string; color: string }
    > = {
      CONFIRMED: {
        title: "Reservation Confirmed",
        message: "Your reservation has been confirmed!",
        color: "#4caf50",
      },
      CHECKED_IN: {
        title: "Check-In Complete",
        message: `${petNames} has been checked in and is settling in nicely!`,
        color: "#2196f3",
      },
      CHECKED_OUT: {
        title: "Check-Out Complete",
        message: `${petNames} has been checked out. We hope to see you again soon!`,
        color: "#4c8bf5",
      },
      CANCELLED: {
        title: "Reservation Cancelled",
        message: "Your reservation has been cancelled.",
        color: "#f44336",
      },
      COMPLETED: {
        title: "Service Completed",
        message: "Your service has been completed. Thank you for choosing us!",
        color: "#4caf50",
      },
    };

    const statusInfo = statusMessages[newStatus] || {
      title: "Reservation Status Updated",
      message: `Your reservation status has been updated to ${newStatus}.`,
      color: "#757575",
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${
              statusInfo.color
            }; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusInfo.title}</h1>
            </div>
            <div class="content">
              <p>Dear ${reservation.customer.firstName} ${
      reservation.customer.lastName
    },</p>
              
              <p>${statusInfo.message}</p>
              
              <div class="detail-row">
                <span class="label">Confirmation Number:</span>
                <span class="value">${
                  reservation.orderNumber || reservation.id
                }</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Pet(s):</span>
                <span class="value">${petNames}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Service:</span>
                <span class="value">${serviceName}</span>
              </div>
              
              <p style="margin-top: 30px;">
                If you have any questions, please don't hesitate to contact us.
              </p>
              
              <p>Best regards,<br>
              The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${businessName}. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: reservation.customer.email,
      subject: `${statusInfo.title} - ${businessName}`,
      html,
    });
  }

  /**
   * Send welcome email to new customer
   */
  async sendWelcomeEmail(
    customer: Customer,
    businessName: string = "Tailtown Pet Resort"
  ): Promise<void> {
    if (!customer.email) {
      console.warn(
        "[Email Service] No customer email provided for welcome email"
      );
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4c8bf5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${businessName}! 🐾</h1>
            </div>
            <div class="content">
              <p>Dear ${customer.firstName} ${customer.lastName},</p>
              
              <p>Thank you for choosing ${businessName} for your pet care needs!</p>
              
              <p>We're excited to have you as part of our family. Our team is dedicated to providing the best care for your furry friends.</p>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Make sure your pet's vaccination records are up to date</li>
                <li>Book your first reservation</li>
                <li>Let us know if you have any special requirements or questions</li>
              </ul>
              
              <p>We look forward to meeting you and your pets!</p>
              
              <p>Best regards,<br>
              The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${businessName}. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: customer.email,
      subject: `Welcome to ${businessName}!`,
      html,
    });
  }

  /**
   * Send password reset email to customer
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string,
    businessName: string = "Tailtown Pet Resort",
    portalUrl?: string
  ): Promise<void> {
    // Build reset URL - use provided URL or construct from environment
    const baseUrl =
      portalUrl || process.env.FRONTEND_URL || "https://tailtown.canicloud.com";
    const resetUrl = `${baseUrl}/book/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4c8bf5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
            .button { display: inline-block; padding: 14px 28px; background-color: #4c8bf5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .button:hover { background-color: #3a7bd5; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              
              <p>We received a request to reset your password for your ${businessName} booking account.</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Your Password</a>
              </p>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px; font-size: 12px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⏰ This link will expire in 24 hours.</strong><br>
                If you didn't request a password reset, you can safely ignore this email.
              </div>
              
              <p>If you have any questions, please contact us.</p>
              
              <p>Best regards,<br>
              The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${businessName}. Please do not reply to this email.</p>
              <p>If you didn't request this password reset, no action is needed.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `Password Reset - ${businessName}`,
      html,
    });
  }

  /**
   * Strip HTML tags from string (simple implementation)
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const emailService = new EmailService();
