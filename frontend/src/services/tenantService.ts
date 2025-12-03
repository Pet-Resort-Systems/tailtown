import axios from "axios";
import { getApiBaseUrl } from "./api";

const API_URL = getApiBaseUrl();

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Tenant {
  id: string;
  businessName: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  status: "TRIAL" | "ACTIVE" | "PAUSED" | "CANCELLED" | "DELETED" | "PENDING";
  isActive: boolean;
  isPaused: boolean;
  planType: string;
  billingEmail?: string;
  maxEmployees: number;
  maxLocations: number;
  trialEndsAt?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  pausedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  employeeCount: number;
  customerCount: number;
  reservationCount: number;
  storageUsedMB: number;
  users?: TenantUser[];
}

export interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "MANAGER" | "STAFF";
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CreateTenantDto {
  businessName: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  planType?: string;
  maxEmployees?: number;
  timezone?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateTenantDto {
  businessName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  planType?: string;
  maxEmployees?: number;
  maxLocations?: number;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
}

export interface TenantUsage {
  customerCount: number;
  reservationCount: number;
  employeeCount: number;
}

class TenantService {
  /**
   * Get all tenants
   */
  async getAllTenants(filters?: {
    status?: string;
    isActive?: boolean;
    isPaused?: boolean;
  }): Promise<Tenant[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());
    if (filters?.isPaused !== undefined)
      params.append("isPaused", filters.isPaused.toString());

    const response = await axios.get(
      `${API_URL}/api/tenants?${params.toString()}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant> {
    const response = await axios.get(`${API_URL}/api/tenants/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data.data;
  }

  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<Tenant> {
    const response = await axios.get(
      `${API_URL}/api/tenants/subdomain/${subdomain}`,
      {
        headers: getAuthHeaders(),
      }
    );
    const tenant = response.data.data;

    // Store timezone in localStorage for easy access
    if (tenant && tenant.timezone) {
      try {
        localStorage.setItem("tenant_timezone", tenant.timezone);
      } catch (error) {
        console.warn("Could not store tenant timezone in localStorage:", error);
      }
    }

    return tenant;
  }

  /**
   * Get current tenant's timezone
   */
  async getCurrentTenantTimezone(): Promise<string> {
    try {
      // Try to get from localStorage first
      const cachedTimezone = localStorage.getItem("tenant_timezone");
      if (cachedTimezone) {
        return cachedTimezone;
      }

      // If not in cache, fetch from API
      const subdomain = window.location.hostname.split(".")[0];
      const tenant = await this.getTenantBySubdomain(subdomain);
      return tenant.timezone || "America/Denver";
    } catch (error) {
      console.warn("Could not fetch tenant timezone, using default:", error);
      return "America/Denver";
    }
  }

  /**
   * Create new tenant
   */
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    const response = await axios.post(`${API_URL}/api/tenants`, data, {
      headers: getAuthHeaders(),
    });
    return response.data.data;
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, data: UpdateTenantDto): Promise<Tenant> {
    const response = await axios.put(`${API_URL}/api/tenants/${id}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data.data;
  }

  /**
   * Pause tenant
   */
  async pauseTenant(id: string): Promise<void> {
    await axios.post(
      `${API_URL}/api/tenants/${id}/pause`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(id: string): Promise<void> {
    await axios.post(
      `${API_URL}/api/tenants/${id}/reactivate`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/tenants/${id}`, {
      headers: getAuthHeaders(),
    });
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(id: string): Promise<TenantUsage> {
    const response = await axios.get(`${API_URL}/api/tenants/${id}/usage`, {
      headers: getAuthHeaders(),
    });
    return response.data.data;
  }
}

export const tenantService = new TenantService();
