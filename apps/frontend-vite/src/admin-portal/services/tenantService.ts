import axios from 'axios';

const API_URL = import.meta.env.VITE_CUSTOMER_SERVICE_URL || window.location.origin;

const axiosInstance = axios.create({
  baseURL: API_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('superAdminAccessToken') || localStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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
  status: 'TRIAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'DELETED' | 'PENDING';
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
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'STAFF';
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
  async getAllTenants(filters?: {
    status?: string;
    isActive?: boolean;
    isPaused?: boolean;
  }): Promise<Tenant[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.isPaused !== undefined) params.append('isPaused', filters.isPaused.toString());

    const response = await axiosInstance.get(`/api/tenants?${params.toString()}`);
    return response.data.data;
  }

  async getTenantById(id: string): Promise<Tenant> {
    const response = await axiosInstance.get(`/api/tenants/${id}`);
    return response.data.data;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant> {
    const response = await axiosInstance.get(`/api/tenants/subdomain/${subdomain}`);
    return response.data.data;
  }

  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    const response = await axiosInstance.post(`/api/tenants`, data);
    return response.data.data;
  }

  async updateTenant(id: string, data: UpdateTenantDto): Promise<Tenant> {
    const response = await axiosInstance.put(`/api/tenants/${id}`, data);
    return response.data.data;
  }

  async pauseTenant(id: string): Promise<Tenant> {
    const response = await axiosInstance.post(`/api/tenants/${id}/pause`);
    return response.data.data;
  }

  async reactivateTenant(id: string): Promise<Tenant> {
    const response = await axiosInstance.post(`/api/tenants/${id}/reactivate`);
    return response.data.data;
  }

  async deleteTenant(id: string): Promise<Tenant> {
    const response = await axiosInstance.delete(`/api/tenants/${id}`);
    return response.data.data;
  }

  async getTenantUsage(id: string): Promise<TenantUsage> {
    const response = await axiosInstance.get(`/api/tenants/${id}/usage`);
    return response.data.data;
  }
}

export const tenantService = new TenantService();
