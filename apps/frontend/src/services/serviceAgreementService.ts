import { reservationApi } from "./api";

// Types
export type QuestionType =
  | "TEXT"
  | "NUMBER"
  | "YES_NO"
  | "MULTIPLE_CHOICE"
  | "CURRENCY"
  | "LONG_TEXT";

export interface CustomQuestion {
  id: string;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For MULTIPLE_CHOICE
  placeholder?: string;
}

export interface ServiceAgreementTemplate {
  id: string;
  tenantId: string;
  name: string;
  content: string;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  requiresInitials: boolean;
  requiresSignature: boolean;
  questions?: CustomQuestion[];
  effectiveDate?: string;
  expiresAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAgreementVersion {
  id: string;
  tenantId: string;
  templateId: string;
  version: number;
  content: string;
  changeNotes?: string;
  createdBy?: string;
  createdAt: string;
}

export type SignatureMethod = "device" | "terminal" | "paper";

export interface QuestionResponse {
  questionId: string;
  question: string;
  response: string | number | boolean;
  answeredAt: string;
}

export interface ServiceAgreement {
  id: string;
  tenantId: string;
  checkInId?: string;
  customerId: string;
  petId?: string;
  templateId?: string;
  templateVersion?: number;
  agreementText: string;
  initials: Array<{ section: string; initials: string; timestamp: string }>;
  signature: string;
  signatureMethod?: SignatureMethod;
  signedBy: string;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  questionResponses?: QuestionResponse[];
  acknowledgedAt?: string;
  expiresAt?: string;
  isValid: boolean;
  invalidatedAt?: string;
  invalidatedBy?: string;
  invalidReason?: string;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
    version?: number;
  };
  checkIn?: {
    id: string;
    checkInTime: string;
    reservationId?: string;
  };
}

export interface CreateTemplateData {
  name: string;
  content: string;
  isDefault?: boolean;
  requiresInitials?: boolean;
  requiresSignature?: boolean;
  questions?: CustomQuestion[];
  effectiveDate?: string;
  expiresAt?: string;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  isActive?: boolean;
  changeNotes?: string;
}

export interface CreateAgreementData {
  checkInId?: string;
  customerId: string;
  petId?: string;
  templateId?: string;
  agreementText: string;
  initials?: Array<{ section: string; initials: string; timestamp: string }>;
  signature: string;
  signedBy: string;
  questionResponses?: QuestionResponse[];
  signatureMethod?: SignatureMethod;
  expiresAt?: string;
}

export interface CustomerAgreementStatus {
  hasValidAgreement: boolean;
  agreement: ServiceAgreement | null;
}

// API Functions

/**
 * Get all service agreement templates
 */
export const getAllTemplates = async (
  activeOnly = false
): Promise<ServiceAgreementTemplate[]> => {
  const params = activeOnly ? { active: "true" } : {};
  const response = await reservationApi.get(
    "/api/service-agreement-templates",
    {
      params,
    }
  );
  return response.data.data || [];
};

/**
 * Get a template by ID
 */
export const getTemplateById = async (
  id: string
): Promise<ServiceAgreementTemplate> => {
  const response = await reservationApi.get(
    `/api/service-agreement-templates/${id}`
  );
  return response.data.data;
};

/**
 * Get the default template
 */
export const getDefaultTemplate =
  async (): Promise<ServiceAgreementTemplate | null> => {
    try {
      const response = await reservationApi.get(
        "/api/service-agreement-templates/default"
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  };

/**
 * Create a new template
 */
export const createTemplate = async (
  data: CreateTemplateData
): Promise<ServiceAgreementTemplate> => {
  const response = await reservationApi.post(
    "/api/service-agreement-templates",
    data
  );
  return response.data.data;
};

/**
 * Update a template
 */
export const updateTemplate = async (
  id: string,
  data: UpdateTemplateData
): Promise<ServiceAgreementTemplate> => {
  const response = await reservationApi.put(
    `/api/service-agreement-templates/${id}`,
    data
  );
  return response.data.data;
};

/**
 * Delete a template
 */
export const deleteTemplate = async (id: string): Promise<void> => {
  await reservationApi.delete(`/api/service-agreement-templates/${id}`);
};

/**
 * Get version history for a template
 */
export const getTemplateVersions = async (
  templateId: string
): Promise<ServiceAgreementVersion[]> => {
  const response = await reservationApi.get(
    `/api/service-agreement-templates/${templateId}/versions`
  );
  return response.data.data;
};

/**
 * Get a specific version of a template
 */
export const getTemplateVersion = async (
  templateId: string,
  version: number
): Promise<ServiceAgreementVersion> => {
  const response = await reservationApi.get(
    `/api/service-agreement-templates/${templateId}/versions/${version}`
  );
  return response.data.data;
};

/**
 * Create a signed agreement
 */
export const createAgreement = async (
  data: CreateAgreementData
): Promise<ServiceAgreement> => {
  // Add browser info
  const enrichedData = {
    ...data,
    userAgent: navigator.userAgent,
  };
  const response = await reservationApi.post(
    "/api/service-agreements",
    enrichedData
  );
  return response.data.data;
};

/**
 * Get an agreement by ID
 */
export const getAgreementById = async (
  id: string
): Promise<ServiceAgreement> => {
  const response = await reservationApi.get(`/api/service-agreements/${id}`);
  return response.data.data;
};

/**
 * Get agreement by check-in ID
 */
export const getAgreementByCheckIn = async (
  checkInId: string
): Promise<ServiceAgreement | null> => {
  try {
    const response = await reservationApi.get(
      `/api/service-agreements/check-in/${checkInId}`
    );
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Get all signed agreements for the tenant
 */
export const getAllAgreements = async (options?: {
  valid?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ agreements: ServiceAgreement[]; total: number }> => {
  const params: any = {};
  if (options?.valid !== undefined) {
    params.valid = options.valid.toString();
  }
  if (options?.limit) {
    params.limit = options.limit;
  }
  if (options?.offset) {
    params.offset = options.offset;
  }
  if (options?.search) {
    params.search = options.search;
  }

  const response = await reservationApi.get("/api/service-agreements", {
    params,
  });
  return {
    agreements: response.data.data || [],
    total: response.data.total || 0,
  };
};

/**
 * Get all agreements for a customer
 */
export const getCustomerAgreements = async (
  customerId: string,
  options?: { valid?: boolean; limit?: number; offset?: number }
): Promise<{ agreements: ServiceAgreement[]; total: number }> => {
  const params: any = {};
  if (options?.valid !== undefined) {
    params.valid = options.valid.toString();
  }
  if (options?.limit) {
    params.limit = options.limit;
  }
  if (options?.offset) {
    params.offset = options.offset;
  }

  const response = await reservationApi.get(
    `/api/service-agreements/customer/${customerId}`,
    { params }
  );
  return {
    agreements: response.data.data,
    total: response.data.total,
  };
};

/**
 * Check if customer has a valid agreement
 */
export const checkCustomerAgreement = async (
  customerId: string
): Promise<CustomerAgreementStatus> => {
  const response = await reservationApi.get(
    `/api/service-agreements/customer/${customerId}/valid`
  );
  return response.data.data;
};

/**
 * Invalidate an agreement
 */
export const invalidateAgreement = async (
  id: string,
  reason: string
): Promise<ServiceAgreement> => {
  const response = await reservationApi.put(
    `/api/service-agreements/${id}/invalidate`,
    { reason }
  );
  return response.data.data;
};

// Export as default object for convenience
export default {
  // Templates
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateVersions,
  getTemplateVersion,

  // Agreements
  createAgreement,
  getAgreementById,
  getAgreementByCheckIn,
  getAllAgreements,
  getCustomerAgreements,
  checkCustomerAgreement,
  invalidateAgreement,
};
