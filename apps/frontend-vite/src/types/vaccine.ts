/**
 * Vaccine Requirement Types
 * Types for vaccine requirement management and compliance checking
 */

export interface VaccineRequirement {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  
  // Applicability
  petType?: 'DOG' | 'CAT' | null; // null = all types
  serviceType?: 'BOARDING' | 'DAYCARE' | 'GROOMING' | null; // null = all services
  
  // Requirements
  isRequired: boolean;
  validityPeriodMonths?: number;
  reminderDaysBefore?: number;
  
  // Status
  isActive: boolean;
  displayOrder: number;
  
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface VaccineComplianceResult {
  requirementId: string;
  vaccineName: string;
  isRequired: boolean;
  isCompliant: boolean;
  status: 'CURRENT' | 'EXPIRED' | 'EXPIRING_SOON' | 'MISSING';
  expirationDate?: string;
  daysUntilExpiration?: number;
  validityPeriodMonths?: number;
}

export interface PetVaccineCompliance {
  petId: string;
  petName: string;
  petType: string;
  isFullyCompliant: boolean;
  complianceResults: VaccineComplianceResult[];
  missingRequired: string[];
  summary: {
    total: number;
    required: number;
    compliant: number;
    missing: number;
    expired: number;
    expiringSoon: number;
  };
}

export interface CreateVaccineRequirementRequest {
  name: string;
  description?: string;
  petType?: 'DOG' | 'CAT' | null;
  serviceType?: 'BOARDING' | 'DAYCARE' | 'GROOMING' | null;
  isRequired?: boolean;
  validityPeriodMonths?: number;
  reminderDaysBefore?: number;
  isActive?: boolean;
  displayOrder?: number;
  notes?: string;
}

export interface UpdateVaccineRequirementRequest {
  name?: string;
  description?: string;
  petType?: 'DOG' | 'CAT' | null;
  serviceType?: 'BOARDING' | 'DAYCARE' | 'GROOMING' | null;
  isRequired?: boolean;
  validityPeriodMonths?: number;
  reminderDaysBefore?: number;
  isActive?: boolean;
  displayOrder?: number;
  notes?: string;
}

export interface VaccineRequirementFilters {
  petType?: string;
  serviceType?: string;
  isActive?: boolean;
}

export const PET_TYPES = ['DOG', 'CAT'] as const;
export const SERVICE_TYPES = ['BOARDING', 'DAYCARE', 'GROOMING'] as const;

export const VACCINE_STATUS_COLORS = {
  CURRENT: 'success',
  EXPIRED: 'error',
  EXPIRING_SOON: 'warning',
  MISSING: 'default',
} as const;

export const VACCINE_STATUS_LABELS = {
  CURRENT: 'Current',
  EXPIRED: 'Expired',
  EXPIRING_SOON: 'Expiring Soon',
  MISSING: 'Missing',
} as const;
