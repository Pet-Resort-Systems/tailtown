import api from "./api";
import { AxiosResponse } from "axios";

export interface PaginatedResponse<T> {
  status: string;
  results: number;
  totalPages: number;
  currentPage: number;
  data: T[];
}

export interface Pet {
  id: string;
  name: string;
  type: "DOG" | "CAT" | "OTHER";
  breed: string | null;
  color: string | null;
  // Format: YYYY-MM-DD for input, ISO string for API
  birthdate: string | null;
  weight: number | null;
  gender: "MALE" | "FEMALE" | null;
  isNeutered: boolean;
  microchipNumber: string | null;
  rabiesTagNumber: string | null;
  profilePhoto: string | null;
  specialNeeds: string | null;
  behaviorNotes: string | null;
  foodNotes: string | null;
  medicationNotes: string | null;
  allergies: string | null;
  vetName: string | null;
  vetPhone: string | null;
  veterinarianId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  customerId: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  isActive: boolean;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  medicalRecords?: any[];
  // Pet icons for quick visual reference
  petIcons?: string[];
  // Custom notes for generic flag icons
  iconNotes?: { [iconId: string]: string };
  vaccinationStatus?: {
    [key: string]: {
      status: "CURRENT" | "EXPIRED" | "PENDING";
      lastGiven?: string;
      notes?: string;
    };
  };
  vaccineExpirations?: {
    [key: string]: string; // ISO date string
  };
  // Compatibility data from Gingr
  playgroupCompatibility?:
    | "LARGE_DOG"
    | "MEDIUM_DOG"
    | "SMALL_DOG"
    | "NON_COMPATIBLE"
    | "SENIOR_STAFF_REQUIRED"
    | "UNKNOWN"
    | null;
  specialRequirements?: string[];
  compatibilityNotes?: string | null;
  healthFlags?: any[];
  behaviorFlags?: any[];
  aggressionFlags?: any[];
  groomingPreferences?: any;
  staffRequirements?: any;
}

export const petService = {
  getPetsByCustomer: async (
    customerId: string
  ): Promise<PaginatedResponse<Pet>> => {
    try {
      const response: AxiosResponse<PaginatedResponse<Pet>> = await api.get(
        `/api/pets/customer/${customerId}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in getPetsByCustomer:", error);
      throw error;
    }
  },

  getAllPets: async (
    page = 1,
    limit = 10,
    search = ""
  ): Promise<PaginatedResponse<Pet>> => {
    try {
      const response: AxiosResponse = await api.get("/api/pets", {
        params: {
          page,
          limit,
          search,
        },
      });

      // Return a properly formatted PaginatedResponse
      return {
        status: response.data.status || "success",
        results: response.data.results || 0,
        totalPages: response.data.totalPages || 1,
        currentPage: response.data.currentPage || page,
        data: response.data.data || [],
      };
    } catch (error: any) {
      console.error("Error in getAllPets:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error setting up request:", error.message);
      }
      throw error;
    }
  },

  getPetById: async (id: string): Promise<Pet> => {
    try {
      const response: AxiosResponse = await api.get(`/api/pets/${id}`);
      return response.data?.data;
    } catch (error: any) {
      console.error("Error in getPetById:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  createPet: async (pet: Omit<Pet, "id">): Promise<Pet> => {
    try {
      const response: AxiosResponse = await api.post("/api/pets", pet);
      return response.data?.data;
    } catch (error: any) {
      console.error("Error in createPet:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  updatePet: async (id: string, pet: Partial<Pet>): Promise<Pet> => {
    try {
      const response: AxiosResponse = await api.put(`/api/pets/${id}`, pet);
      return response.data?.data;
    } catch (error: any) {
      console.error("Error in updatePet:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  deletePet: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/pets/${id}?permanent=true`);
    } catch (error: any) {
      console.error("Error in deletePet:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  uploadPetPhoto: async (id: string, file: File): Promise<Pet> => {
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response: AxiosResponse = await api.post(
        `/api/pets/${id}/photo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data?.data;
    } catch (error: any) {
      console.error("Error in uploadPetPhoto:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  getPetMedicalRecords: async (id: string): Promise<any[]> => {
    try {
      const response: AxiosResponse = await api.get(
        `/api/pets/${id}/medical-records`
      );
      return response.data?.data || [];
    } catch (error: any) {
      console.error("Error in getPetMedicalRecords:", error);
      console.error("Response:", error.response);
      throw error;
    }
  },

  searchPets: async (searchText: string): Promise<PaginatedResponse<Pet>> => {
    try {
      // Use getAllPets with search parameter
      return await petService.getAllPets(1, 50, searchText);
    } catch (error: any) {
      console.error("Error in searchPets:", error);
      throw error;
    }
  },

  /**
   * Deactivate a pet (soft delete).
   * Used when a pet passes away or is no longer a client.
   * History is preserved but communications will stop.
   */
  deactivatePet: async (
    id: string,
    reason?: string,
    deactivatedAt?: string
  ): Promise<Pet> => {
    try {
      const response: AxiosResponse = await api.post(
        `/api/pets/${id}/deactivate`,
        {
          reason,
          deactivatedAt,
        }
      );
      return response.data?.data;
    } catch (error: any) {
      console.error("Error in deactivatePet:", error);
      throw error;
    }
  },

  /**
   * Reactivate a previously deactivated pet.
   */
  reactivatePet: async (id: string): Promise<Pet> => {
    try {
      const response: AxiosResponse = await api.post(
        `/api/pets/${id}/reactivate`
      );
      return response.data?.data;
    } catch (error: any) {
      console.error("Error in reactivatePet:", error);
      throw error;
    }
  },
};
