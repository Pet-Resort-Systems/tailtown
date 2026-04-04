/**
 * Notification Client
 *
 * Calls the Customer Service notification endpoints to send
 * emails and SMS messages for reservation events.
 */

import axios, { type AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';

const CUSTOMER_SERVICE_URL =
  env.CUSTOMER_SERVICE_URL || 'http://localhost:4004';
const SERVICE_TIMEOUT = env.RESERVATION_SERVICE_TIMEOUT;

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ReservationNotificationData {
  reservationId: string;
  tenantId: string;
}

class NotificationClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: CUSTOMER_SERVICE_URL,
      timeout: SERVICE_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send reservation confirmation (email + SMS)
   */
  async sendReservationConfirmation(
    data: ReservationNotificationData
  ): Promise<{ sms: NotificationResult; email: NotificationResult }> {
    const results = {
      sms: { success: false } as NotificationResult,
      email: { success: false } as NotificationResult,
    };

    // Send SMS confirmation
    try {
      const smsResponse = await this.client.post(
        `/api/sms/reservation-confirmation/${data.reservationId}`,
        {},
        { headers: { 'x-tenant-id': data.tenantId } }
      );
      results.sms = smsResponse.data?.data || { success: true };
      logger.info(
        `SMS confirmation sent for reservation ${data.reservationId}`
      );
    } catch (error: any) {
      logger.warn(`Failed to send SMS confirmation: ${error.message}`);
      results.sms = { success: false, error: error.message };
    }

    // Send email confirmation
    try {
      const emailResponse = await this.client.post(
        `/api/notifications/reservation-confirmation/${data.reservationId}`,
        {},
        { headers: { 'x-tenant-id': data.tenantId } }
      );
      results.email = emailResponse.data?.data || { success: true };
      logger.info(
        `Email confirmation sent for reservation ${data.reservationId}`
      );
    } catch (error: any) {
      logger.warn(`Failed to send email confirmation: ${error.message}`);
      results.email = { success: false, error: error.message };
    }

    return results;
  }

  /**
   * Send check-in notification (email + SMS)
   */
  async sendCheckInNotification(
    data: ReservationNotificationData
  ): Promise<{ sms: NotificationResult; email: NotificationResult }> {
    const results = {
      sms: { success: false } as NotificationResult,
      email: { success: false } as NotificationResult,
    };

    try {
      const smsResponse = await this.client.post(
        `/api/sms/check-in/${data.reservationId}`,
        {},
        { headers: { 'x-tenant-id': data.tenantId } }
      );
      results.sms = smsResponse.data?.data || { success: true };
      logger.info(`Check-in SMS sent for reservation ${data.reservationId}`);
    } catch (error: any) {
      logger.warn(`Failed to send check-in SMS: ${error.message}`);
      results.sms = { success: false, error: error.message };
    }

    try {
      const emailResponse = await this.client.post(
        `/api/notifications/check-in/${data.reservationId}`,
        {},
        { headers: { 'x-tenant-id': data.tenantId } }
      );
      results.email = emailResponse.data?.data || { success: true };
      logger.info(`Check-in email sent for reservation ${data.reservationId}`);
    } catch (error: any) {
      logger.warn(`Failed to send check-in email: ${error.message}`);
      results.email = { success: false, error: error.message };
    }

    return results;
  }

  /**
   * Send check-out notification (email + SMS)
   */
  async sendCheckOutNotification(
    data: ReservationNotificationData
  ): Promise<{ sms: NotificationResult; email: NotificationResult }> {
    const results = {
      sms: { success: false } as NotificationResult,
      email: { success: false } as NotificationResult,
    };

    try {
      const smsResponse = await this.client.post(
        `/api/sms/check-out/${data.reservationId}`,
        {},
        { headers: { 'x-tenant-id': data.tenantId } }
      );
      results.sms = smsResponse.data?.data || { success: true };
      logger.info(`Check-out SMS sent for reservation ${data.reservationId}`);
    } catch (error: any) {
      logger.warn(`Failed to send check-out SMS: ${error.message}`);
      results.sms = { success: false, error: error.message };
    }

    try {
      const emailResponse = await this.client.post(
        `/api/notifications/check-out/${data.reservationId}`,
        {},
        { headers: { 'x-tenant-id': data.tenantId } }
      );
      results.email = emailResponse.data?.data || { success: true };
      logger.info(`Check-out email sent for reservation ${data.reservationId}`);
    } catch (error: any) {
      logger.warn(`Failed to send check-out email: ${error.message}`);
      results.email = { success: false, error: error.message };
    }

    return results;
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(
    data: ReservationNotificationData & { oldStatus: string; newStatus: string }
  ): Promise<{ email: NotificationResult }> {
    const results = { email: { success: false } as NotificationResult };

    try {
      const emailResponse = await this.client.post(
        `/api/notifications/status-change/${data.reservationId}`,
        { oldStatus: data.oldStatus, newStatus: data.newStatus },
        { headers: { 'x-tenant-id': data.tenantId } }
      );
      results.email = emailResponse.data?.data || { success: true };
      logger.info(
        `Status change email sent for reservation ${data.reservationId}`
      );
    } catch (error: any) {
      logger.warn(`Failed to send status change email: ${error.message}`);
      results.email = { success: false, error: error.message };
    }

    return results;
  }
}

export const notificationClient = new NotificationClient();
