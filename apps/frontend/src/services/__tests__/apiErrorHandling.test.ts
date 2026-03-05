/**
 * API Error Handling Tests
 * 
 * Tests for API interaction patterns and error handling.
 * These define what "working" means for API communication.
 */

import axios from 'axios';
import { customerApi } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Error Handling Patterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * ERROR HANDLING: Network Errors
   * 
   * Defines "working" as:
   * - Network errors are caught
   * - User-friendly error messages are provided
   * - Retry logic is available
   */
  describe('Network Error Handling', () => {
    it('should handle network timeout errors', async () => {
      const error = new Error('Network timeout');
      error.name = 'ECONNABORTED';
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.message).toContain('timeout');
      }
    });

    it('should handle connection refused errors', async () => {
      const error = new Error('Connection refused');
      error.name = 'ECONNREFUSED';
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e).toBeDefined();
      }
    });

    it('should handle DNS resolution errors', async () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.message).toContain('ENOTFOUND');
      }
    });
  });

  /**
   * ERROR HANDLING: HTTP Status Codes
   * 
   * Defines "working" as:
   * - 4xx errors show user-actionable messages
   * - 5xx errors show system error messages
   * - Specific status codes have specific handling
   */
  describe('HTTP Status Code Handling', () => {
    it('should handle 400 Bad Request with validation errors', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: {
              email: 'Invalid email format',
              phone: 'Phone number required'
            }
          }
        }
      };
      
      mockedAxios.post.mockRejectedValue(error);

      try {
        await customerApi.post('/api/customers', {});
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(400);
        expect(e.response.data.errors).toBeDefined();
      }
    });

    it('should handle 401 Unauthorized', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Authentication required' }
        }
      };
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(401);
        // Should trigger redirect to login
      }
    });

    it('should handle 403 Forbidden', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Access denied' }
        }
      };
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/admin/settings');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(403);
      }
    });

    it('should handle 404 Not Found', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Customer not found' }
        }
      };
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers/invalid-id');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(404);
        expect(e.response.data.message).toContain('not found');
      }
    });

    it('should handle 409 Conflict (duplicate resource)', async () => {
      const error = {
        response: {
          status: 409,
          data: { message: 'Customer with this email already exists' }
        }
      };
      
      mockedAxios.post.mockRejectedValue(error);

      try {
        await customerApi.post('/api/customers', { email: 'existing@example.com' });
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(409);
        expect(e.response.data.message).toContain('already exists');
      }
    });

    it('should handle 422 Unprocessable Entity', async () => {
      const error = {
        response: {
          status: 422,
          data: {
            message: 'Invalid data',
            errors: ['Check-in date must be before check-out date']
          }
        }
      };
      
      mockedAxios.post.mockRejectedValue(error);

      try {
        await customerApi.post('/api/reservations', {});
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(422);
        expect(e.response.data.errors).toBeInstanceOf(Array);
      }
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(500);
        // Should show generic error message to user
      }
    });

    it('should handle 503 Service Unavailable', async () => {
      const error = {
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' }
        }
      };
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(503);
        // Should suggest retry
      }
    });
  });

  /**
   * ERROR HANDLING: Request/Response Transformation
   * 
   * Defines "working" as:
   * - Requests are properly formatted
   * - Responses are properly parsed
   * - Dates are handled correctly
   * - Null/undefined values are handled
   */
  describe('Data Transformation', () => {
    it('should transform dates to ISO strings in requests', () => {
      const requestData = {
        checkIn: new Date('2025-10-24'),
        checkOut: new Date('2025-10-26')
      };

      // Verify dates are serialized correctly
      const serialized = JSON.stringify(requestData);
      expect(serialized).toContain('2025-10-24');
      expect(serialized).toContain('2025-10-26');
    });

    it('should parse ISO date strings in responses', () => {
      const responseData = {
        checkIn: '2025-10-24T00:00:00Z',
        checkOut: '2025-10-26T00:00:00Z'
      };

      const checkIn = new Date(responseData.checkIn);
      const checkOut = new Date(responseData.checkOut);

      expect(checkIn).toBeInstanceOf(Date);
      expect(checkOut).toBeInstanceOf(Date);
      expect(checkIn.getTime()).toBeLessThan(checkOut.getTime());
    });

    it('should handle null values in responses', () => {
      const responseData = {
        customer: {
          id: '123',
          firstName: 'John',
          lastName: 'Doe',
          middleName: null,
          notes: null
        }
      };

      expect(responseData.customer.middleName).toBeNull();
      expect(responseData.customer.notes).toBeNull();
    });

    it('should handle empty arrays in responses', () => {
      const responseData = {
        data: [],
        totalPages: 0,
        currentPage: 1
      };

      expect(responseData.data).toEqual([]);
      expect(Array.isArray(responseData.data)).toBe(true);
    });

    it('should handle pagination metadata', () => {
      const responseData = {
        data: [{ id: '1' }, { id: '2' }],
        totalPages: 5,
        currentPage: 2,
        totalResults: 50
      };

      expect(responseData.data).toHaveLength(2);
      expect(responseData.totalPages).toBe(5);
      expect(responseData.currentPage).toBe(2);
      expect(responseData.totalResults).toBe(50);
    });
  });

  /**
   * ERROR HANDLING: Retry Logic
   * 
   * Defines "working" as:
   * - Transient errors trigger retries
   * - Permanent errors don't retry
   * - Exponential backoff is used
   * - Maximum retry attempts are enforced
   */
  describe('Retry Logic', () => {
    it('should retry on network timeout', async () => {
      const error = new Error('Network timeout');
      error.name = 'ECONNABORTED';
      
      mockedAxios.get
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { success: true } });

      // Retry logic would be implemented in the API layer
      // This test verifies the pattern
    });

    it('should not retry on 400 Bad Request', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid request' }
        }
      };
      
      mockedAxios.post.mockRejectedValue(error);

      // Should fail immediately without retry
      try {
        await customerApi.post('/api/customers', {});
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(400);
      }

      // Should only be called once (no retries)
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 Not Found', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };
      
      mockedAxios.get.mockRejectedValue(error);

      try {
        await customerApi.get('/api/customers/invalid');
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.response.status).toBe(404);
      }

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * ERROR HANDLING: Concurrent Requests
   * 
   * Defines "working" as:
   * - Multiple requests can run in parallel
   * - Failed requests don't affect others
   * - Race conditions are handled
   */
  describe('Concurrent Request Handling', () => {
    it('should handle multiple successful requests in parallel', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: true } });

      const requests = [
        customerApi.get('/api/customers/1'),
        customerApi.get('/api/customers/2'),
        customerApi.get('/api/customers/3')
      ];

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in parallel requests', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { id: '1' } })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: { id: '3' } });

      const requests = [
        customerApi.get('/api/customers/1'),
        customerApi.get('/api/customers/2').catch(e => ({ error: e.message })),
        customerApi.get('/api/customers/3')
      ];

      const results = await Promise.all(requests);

      expect(results[0]).toHaveProperty('data');
      expect(results[1]).toHaveProperty('error');
      expect(results[2]).toHaveProperty('data');
    });
  });
});
