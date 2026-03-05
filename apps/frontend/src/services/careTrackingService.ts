/**
 * Care Tracking Service
 * Handles feeding logs and medication administration tracking
 */

import api from "./api";

export type MealTime = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export interface FeedingLog {
  id: string;
  tenantId: string;
  petId: string;
  reservationId?: string;
  date: string;
  mealTime: MealTime;
  rating: number; // 0-4
  notes?: string;
  foodType?: string;
  staffId: string;
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  pet?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PetMedication {
  id: string;
  tenantId: string;
  petId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  administrationMethod: string;
  timeOfDay: string[];
  withFood: boolean;
  specialInstructions?: string;
  startDate?: string;
  endDate?: string;
  prescribingVet?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logs?: MedicationLog[];
}

export interface MedicationLog {
  id: string;
  tenantId: string;
  petId: string;
  medicationId: string;
  reservationId?: string;
  scheduledTime: string;
  administeredAt?: string;
  wasAdministered: boolean;
  staffId: string;
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  notes?: string;
  skippedReason?: string;
  medication?: PetMedication;
  pet?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CheckedInPet {
  reservationId: string;
  pet: {
    id: string;
    name: string;
    type: string;
    breed?: string;
    isPickyEater: boolean;
    foodNotes?: string;
    profilePhoto?: string;
    medications: PetMedication[];
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  todaysFeedingLogs?: FeedingLog[];
}

export interface FeedingReportStats {
  totalLogs: number;
  averageRating: number;
  lowRatingCount: number;
  pickyEaterCount: number;
}

export interface MedicationReportStats {
  totalScheduled: number;
  administered: number;
  missed: number;
  pending: number;
}

export const careTrackingService = {
  // ============================================
  // FEEDING
  // ============================================

  /**
   * Get all checked-in pets for feeding tracking
   */
  getCheckedInPets: async (): Promise<CheckedInPet[]> => {
    const response = await api.get("/api/care-tracking/feeding/pets");
    return response.data?.data || [];
  },

  /**
   * Log a feeding
   */
  createFeedingLog: async (data: {
    petId: string;
    reservationId?: string;
    date?: string;
    mealTime: MealTime;
    rating: number;
    notes?: string;
    foodType?: string;
  }): Promise<FeedingLog> => {
    const response = await api.post("/api/care-tracking/feeding", data);
    return response.data?.data;
  },

  /**
   * Get feeding logs for a pet
   */
  getFeedingLogs: async (
    petId: string,
    params?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<FeedingLog[]> => {
    const response = await api.get(`/api/care-tracking/feeding/pet/${petId}`, {
      params,
    });
    return response.data?.data || [];
  },

  /**
   * Get feeding report
   */
  getFeedingReport: async (params?: {
    startDate?: string;
    endDate?: string;
    petId?: string;
  }): Promise<{
    logs: FeedingLog[];
    stats: FeedingReportStats;
    dateRange: { start: string; end: string };
  }> => {
    const response = await api.get("/api/care-tracking/feeding/report", {
      params,
    });
    return response.data?.data;
  },

  /**
   * Toggle picky eater flag
   */
  togglePickyEater: async (
    petId: string,
    isPickyEater?: boolean
  ): Promise<{ id: string; isPickyEater: boolean }> => {
    const response = await api.patch(
      `/api/care-tracking/pets/${petId}/picky-eater`,
      { isPickyEater }
    );
    return response.data?.data;
  },

  // ============================================
  // MEDICATIONS
  // ============================================

  /**
   * Get pets needing medication today
   */
  getPetsNeedingMedication: async (): Promise<CheckedInPet[]> => {
    const response = await api.get("/api/care-tracking/medications/pets");
    return response.data?.data || [];
  },

  /**
   * Get medications for a pet
   */
  getPetMedications: async (
    petId: string,
    activeOnly = true
  ): Promise<PetMedication[]> => {
    const response = await api.get(
      `/api/care-tracking/medications/pet/${petId}`,
      {
        params: { activeOnly: activeOnly.toString() },
      }
    );
    return response.data?.data || [];
  },

  /**
   * Create a medication for a pet
   */
  createPetMedication: async (
    petId: string,
    data: {
      medicationName: string;
      dosage: string;
      frequency: string;
      administrationMethod: string;
      timeOfDay?: string[];
      withFood?: boolean;
      specialInstructions?: string;
      startDate?: string;
      endDate?: string;
      prescribingVet?: string;
    }
  ): Promise<PetMedication> => {
    const response = await api.post(
      `/api/care-tracking/medications/pet/${petId}`,
      data
    );
    return response.data?.data;
  },

  /**
   * Update a medication
   */
  updatePetMedication: async (
    medicationId: string,
    data: Partial<PetMedication>
  ): Promise<PetMedication> => {
    const response = await api.patch(
      `/api/care-tracking/medications/${medicationId}`,
      data
    );
    return response.data?.data;
  },

  /**
   * Delete (deactivate) a medication
   */
  deletePetMedication: async (medicationId: string): Promise<void> => {
    await api.delete(`/api/care-tracking/medications/${medicationId}`);
  },

  /**
   * Log medication administration
   */
  createMedicationLog: async (data: {
    petId: string;
    medicationId: string;
    reservationId?: string;
    scheduledTime: string;
    wasAdministered: boolean;
    notes?: string;
    skippedReason?: string;
  }): Promise<MedicationLog> => {
    const response = await api.post("/api/care-tracking/medications/log", data);
    return response.data?.data;
  },

  /**
   * Get medication logs for a pet
   */
  getMedicationLogs: async (
    petId: string,
    params?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<MedicationLog[]> => {
    const response = await api.get(
      `/api/care-tracking/medications/log/pet/${petId}`,
      { params }
    );
    return response.data?.data || [];
  },

  /**
   * Get medication report
   */
  getMedicationReport: async (params?: {
    startDate?: string;
    endDate?: string;
    petId?: string;
  }): Promise<{
    logs: MedicationLog[];
    stats: MedicationReportStats;
    dateRange: { start: string; end: string };
  }> => {
    const response = await api.get("/api/care-tracking/medications/report", {
      params,
    });
    return response.data?.data;
  },

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Format rating for display
   */
  formatRating: (rating: number): string => {
    const labels = [
      "Didn't eat",
      "Ate a little",
      "Ate half",
      "Ate most",
      "Ate all",
    ];
    return labels[rating] || "Unknown";
  },

  /**
   * Get rating color
   */
  getRatingColor: (
    rating: number
  ): "error" | "warning" | "info" | "success" => {
    if (rating === 0) return "error";
    if (rating <= 1) return "warning";
    if (rating <= 2) return "info";
    return "success";
  },

  /**
   * Format meal time for display
   */
  formatMealTime: (mealTime: MealTime): string => {
    const labels: Record<MealTime, string> = {
      BREAKFAST: "Breakfast",
      LUNCH: "Lunch",
      DINNER: "Dinner",
      SNACK: "Snack",
    };
    return labels[mealTime] || mealTime;
  },
};

export default careTrackingService;
