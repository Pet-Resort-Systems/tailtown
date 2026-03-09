/**
 * Customer Service API Client
 * 
 * Provides methods to communicate with the Customer Service API
 * instead of directly accessing customer/pet database tables.
 * 
 * This implements proper microservice communication patterns.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { AppError } from '../utils/service';

// Environment configuration
const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:4004';
const SERVICE_TIMEOUT = parseInt(process.env.SERVICE_TIMEOUT || '5000', 10);
const MAX_RETRIES = parseInt(process.env.SERVICE_MAX_RETRIES || '3', 10);
const RETRY_DELAY_MS = parseInt(process.env.SERVICE_RETRY_DELAY_MS || '1000', 10);

// Response types
interface Customer {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive: boolean;
}

interface Pet {
  id: string;
  tenantId: string;
  customerId: string;
  name: string;
  species: string;
  breed?: string;
  isActive: boolean;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

/**
 * Customer Service API Client
 */
export class CustomerServiceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: CUSTOMER_SERVICE_URL,
      timeout: SERVICE_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Retry helper with exponential backoff
   * @param fn - Function to retry
   * @param retries - Number of retries remaining
   * @returns Result of function
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      // Only retry on network errors or 5xx server errors
      const shouldRetry =
        error instanceof AppError
          ? error.statusCode >= 500
          : true; // Retry on network errors

      if (!shouldRetry) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = RETRY_DELAY_MS * Math.pow(2, MAX_RETRIES - retries);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retryWithBackoff(fn, retries - 1);
    }
  }

  /**
   * Get customer by ID
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID for verification
   * @returns Customer data
   */
  async getCustomer(customerId: string, tenantId: string): Promise<Customer> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.client.get<ApiResponse<Customer>>(
          `/api/customers/${customerId}`,
          {
            headers: {
              'x-tenant-id': tenantId,
            },
          }
        );

        if (response.data.status === 'error' || !response.data.data) {
          throw AppError.notFoundError('Customer', customerId);
        }

        // Verify tenant matches (security check)
        if (response.data.data.tenantId !== tenantId) {
          throw AppError.forbiddenError('Customer does not belong to this tenant');
        }

        return response.data.data;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw AppError.serverError(`Failed to fetch customer: ${(error as Error).message}`);
      }
    });
  }

  /**
   * Get pet by ID
   * @param petId - Pet UUID
   * @param tenantId - Tenant ID for verification
   * @returns Pet data
   */
  async getPet(petId: string, tenantId: string): Promise<Pet> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.client.get<ApiResponse<Pet>>(
          `/api/pets/${petId}`,
          {
            headers: {
              'x-tenant-id': tenantId,
            },
          }
        );

        if (response.data.status === 'error' || !response.data.data) {
          throw AppError.notFoundError('Pet', petId);
        }

        // Verify tenant matches (security check)
        if (response.data.data.tenantId !== tenantId) {
          throw AppError.forbiddenError('Pet does not belong to this tenant');
        }

        return response.data.data;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw AppError.serverError(`Failed to fetch pet: ${(error as Error).message}`);
      }
    });
  }

  /**
   * Verify customer exists and belongs to tenant
   * @param customerId - Customer UUID
   * @param tenantId - Tenant ID
   * @returns true if customer exists and belongs to tenant
   */
  async verifyCustomer(customerId: string, tenantId: string): Promise<boolean> {
    try {
      await this.getCustomer(customerId, tenantId);
      return true;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        throw AppError.notFoundError('Customer', customerId);
      }
      throw error;
    }
  }

  /**
   * Verify pet exists and belongs to tenant
   * @param petId - Pet UUID
   * @param tenantId - Tenant ID
   * @returns true if pet exists and belongs to tenant
   */
  async verifyPet(petId: string, tenantId: string): Promise<boolean> {
    try {
      await this.getPet(petId, tenantId);
      return true;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        throw AppError.notFoundError('Pet', petId);
      }
      throw error;
    }
  }

  /**
   * Health check for Customer Service
   * @returns true if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle axios errors and convert to AppError
   */
  private handleError(error: AxiosError): AppError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;

      switch (status) {
        case 404:
          return AppError.notFoundError('Resource', undefined, message);
        case 403:
          return AppError.forbiddenError(message);
        case 400:
          return AppError.validationError(message);
        case 401:
          return AppError.authorizationError(message);
        case 500:
          return AppError.serverError(`Customer Service error: ${message}`);
        default:
          return AppError.serverError(`Customer Service returned ${status}: ${message}`);
      }
    } else if (error.request) {
      // Request made but no response received
      return AppError.serverError(
        'Customer Service is unavailable. Please try again later.'
      );
    } else {
      // Error setting up request
      return AppError.serverError(`Failed to communicate with Customer Service: ${error.message}`);
    }
  }
}

// Export singleton instance
export const customerServiceClient = new CustomerServiceClient();

// Export for testing
export default CustomerServiceClient;
