import api from './api';
import { ENDPOINTS } from '../config/constants';
import { Payment } from './invoiceService';
import axios from 'axios';

// Payment service base URL (port 4005)
const PAYMENT_SERVICE_URL = process.env.REACT_APP_PAYMENT_SERVICE_URL || 'http://localhost:4005';

// Additional types
export interface StoreCredit {
  customerId: string;
  amount: number;
  reason?: string;
}

export interface CreditApplication {
  invoiceId: string;
  customerId: string;
  amount: number;
}

// CardConnect payment types
export interface CardPaymentRequest {
  amount: number;
  cardNumber: string;
  expiry: string; // MMYY format
  cvv: string;
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  orderId?: string;
  capture?: boolean;
}

export interface PaymentResponse {
  status: 'success' | 'declined' | 'error';
  message: string;
  data?: {
    transactionId?: string;
    authCode?: string;
    amount?: number;
    approved: boolean;
    responseCode?: string;
    responseText?: string;
    avsResponse?: string;
    cvvResponse?: string;
    token?: string;
    maskedCard?: string;
  };
  error?: string;
}

// Service methods
export const paymentService = {
  // Get all payments for a customer
  getCustomerPayments: async (customerId: string): Promise<Payment[]> => {
    try {
      const response = await api.get(`${ENDPOINTS.PAYMENTS}/customer/${customerId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching customer payments:', error);
      throw error;
    }
  },

  // Get payment by ID
  getPaymentById: async (id: string): Promise<Payment> => {
    try {
      const response = await api.get(`${ENDPOINTS.PAYMENTS}/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  },

  // Create a new payment
  createPayment: async (paymentData: Omit<Payment, 'id' | 'paymentDate'>): Promise<Payment> => {
    try {
      const response = await api.post(ENDPOINTS.PAYMENTS, paymentData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  // Record store credit
  recordStoreCredit: async (storeCreditData: StoreCredit): Promise<Payment> => {
    try {
      const response = await api.post(`${ENDPOINTS.PAYMENTS}/store-credit`, storeCreditData);
      return response.data.data;
    } catch (error) {
      console.error('Error recording store credit:', error);
      throw error;
    }
  },

  // Apply store credit to an invoice
  applyStoreCredit: async (creditApplicationData: CreditApplication): Promise<any> => {
    try {
      const response = await api.post(`${ENDPOINTS.PAYMENTS}/apply-credit`, creditApplicationData);
      return response.data.data;
    } catch (error) {
      console.error('Error applying store credit:', error);
      throw error;
    }
  },

  // CardConnect payment processing
  processCardPayment: async (paymentData: CardPaymentRequest): Promise<PaymentResponse> => {
    try {
      const response = await axios.post(`${PAYMENT_SERVICE_URL}/api/payments/authorize`, paymentData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error processing card payment:', error);
      
      // Return a properly formatted error response
      if (error.response?.data) {
        // If backend returned structured error, use it
        return {
          status: 'error',
          message: error.response.data.message || error.response.data.error || 'Payment failed',
          error: error.response.data.error || error.message,
          data: error.response.data.data || { approved: false }
        };
      }
      
      // Generic error response
      return {
        status: 'error',
        message: error.message || 'Payment processing failed',
        error: error.message,
        data: { approved: false }
      };
    }
  },

  // Get test card numbers (development only)
  getTestCards: async (): Promise<any> => {
    try {
      const response = await axios.get(`${PAYMENT_SERVICE_URL}/api/payments/test-cards`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching test cards:', error);
      throw error;
    }
  },
};
