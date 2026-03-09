/**
 * CardConnect Payment Service
 * Handles payment processing through CardConnect API
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface AuthorizationRequest {
  amount: string;
  currency?: string;
  account: string;
  expiry: string;
  cvv2?: string;
  name?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
  email?: string;
  orderid?: string;
  capture?: 'Y' | 'N';
}

export interface AuthorizationResponse {
  respstat: 'A' | 'B' | 'C'; // A=Approved, B=Retry, C=Declined
  retref: string; // Retrieval reference number
  respcode: string;
  resptext: string;
  amount: string;
  authcode?: string;
  avsresp?: string;
  cvvresp?: string;
  token?: string;
  commcard?: string;
  account?: string;
}

export interface CaptureRequest {
  retref: string;
  amount?: string;
  merchid?: string;
}

export interface RefundRequest {
  retref: string;
  amount?: string;
  merchid?: string;
}

export interface VoidRequest {
  retref: string;
  amount?: string;
  merchid?: string;
}

export interface InquireRequest {
  retref: string;
  merchid?: string;
}

export class CardConnectService {
  private client: AxiosInstance;
  private merchantId: string;
  private site: string;

  constructor() {
    const apiUrl = process.env.CARDCONNECT_API_URL || 'https://fts-uat.cardconnect.com/cardconnect/rest';
    const username = process.env.CARDCONNECT_USERNAME || 'testing';
    const password = process.env.CARDCONNECT_PASSWORD || 'testing123';
    
    this.merchantId = process.env.CARDCONNECT_MERCHANT_ID || '496160873888';
    this.site = process.env.CARDCONNECT_SITE || 'fts-uat';

    // Create axios instance with basic auth
    this.client = axios.create({
      baseURL: apiUrl,
      auth: {
        username,
        password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('CardConnect API Request', {
          method: config.method,
          url: config.url,
          data: this.sanitizeLogData(config.data),
        });
        return config;
      },
      (error) => {
        logger.error('CardConnect API Request Error', { error });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info('CardConnect API Response', {
          status: response.status,
          data: this.sanitizeLogData(response.data),
        });
        return response;
      },
      (error) => {
        logger.error('CardConnect API Response Error', {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );

    logger.info('CardConnect Service initialized', {
      apiUrl,
      merchantId: this.merchantId,
      site: this.site,
    });
  }

  /**
   * Authorize a payment
   * @param request Authorization request
   * @returns Authorization response
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    try {
      const payload = {
        ...request,
        merchid: this.merchantId,
        currency: request.currency || 'USD',
        capture: request.capture || 'Y', // Default to capture immediately
      };

      const response = await this.client.put('/auth', payload);
      
      logger.info('Authorization result', {
        respstat: response.data.respstat,
        retref: response.data.retref,
        resptext: response.data.resptext,
      });

      return response.data;
    } catch (error) {
      logger.error('Authorization failed', { error });
      throw new Error('Payment authorization failed');
    }
  }

  /**
   * Capture a previously authorized payment
   * @param request Capture request
   * @returns Capture response
   */
  async capture(request: CaptureRequest): Promise<AuthorizationResponse> {
    try {
      const payload = {
        ...request,
        merchid: request.merchid || this.merchantId,
      };

      const response = await this.client.put('/capture', payload);
      
      logger.info('Capture result', {
        respstat: response.data.respstat,
        retref: response.data.retref,
      });

      return response.data;
    } catch (error) {
      logger.error('Capture failed', { error });
      throw new Error('Payment capture failed');
    }
  }

  /**
   * Refund a payment
   * @param request Refund request
   * @returns Refund response
   */
  async refund(request: RefundRequest): Promise<AuthorizationResponse> {
    try {
      const payload = {
        ...request,
        merchid: request.merchid || this.merchantId,
      };

      const response = await this.client.put('/refund', payload);
      
      logger.info('Refund result', {
        respstat: response.data.respstat,
        retref: response.data.retref,
      });

      return response.data;
    } catch (error) {
      logger.error('Refund failed', { error });
      throw new Error('Payment refund failed');
    }
  }

  /**
   * Void a payment
   * @param request Void request
   * @returns Void response
   */
  async void(request: VoidRequest): Promise<AuthorizationResponse> {
    try {
      const payload = {
        ...request,
        merchid: request.merchid || this.merchantId,
      };

      const response = await this.client.put('/void', payload);
      
      logger.info('Void result', {
        respstat: response.data.respstat,
        retref: response.data.retref,
      });

      return response.data;
    } catch (error) {
      logger.error('Void failed', { error });
      throw new Error('Payment void failed');
    }
  }

  /**
   * Inquire about a transaction
   * @param request Inquire request
   * @returns Transaction details
   */
  async inquire(request: InquireRequest): Promise<any> {
    try {
      const merchid = request.merchid || this.merchantId;
      const response = await this.client.get(`/inquire/${request.retref}/${merchid}`);
      
      logger.info('Inquire result', {
        retref: request.retref,
        found: !!response.data,
      });

      return response.data;
    } catch (error) {
      logger.error('Inquire failed', { error });
      throw new Error('Transaction inquiry failed');
    }
  }

  /**
   * Test card numbers for CardConnect UAT environment
   */
  static getTestCards() {
    return {
      visa: {
        approved: '4788250000028291',
        declined: '4387751111111053',
        expiry: '1225', // MMYY format
        cvv: '123',
      },
      mastercard: {
        approved: '5454545454545454',
        declined: '5112345112345114',
        expiry: '1225',
        cvv: '123',
      },
      amex: {
        approved: '371449635398431',
        declined: '371449635392431',
        expiry: '1225',
        cvv: '1234', // 4 digits for Amex
      },
      discover: {
        approved: '6011000991001201',
        declined: '6011000991001111',
        expiry: '1225',
        cvv: '123',
      },
    };
  }

  /**
   * Sanitize sensitive data for logging
   */
  private sanitizeLogData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };

    // Mask sensitive fields
    if (sanitized.account) {
      sanitized.account = this.maskCardNumber(sanitized.account);
    }
    if (sanitized.cvv2) {
      sanitized.cvv2 = '***';
    }
    if (sanitized.password) {
      sanitized.password = '***';
    }

    return sanitized;
  }

  /**
   * Mask card number for logging
   */
  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return '****';
    return `****${cardNumber.slice(-4)}`;
  }
}

// Export singleton instance
export const cardConnectService = new CardConnectService();
