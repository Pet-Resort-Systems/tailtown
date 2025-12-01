import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";

/**
 * API service layer for Tailtown microservices
 * This module provides configured Axios instances for each service
 */

// Default headers for all API instances
const defaultHeaders = {
  "Content-Type": "application/json",
};

// Default validation for all API instances
const defaultValidateStatus = (status: number) => status < 500;

// Default timeout (ms) for all API instances to prevent indefinite hangs
const API_TIMEOUT: number = (() => {
  const raw = process.env.REACT_APP_API_TIMEOUT;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000; // 30s default
})();

// Tenant ID provider (no hardcoded fallback)
const getTenantId = (): string | undefined => {
  try {
    const fromStorage =
      localStorage.getItem("tailtown_tenant_id") ||
      localStorage.getItem("tenantId");
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch (_) {
    // Access to localStorage might fail in non-browser environments
  }
  const fromEnv = process.env.REACT_APP_TENANT_ID;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : undefined;
};

// Add request interceptor for logging and auth token
const addRequestInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    (config) => {
      console.log(
        `API Request: ${config.method?.toUpperCase()} ${config.baseURL}${
          config.url
        }`,
        {
          params: config.params,
          data: config.data,
        }
      );

      // Add JWT token to requests if available
      try {
        const token = localStorage.getItem("token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // localStorage might not be available
        console.warn("Could not access token from localStorage:", error);
      }

      return config;
    },
    (error) => {
      console.error("API Request Error:", error);
      return Promise.reject(error);
    }
  );
};

// Add response interceptor for logging
const addResponseInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => {
      console.log(
        `API Response: ${
          response.status
        } ${response.config.method?.toUpperCase()} ${response.config.url}`
      );
      return response;
    },
    (error: AxiosError) => {
      console.error("API Response Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
      return Promise.reject(error);
    }
  );
};

/**
 * Get API base URL - uses current origin in production for multi-tenant support
 */
const getApiBaseUrl = (): string => {
  // In production, use the current origin (supports subdomains like brangro.canicloud.com)
  if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
    return window.location.origin;
  }
  // In development, use environment variable or localhost
  return process.env.REACT_APP_API_URL || "http://localhost:4004";
};

/**
 * Customer Service API client
 * Handles customer and pet data operations
 */
const customerApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: defaultHeaders,
  validateStatus: defaultValidateStatus,
  timeout: API_TIMEOUT,
});

// Ensure tenant header and auth token are attached dynamically for each request to customer API
customerApi.interceptors.request.use(
  (config) => {
    const tenantId = getTenantId();
    // Check for impersonation token first, then fall back to regular access token or token
    const impersonationToken = localStorage.getItem("impersonationToken");
    const accessToken =
      impersonationToken ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token");

    if (tenantId) {
      config.headers = {
        ...(config.headers || {}),
        "x-tenant-id": tenantId,
      } as any;
    } else {
      // Skip warning for system/super-admin endpoints that don't require tenant ID
      const isSystemEndpoint =
        config.url?.includes("/system/") ||
        config.url?.includes("/super-admin/");
      if (!isSystemEndpoint) {
        console.warn(
          "Tenant ID not set; requests may be rejected by the server"
        );
      }
    }

    if (accessToken) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      } as any;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add interceptors to customer API
addRequestInterceptor(customerApi);
addResponseInterceptor(customerApi);

/**
 * Reservation Service API client
 * Handles reservation and resource operations
 */
const reservationApi = axios.create({
  baseURL: getApiBaseUrl(), // Use same base URL as customer API (nginx routes to correct service)
  headers: {
    ...defaultHeaders,
  },
  validateStatus: defaultValidateStatus,
  timeout: API_TIMEOUT,
});

// Ensure tenant header and auth token are attached dynamically for each request
reservationApi.interceptors.request.use(
  (config) => {
    const tenantId = getTenantId();
    // Check for impersonation token first, then fall back to regular access token or token
    const impersonationToken = localStorage.getItem("impersonationToken");
    const accessToken =
      impersonationToken ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token");

    if (tenantId) {
      config.headers = {
        ...(config.headers || {}),
        "x-tenant-id": tenantId,
      } as any;
    } else {
      // Skip warning for system/super-admin endpoints that don't require tenant ID
      const isSystemEndpoint =
        config.url?.includes("/system/") ||
        config.url?.includes("/super-admin/");
      if (!isSystemEndpoint) {
        console.warn(
          "Tenant ID not set; requests may be rejected by the server"
        );
      }
    }

    if (accessToken) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      } as any;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add interceptors to reservation API
addRequestInterceptor(reservationApi);
addResponseInterceptor(reservationApi);

/**
 * Legacy API client for backward compatibility
 * @deprecated Use the specific service clients instead
 */
const api = customerApi;

// Helper function to make API requests with better error handling
export const safeApiCall = async <T>(
  apiCall: Promise<AxiosResponse<T>>
): Promise<T | null> => {
  try {
    const response = await apiCall;
    return response.data;
  } catch (error: any) {
    console.error("API call failed:", error.message);
    console.error("Error details:", {
      status: error.response?.status,
      data: error.response?.data,
    });
    return null;
  }
};

export { customerApi, reservationApi, getApiBaseUrl };
export default api;
