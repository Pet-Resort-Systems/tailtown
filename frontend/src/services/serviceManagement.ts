import { Service } from "../types/service";
import api from "./api";

export const serviceManagement = {
  // Get all services
  getAllServices: async (params?: {
    category?: string;
    limit?: number;
    page?: number;
  }) => {
    const response = await api.get("/api/services", { params });
    return response.data;
  },

  // Get a single service by ID
  getServiceById: async (id: string, includeDeleted: boolean = false) => {
    try {
      const response = await api.get(`/api/services/${id}`, {
        params: { includeDeleted },
      });
      return response.data;
    } catch (error: any) {
      // If the service is not found or inactive, handle gracefully
      if (error.response && error.response.status === 404) {
        throw new Error("Service not found or has been deleted");
      }
      throw error;
    }
  },

  // Create a new service
  createService: async (serviceData: Omit<Service, "id">) => {
    const response = await api.post("/api/services", serviceData);
    return response.data;
  },

  // Update a service
  updateService: async (id: string, serviceData: Partial<Service>) => {
    try {
      // Ensure we only send the fields that the backend expects
      const {
        name,
        description,
        duration,
        price,
        serviceCategory,
        isActive,
        requiresStaff,
        notes,
        availableAddOns,
      } = serviceData;

      // Make sure isActive is always included and set to true if updating a deactivated service
      const updatedData = {
        name,
        description,
        duration,
        price,
        serviceCategory,
        isActive: isActive !== undefined ? isActive : true,
        requiresStaff,
        notes,
        availableAddOns: availableAddOns?.map((addOn) => ({
          name: addOn.name,
          description: addOn.description,
          price: addOn.price,
          duration: addOn.duration,
        })),
      };

      const response = await api.put(`/api/services/${id}`, updatedData);
      return response.data;
    } catch (error: any) {
      // Handle specific error cases
      let errorMessage = "Failed to update service";

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  },

  // Delete a service
  deleteService: async (id: string, force: boolean = false) => {
    try {
      const response = await api.delete(`/api/services/${id}`, {
        params: { force },
      });
      return response.data;
    } catch (error: any) {
      // If there's a 400 error about reservations, it means we need to deactivate instead
      // But we should handle this gracefully for the user
      if (error.response && error.response.status === 400) {
        // Try to deactivate the service instead
        const deactivateResponse = await api.patch(
          `/api/services/${id}/deactivate`
        );

        // Return a modified response that indicates what happened
        return {
          ...deactivateResponse.data,
          message:
            "Service has been deactivated instead of deleted because it has reservations",
        };
      }

      // Handle other error cases
      let errorMessage = "Failed to delete service";

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  },

  // Deactivate a service (soft delete)
  deactivateService: async (id: string) => {
    const response = await api.patch(`/api/services/${id}/deactivate`);
    return response.data;
  },

  // Get add-ons for a service
  getServiceAddOns: async (id: string) => {
    try {
      // First, get the service details to check its category
      const serviceDetails = await api.get(`/api/services/${id}`);

      // Extract service category
      let serviceCategory = "";
      if (serviceDetails.data) {
        if (serviceDetails.data.category) {
          serviceCategory = serviceDetails.data.category;
        } else if (
          serviceDetails.data.data &&
          serviceDetails.data.data.serviceCategory
        ) {
          serviceCategory = serviceDetails.data.data.serviceCategory;
        }
      }

      // Get the add-ons for this service
      const response = await api.get(`/api/services/${id}/add-ons`);

      // If this is a grooming service, we should have add-ons
      if (serviceCategory === "GROOMING") {
      }

      // Handle different response formats
      if (response && response.data) {
        // If the response is an array, return it directly
        if (Array.isArray(response.data)) {
          return response.data;
        }

        // If the response has a data property that's an array, return that
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }

        // If the response has an addOns property that's an array, return that
        if (response.data.addOns && Array.isArray(response.data.addOns)) {
          return response.data.addOns;
        }

        // Otherwise, return the response data as is
        return response.data;
      }

      console.warn("serviceManagement: No add-ons data found in response");
      return [];
    } catch (error: any) {
      console.error("serviceManagement: Error fetching add-ons:", error);
      console.error("serviceManagement: Error details:", error.message);
      if (error.response) {
        console.error(
          "serviceManagement: Error response status:",
          error.response.status
        );
        console.error(
          "serviceManagement: Error response data:",
          error.response.data
        );
      }
      throw error;
    }
  },

  // Get reservations for a service
  getServiceReservations: async (
    id: string,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const response = await api.get(`/api/services/${id}/reservations`, {
      params,
    });
    return response.data;
  },

  // Get services by category
  getServicesByCategory: async (category: string) => {
    const response = await api.get(`/api/services/category/${category}`);
    return response.data;
  },

  // Get only active services
  getActiveServices: async () => {
    const response = await api.get("/api/services/active");
    return response.data;
  },
};
