import { Resource, ResourceAvailability } from "../types/resource";
import { reservationApi as api } from "./api";

// Get all resources with pagination support
export const getAllResources = async () => {
  try {
    let allResources: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    // Fetch first page with cache-busting
    const firstResponse = await api.get("/api/resources", {
      params: {
        page: currentPage,
        limit: 100,
        _t: Date.now(), // Cache buster
      },
    });

    if (firstResponse.data && firstResponse.data.status === "success") {
      allResources = firstResponse.data.data || [];
      totalPages = firstResponse.data.totalPages || 1;

      // Fetch remaining pages if there are any
      while (currentPage < totalPages) {
        currentPage++;
        const pageResponse = await api.get("/api/resources", {
          params: {
            page: currentPage,
            limit: 100,
            _t: Date.now(), // Cache buster
          },
        });

        if (
          pageResponse.data &&
          pageResponse.data.status === "success" &&
          pageResponse.data.data
        ) {
          allResources = [...allResources, ...pageResponse.data.data];
        }
      }

      return allResources;
    }

    console.error("Unexpected response format:", firstResponse.data);
    throw new Error("Failed to get resources: Invalid response format");
  } catch (error: any) {
    console.error(
      "Error getting resources:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Get a single resource by ID
export const getResourceById = async (id: string) => {
  try {
    const response = await api.get(`/api/resources/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error getting resource:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Create a new resource
export const createResource = async (
  resourceData: Omit<Resource, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const response = await api.post("/api/resources", {
      ...resourceData,
      isActive: true,
      attributes: resourceData.attributes || {},
    });
    if (response.data.status === "success") {
      return response.data.data;
    }
    throw new Error("Failed to create resource");
  } catch (error: any) {
    console.error(
      "Error creating resource:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Update a resource
export const updateResource = async (
  id: string,
  resourceData: Partial<Resource>
) => {
  try {
    const response = await api.put(`/api/resources/${id}`, resourceData);
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error updating resource:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Delete a resource
export const deleteResource = async (id: string) => {
  try {
    const response = await api.delete(`/api/resources/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error deleting resource:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Create availability slot
export const createAvailabilitySlot = async (
  resourceId: string,
  slotData: Omit<
    ResourceAvailability,
    "id" | "resourceId" | "createdAt" | "updatedAt"
  >
) => {
  const response = await api.post(
    `/api/resources/${resourceId}/availability`,
    slotData
  );
  return response.data;
};

// Update availability slot
export const updateAvailabilitySlot = async (
  id: string,
  slotData: Partial<
    Omit<ResourceAvailability, "id" | "resourceId" | "createdAt" | "updatedAt">
  >
) => {
  const response = await api.put(`/api/resources/availability/${id}`, slotData);
  return response.data;
};

// Delete availability slot
export const deleteAvailabilitySlot = async (id: string) => {
  const response = await api.delete(`/api/resources/availability/${id}`);
  return response.data;
};
