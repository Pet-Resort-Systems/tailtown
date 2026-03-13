/**
 * Vaccine Requirement Service
 * API service for vaccine requirement management
 */

import { getApiBaseUrl } from "./api";
import {
  VaccineRequirement,
  PetVaccineCompliance,
  CreateVaccineRequirementRequest,
  UpdateVaccineRequirementRequest,
  VaccineRequirementFilters,
} from "../types/vaccine";

// Helper to get tenant ID from localStorage
const getTenantId = () => {
  return (
    localStorage.getItem("tailtown_tenant_id") ||
    localStorage.getItem("tenantId") ||
    "dev"
  );
};

// Use dynamic API URL based on environment
const API_BASE_URL = getApiBaseUrl();

export const vaccineService = {
  /**
   * Get all vaccine requirements with optional filters
   */
  async getAll(
    filters?: VaccineRequirementFilters
  ): Promise<VaccineRequirement[]> {
    const params = new URLSearchParams();
    if (filters?.petType) params.append("petType", filters.petType);
    if (filters?.serviceType) params.append("serviceType", filters.serviceType);
    if (filters?.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/vaccine-requirements?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch vaccine requirements");
    const data = await response.json();
    return data.data;
  },

  /**
   * Get a single vaccine requirement by ID
   */
  async getById(id: string): Promise<VaccineRequirement> {
    const response = await fetch(
      `${API_BASE_URL}/api/vaccine-requirements/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch vaccine requirement");
    const data = await response.json();
    return data.data;
  },

  /**
   * Create a new vaccine requirement
   */
  async create(
    requirement: CreateVaccineRequirementRequest
  ): Promise<VaccineRequirement> {
    const response = await fetch(`${API_BASE_URL}/api/vaccine-requirements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": getTenantId(),
      },
      body: JSON.stringify(requirement),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create vaccine requirement");
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * Update a vaccine requirement
   */
  async update(
    id: string,
    updates: UpdateVaccineRequirementRequest
  ): Promise<VaccineRequirement> {
    const response = await fetch(
      `${API_BASE_URL}/api/vaccine-requirements/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update vaccine requirement");
    }
    const data = await response.json();
    return data.data;
  },

  /**
   * Delete a vaccine requirement
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/vaccine-requirements/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
      }
    );

    if (!response.ok) throw new Error("Failed to delete vaccine requirement");
  },

  /**
   * Update display order for multiple requirements
   */
  async updateDisplayOrder(
    requirements: Array<{ id: string; displayOrder: number }>
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/vaccine-requirements/display-order`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
        body: JSON.stringify({ requirements }),
      }
    );

    if (!response.ok) throw new Error("Failed to update display order");
  },

  /**
   * Get applicable vaccine requirements for a pet
   */
  async getApplicableForPet(
    petId: string,
    serviceType?: string
  ): Promise<VaccineRequirement[]> {
    const params = serviceType ? `?serviceType=${serviceType}` : "";
    const response = await fetch(
      `${API_BASE_URL}/api/pets/${petId}/vaccine-requirements${params}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
      }
    );

    if (!response.ok)
      throw new Error("Failed to fetch applicable vaccine requirements");
    const data = await response.json();
    return data.data;
  },

  /**
   * Check pet's vaccine compliance
   */
  async checkCompliance(
    petId: string,
    serviceType?: string
  ): Promise<PetVaccineCompliance> {
    const params = serviceType ? `?serviceType=${serviceType}` : "";
    const response = await fetch(
      `${API_BASE_URL}/api/pets/${petId}/vaccine-compliance${params}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": getTenantId(),
        },
      }
    );

    if (!response.ok) throw new Error("Failed to check vaccine compliance");
    const data = await response.json();
    return data.data;
  },
};

export default vaccineService;
