import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import config, { getTenantId } from '../../config';

// Types
export interface ApiResponse<T = any> {
  status: string;
  data: T;
  results?: number;
  totalPages?: number;
  currentPage?: number;
  pagination?: {
    totalCount?: number;
    totalPages?: number;
    currentPage?: number;
    limit?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

/**
 * Creates a configured Axios instance for a specific service
 * @param baseURL - Base URL for the API
 * @param options - Additional options
 * @returns Configured Axios instance
 */
export const createApiClient = (
  baseURL: string,
  options: {
    attachTenantId?: boolean;
    defaultHeaders?: Record<string, string>;
    enableLogging?: boolean;
    timeout?: number;
  } = {}
): AxiosInstance => {
  const {
    attachTenantId = config.api.includeTenantId,
    defaultHeaders = {},
    enableLogging = true,
    timeout = config.api.timeout,
  } = options;

  // Create the API instance
  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    },
    validateStatus: (status) => status < 500, // Don't reject on 4xx errors
  });

  // Attach tenant ID if enabled
  if (attachTenantId) {
    instance.interceptors.request.use(
      (config) => {
        const tenantId = getTenantId();
        if (tenantId) {
          config.headers = {
            ...(config.headers || {}),
            'x-tenant-id': tenantId,
          } as any;
        } else if (import.meta.env.DEV) {
          console.warn('No tenant ID found; using default "dev" tenant');
          config.headers = {
            ...(config.headers || {}),
            'x-tenant-id':
              localStorage.getItem('tailtown_tenant_id') ||
              localStorage.getItem('tenantId') ||
              'dev',
          } as any;
        } else {
          console.warn(
            'Tenant ID not set; requests may be rejected by the server'
          );
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Add logging interceptors if enabled
  if (enableLogging) {
    // Request logging
    instance.interceptors.request.use(
      (config) => config,
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response logging
    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Response Error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  return instance;
};

/**
 * Helper function to make API requests with standardized error handling
 * @param apiCall - Promise that returns an AxiosResponse
 * @returns The data from the response, or null if there was an error
 */
export const safeApiCall = async <T>(
  apiCall: Promise<AxiosResponse<T>>
): Promise<T | null> => {
  try {
    const response = await apiCall;
    return response.data;
  } catch (error: any) {
    console.error('API call failed:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
    });
    return null;
  }
};

/**
 * Helper function to extract data from various API response formats
 * @param response - API response with potentially nested data structure
 * @returns Normalized data
 */
export const normalizeResponse = <T>(response: any): T => {
  // Handle various response structures:
  // 1. { data: { someEntity: { ... } } }
  // 2. { data: { ... } }
  // 3. { someEntity: { ... } }
  // 4. { ... } (direct data)

  if (response?.data?.data) {
    return response.data.data as T;
  } else if (response?.data) {
    return response.data as T;
  } else {
    return response as T;
  }
};
