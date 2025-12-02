import twilio from "twilio";

// Twilio configuration from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client (only if credentials are provided)
// Supports both Auth Token and API Key authentication
let twilioClient: twilio.Twilio | null = null;

if (TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET && TWILIO_ACCOUNT_SID) {
  // Use API Key authentication (recommended, revocable)
  twilioClient = twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
    accountSid: TWILIO_ACCOUNT_SID,
  });
} else if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  // Fallback to Auth Token authentication
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * SMS Service
 *
 * Handles sending SMS messages via Twilio
 * Supports appointment reminders, confirmations, and marketing messages
 *
 * Features:
 * - Twilio integration for reliable SMS delivery
 * - Template-based messages for consistency
 * - Graceful fallback when Twilio not configured
 * - Tenant-aware messaging
 * - Phone number validation
 */

export interface SMSOptions {
  to: string;
  message: string;
  tenantName?: string;
}

export interface ReservationReminderData {
  customerName: string;
  customerPhone: string;
  petName: string;
  serviceName: string;
  startDate: Date;
  tenantName: string;
  tenantPhone?: string;
}

export interface ReservationConfirmationData {
  customerName: string;
  customerPhone: string;
  petName: string;
  serviceName: string;
  startDate: Date;
  endDate: Date;
  orderNumber?: string;
  tenantName: string;
  tenantPhone?: string;
}

export interface WelcomeMessageData {
  customerName: string;
  customerPhone: string;
  tenantName: string;
  tenantPhone?: string;
}

export interface MarketingMessageData {
  customerName: string;
  customerPhone: string;
  message: string;
  tenantName: string;
}

class SMSService {
  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
  }

  /**
   * Validate phone number format
   * Accepts formats: +1234567890, 1234567890, (123) 456-7890, 123-456-7890
   */
  private validatePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Check if it's a valid length (10 or 11 digits for US/Canada)
    if (digits.length === 10) {
      return `+1${digits}`; // Add US country code
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    } else if (digits.length > 11 && phone.startsWith("+")) {
      return phone; // Already has country code
    }

    throw new Error(`Invalid phone number format: ${phone}`);
  }

  /**
   * Send a raw SMS message
   */
  async sendSMS(
    options: SMSOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate phone number
      const toNumber = this.validatePhoneNumber(options.to);

      // If Twilio is not configured, log the message and return success
      if (!this.isConfigured()) {
        console.log("📱 SMS (Twilio not configured):");
        console.log(`To: ${toNumber}`);
        console.log(`Message: ${options.message}`);
        console.log("---");

        return {
          success: true,
          messageId: "mock-" + Date.now(),
        };
      }

      // Send SMS via Twilio
      const message = await twilioClient!.messages.create({
        body: options.message,
        from: TWILIO_PHONE_NUMBER,
        to: toNumber,
      });

      console.log(`✅ SMS sent successfully: ${message.sid}`);

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      console.error("❌ Error sending SMS:", error);

      return {
        success: false,
        error: error.message || "Failed to send SMS",
      };
    }
  }

  /**
   * Send appointment reminder SMS
   */
  async sendAppointmentReminder(
    data: ReservationReminderData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const appointmentDate = data.startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const appointmentTime = data.startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const message = `Hi ${data.customerName}! This is a reminder that ${
      data.petName
    } has a ${data.serviceName} appointment at ${
      data.tenantName
    } on ${appointmentDate} at ${appointmentTime}.${
      data.tenantPhone ? ` Questions? Call us at ${data.tenantPhone}` : ""
    }`;

    return this.sendSMS({
      to: data.customerPhone,
      message,
      tenantName: data.tenantName,
    });
  }

  /**
   * Send reservation confirmation SMS
   */
  async sendReservationConfirmation(
    data: ReservationConfirmationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startDate = data.startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const endDate = data.endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const orderInfo = data.orderNumber ? ` (Order #${data.orderNumber})` : "";

    const message = `${data.tenantName}: Your ${
      data.serviceName
    } reservation for ${
      data.petName
    } is confirmed${orderInfo}! Check-in: ${startDate}, Check-out: ${endDate}.${
      data.tenantPhone ? ` Questions? ${data.tenantPhone}` : ""
    }`;

    return this.sendSMS({
      to: data.customerPhone,
      message,
      tenantName: data.tenantName,
    });
  }

  /**
   * Send welcome message to new customer
   */
  async sendWelcomeMessage(
    data: WelcomeMessageData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Welcome to ${data.tenantName}, ${
      data.customerName
    }! We're excited to care for your furry family member. ${
      data.tenantPhone ? `Call us anytime at ${data.tenantPhone}.` : ""
    } Reply STOP to opt out.`;

    return this.sendSMS({
      to: data.customerPhone,
      message,
      tenantName: data.tenantName,
    });
  }

  /**
   * Send marketing/promotional message
   */
  async sendMarketingMessage(
    data: MarketingMessageData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `${data.tenantName}: ${data.message} Reply STOP to opt out.`;

    return this.sendSMS({
      to: data.customerPhone,
      message,
      tenantName: data.tenantName,
    });
  }

  /**
   * Send check-in notification
   */
  async sendCheckInNotification(data: {
    customerName: string;
    customerPhone: string;
    petName: string;
    tenantName: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `${data.tenantName}: ${data.petName} has been checked in! We'll take great care of them. Have a wonderful day, ${data.customerName}!`;

    return this.sendSMS({
      to: data.customerPhone,
      message,
      tenantName: data.tenantName,
    });
  }

  /**
   * Send check-out notification
   */
  async sendCheckOutNotification(data: {
    customerName: string;
    customerPhone: string;
    petName: string;
    tenantName: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `${data.tenantName}: ${data.petName} is ready for pickup! We hope they had a great time. See you soon, ${data.customerName}!`;

    return this.sendSMS({
      to: data.customerPhone,
      message,
      tenantName: data.tenantName,
    });
  }
}

export const smsService = new SMSService();
