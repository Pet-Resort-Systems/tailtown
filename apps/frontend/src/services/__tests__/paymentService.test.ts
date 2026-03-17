/**
 * Payment Service Tests
 * Tests for CardConnect payment integration
 */

import axios from 'axios';

import { paymentService, CardPaymentRequest } from '../paymentService';

// Mock axios first
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the api module to prevent interceptor errors
jest.mock('../api', () => ({
  customerApi: {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

const validPaymentRequest: CardPaymentRequest = {
  amount: 100.0,
  cardNumber: '4788250000028291',
  expiry: '1225',
  cvv: '123',
  name: 'John Doe',
  email: 'john@example.com',
  capture: true,
};

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processCardPayment', () => {
    it('should successfully process a payment', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          message: 'Payment authorized successfully',
          data: {
            transactionId: 'TXN123456',
            authCode: 'AUTH789',
            amount: 100.0,
            approved: true,
            responseCode: '00',
            responseText: 'Approved',
            maskedCard: '****8291',
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result =
        await paymentService.processCardPayment(validPaymentRequest);

      expect(result.status).toBe('success');
      expect(result.data?.approved).toBe(true);
      expect(result.data?.transactionId).toBe('TXN123456');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/payments/authorize'),
        validPaymentRequest,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle declined payments', async () => {
      const mockResponse = {
        data: {
          status: 'declined',
          message: 'Payment declined',
          data: {
            approved: false,
            responseCode: '05',
            responseText: 'Do not honor',
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result =
        await paymentService.processCardPayment(validPaymentRequest);

      expect(result.status).toBe('declined');
      expect(result.data?.approved).toBe(false);
      expect(result.data?.responseText).toBe('Do not honor');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(networkError);

      await expect(
        paymentService.processCardPayment(validPaymentRequest)
      ).rejects.toThrow('Network error');
    });

    it('should handle API errors with response data', async () => {
      const apiError = {
        response: {
          data: {
            status: 'error',
            message: 'Invalid card number',
            data: {
              approved: false,
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(apiError);

      const result =
        await paymentService.processCardPayment(validPaymentRequest);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid card number');
    });

    it('should send correct payment data structure', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: { approved: true, transactionId: 'TXN123' },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await paymentService.processCardPayment(validPaymentRequest);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount: 100.0,
          cardNumber: '4788250000028291',
          expiry: '1225',
          cvv: '123',
          name: 'John Doe',
          email: 'john@example.com',
          capture: true,
        }),
        expect.any(Object)
      );
    });

    it('should include optional billing information', async () => {
      const paymentWithBilling: CardPaymentRequest = {
        ...validPaymentRequest,
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
      };

      const mockResponse = {
        data: {
          status: 'success',
          data: { approved: true, transactionId: 'TXN123' },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await paymentService.processCardPayment(paymentWithBilling);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          address: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zip: '12345',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getTestCards', () => {
    it('should return test card data', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: {
            visa: {
              approved: '4788250000028291',
              declined: '4387751111111053',
              expiry: '1225',
              cvv: '123',
            },
            mastercard: {
              approved: '5454545454545454',
              declined: '5112345112345114',
              expiry: '1225',
              cvv: '123',
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await paymentService.getTestCards();

      expect(result.visa).toBeDefined();
      expect(result.visa.approved).toBe('4788250000028291');
      expect(result.mastercard).toBeDefined();
    });

    it('should handle errors when fetching test cards', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(paymentService.getTestCards()).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('Payment Validation', () => {
    it('should process payment with minimum required fields', async () => {
      const minimalRequest: CardPaymentRequest = {
        amount: 50.0,
        cardNumber: '4788250000028291',
        expiry: '1225',
        cvv: '123',
      };

      const mockResponse = {
        data: {
          status: 'success',
          data: { approved: true, transactionId: 'TXN456' },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await paymentService.processCardPayment(minimalRequest);

      expect(result.status).toBe('success');
      expect(result.data?.approved).toBe(true);
    });

    it('should handle different amount formats', async () => {
      const requests = [
        { ...validPaymentRequest, amount: 10.5 },
        { ...validPaymentRequest, amount: 100 },
        { ...validPaymentRequest, amount: 0.99 },
      ];

      const mockResponse = {
        data: {
          status: 'success',
          data: { approved: true, transactionId: 'TXN789' },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      for (const request of requests) {
        const result = await paymentService.processCardPayment(request);
        expect(result.status).toBe('success');
      }
    });
  });

  describe('Security', () => {
    it('should not log sensitive card data', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const mockResponse = {
        data: {
          status: 'success',
          data: { approved: true, transactionId: 'TXN999' },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await paymentService.processCardPayment(validPaymentRequest);

      // Ensure full card number is not logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('4788250000028291')
      );

      consoleSpy.mockRestore();
    });

    it('should return masked card number in response', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: {
            approved: true,
            transactionId: 'TXN111',
            maskedCard: '****8291',
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result =
        await paymentService.processCardPayment(validPaymentRequest);

      expect(result.data?.maskedCard).toBe('****8291');
      expect(result.data?.maskedCard).not.toContain('4788250000028291');
    });
  });
});
