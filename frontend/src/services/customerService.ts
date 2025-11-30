import { PaginatedResponse } from "../types/common";
import { Customer } from "../types/customer";
import api, { customerApi } from "./api";

export type { Customer };

// Helper to get tenant ID
const getTenantId = (): string => {
  return (
    localStorage.getItem("tailtown_tenant_id") ||
    localStorage.getItem("tenantId") ||
    "dev"
  );
};

export const customerService = {
  /**
   * Public customer lookup by email - for booking portal login
   * Does not require authentication
   */
  lookupByEmail: async (email: string): Promise<Customer> => {
    const response = await customerApi.post(
      "/api/customers/lookup",
      { email },
      {
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
        // Don't send auth token for public endpoint
        transformRequest: [
          (data, headers) => {
            delete headers?.Authorization;
            return JSON.stringify(data);
          },
        ],
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Customer not found");
    }

    return response.data.data;
  },

  getAllCustomers: async (
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Customer>> => {
    const response = await api.get("/api/customers", {
      params: { page, limit },
    });
    return response.data;
  },

  searchCustomers: async (
    query: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Customer>> => {
    const response = await api.get("/api/customers", {
      params: {
        search: query,
        page,
        limit,
      },
    });
    return response.data;
  },

  getCustomerById: async (id: string): Promise<Customer> => {
    const response = await api.get(`/api/customers/${id}`);
    return response.data.data;
  },

  createCustomer: async (customer: Omit<Customer, "id">): Promise<Customer> => {
    try {
      const response = await api.post("/api/customers", customer);
      if (!response.data?.data) {
        throw new Error("No data in response");
      }
      return response.data.data;
    } catch (error: any) {
      console.error("Error in createCustomer:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  updateCustomer: async (
    id: string,
    customer: Partial<Customer>
  ): Promise<Customer> => {
    try {
      const response = await api.put(`/api/customers/${id}`, customer);
      if (!response.data?.data) {
        throw new Error("No data in response");
      }
      return response.data.data;
    } catch (error: any) {
      console.error("Error in updateCustomer:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  deleteCustomer: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/customers/${id}?permanent=true`);
    } catch (error: any) {
      console.error("Error in deleteCustomer:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },
};
