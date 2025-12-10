import { reservationApi } from "./api";

/**
 * Check-In Service
 * Handles all check-in related API calls
 */

export interface CheckInTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  sections: CheckInSection[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckInSection {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  order: number;
  questions: CheckInQuestion[];
}

export interface CheckInQuestion {
  id: string;
  sectionId: string;
  questionText: string;
  questionType:
    | "TEXT"
    | "NUMBER"
    | "YES_NO"
    | "MULTIPLE_CHOICE"
    | "TIME"
    | "LONG_TEXT"
    | "DATE";
  options?: { choices: string[] };
  isRequired: boolean;
  order: number;
  placeholder?: string;
  helpText?: string;
}

export interface CheckInResponse {
  questionId: string;
  response: any;
}

export interface CheckInMedication {
  id?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  administrationMethod:
    | "ORAL_PILL"
    | "ORAL_LIQUID"
    | "TOPICAL"
    | "INJECTION"
    | "EYE_DROPS"
    | "EAR_DROPS"
    | "INHALER"
    | "TRANSDERMAL_PATCH"
    | "OTHER";
  timeOfDay?: string;
  withFood: boolean;
  specialInstructions?: string;
  startDate?: string;
  endDate?: string;
  prescribingVet?: string;
  notes?: string;
}

export interface CheckInBelonging {
  id?: string;
  itemType: string;
  description: string;
  quantity: number;
  color?: string;
  brand?: string;
  notes?: string;
  returnedAt?: string;
  returnedBy?: string;
}

export interface CheckIn {
  id?: string;
  tenantId?: string;
  petId: string;
  customerId?: string;
  reservationId?: string;
  templateId?: string;
  checkInBy?: string;
  checkInNotes?: string;
  responses?: CheckInResponse[];
  medications?: CheckInMedication[];
  belongings?: CheckInBelonging[];
}

export interface ServiceAgreement {
  checkInId: string;
  agreementText: string;
  initials: Array<{ section: string; initials: string; timestamp: string }>;
  signature: string;
  signedBy: string;
  ipAddress?: string;
}

const checkInService = {
  /**
   * Get the default check-in template
   */
  getDefaultTemplate: async () => {
    const response = await reservationApi.get(
      "/api/check-in-templates/default"
    );
    return response.data;
  },

  /**
   * Get all check-in templates
   */
  getAllTemplates: async (activeOnly = true) => {
    const response = await reservationApi.get("/api/check-in-templates", {
      params: { active: activeOnly },
    });
    return response.data;
  },

  /**
   * Get a specific template by ID
   */
  getTemplateById: async (id: string) => {
    const response = await reservationApi.get(`/api/check-in-templates/${id}`);
    return response.data;
  },

  /**
   * Create a new check-in template
   */
  createTemplate: async (templateData: Partial<CheckInTemplate>) => {
    const response = await reservationApi.post(
      "/api/check-in-templates",
      templateData
    );
    return response.data;
  },

  /**
   * Update an existing check-in template
   */
  updateTemplate: async (
    id: string,
    templateData: Partial<CheckInTemplate>
  ) => {
    const response = await reservationApi.put(
      `/api/check-in-templates/${id}`,
      templateData
    );
    return response.data;
  },

  /**
   * Delete a check-in template
   */
  deleteTemplate: async (id: string) => {
    const response = await reservationApi.delete(
      `/api/check-in-templates/${id}`
    );
    return response.data;
  },

  /**
   * Create a new check-in
   */
  createCheckIn: async (checkInData: CheckIn) => {
    const response = await reservationApi.post("/api/check-ins", checkInData);
    return response.data;
  },

  /**
   * Get check-in by ID
   */
  getCheckInById: async (id: string) => {
    const response = await reservationApi.get(`/api/check-ins/${id}`);
    return response.data;
  },

  /**
   * Get check-ins by reservation ID
   */
  getCheckInsByReservation: async (reservationId: string) => {
    const response = await reservationApi.get("/api/check-ins", {
      params: { reservationId },
    });
    return response.data;
  },

  /**
   * Get all check-ins with optional filters
   */
  getAllCheckIns: async (filters?: {
    petId?: string;
    reservationId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await reservationApi.get("/api/check-ins", {
      params: filters,
    });
    return response.data;
  },

  /**
   * Update a check-in
   */
  updateCheckIn: async (id: string, updates: Partial<CheckIn>) => {
    const response = await reservationApi.put(`/api/check-ins/${id}`, updates);
    return response.data;
  },

  /**
   * Add a medication to a check-in
   */
  addMedication: async (checkInId: string, medication: CheckInMedication) => {
    const response = await reservationApi.post(
      `/api/check-ins/${checkInId}/medications`,
      medication
    );
    return response.data;
  },

  /**
   * Update a medication
   */
  updateMedication: async (
    checkInId: string,
    medicationId: string,
    medication: CheckInMedication
  ) => {
    const response = await reservationApi.put(
      `/api/check-ins/${checkInId}/medications/${medicationId}`,
      medication
    );
    return response.data;
  },

  /**
   * Delete a medication
   */
  deleteMedication: async (checkInId: string, medicationId: string) => {
    const response = await reservationApi.delete(
      `/api/check-ins/${checkInId}/medications/${medicationId}`
    );
    return response.data;
  },

  /**
   * Mark a belonging as returned
   */
  returnBelonging: async (
    checkInId: string,
    belongingId: string,
    returnedBy: string
  ) => {
    const response = await reservationApi.put(
      `/api/check-ins/${checkInId}/belongings/${belongingId}/return`,
      {
        returnedBy,
      }
    );
    return response.data;
  },

  /**
   * Get default service agreement template
   */
  getDefaultAgreementTemplate: async () => {
    const response = await reservationApi.get(
      "/api/service-agreement-templates/default"
    );
    return response.data;
  },

  /**
   * Create a signed service agreement
   */
  createServiceAgreement: async (agreement: ServiceAgreement) => {
    const response = await reservationApi.post(
      "/api/service-agreements",
      agreement
    );
    return response.data;
  },

  /**
   * Get service agreement by check-in ID
   */
  getAgreementByCheckIn: async (checkInId: string) => {
    const response = await reservationApi.get(
      `/api/service-agreements/check-in/${checkInId}`
    );
    return response.data;
  },

  /**
   * Get all pets sharing the same room for a reservation
   */
  getRoomPets: async (reservationId: string) => {
    const response = await reservationApi.get(
      `/api/check-ins/room-pets/${reservationId}`
    );
    return response.data;
  },

  /**
   * Batch check-in multiple pets sharing the same room
   */
  batchCheckIn: async (checkIns: CheckIn[], sharedData?: Partial<CheckIn>) => {
    const response = await reservationApi.post("/api/check-ins/batch", {
      checkIns,
      sharedData,
    });
    return response.data;
  },

  /**
   * Get draft check-in for a reservation
   */
  getDraft: async (reservationId: string) => {
    const response = await reservationApi.get(
      `/api/check-ins/draft/${reservationId}`
    );
    return response.data;
  },

  /**
   * Save or update a check-in draft
   */
  saveDraft: async (draftData: {
    checkInId?: string;
    petId: string;
    customerId?: string;
    reservationId: string;
    templateId?: string;
    currentStep: number;
    responses?: CheckInResponse[];
    medications?: CheckInMedication[];
    belongings?: CheckInBelonging[];
    checkInNotes?: string;
  }) => {
    const response = await reservationApi.post(
      "/api/check-ins/draft",
      draftData
    );
    return response.data;
  },
};

export default checkInService;
