/**
 * Vaccination Service for Tailtown Pet Resort
 * 
 * Defines vaccination types, requirements, and utilities for managing pet vaccinations
 */

export interface VaccinationType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  frequency: string; // e.g., "Annual", "Triennial", "Semi-Annual"
  typicalDuration: number; // in months
}

export interface VaccinationRecord {
  type: string;
  status: 'CURRENT' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
  lastGiven?: string;
  expiration?: string;
  nextDue?: string;
  notes?: string;
  lastChecked?: string;
}

export interface PetVaccinationStatus {
  [vaccineType: string]: VaccinationRecord;
}

// Standard vaccination types for pet resorts
export const VACCINATION_TYPES: VaccinationType[] = [
  {
    id: 'rabies',
    name: 'Rabies',
    description: 'Rabies vaccination (legally required)',
    required: true,
    frequency: 'Triennial',
    typicalDuration: 36
  },
  {
    id: 'dhpp',
    name: 'DHPP',
    description: 'Distemper, Hepatitis, Parainfluenza, Parvovirus combination',
    required: true,
    frequency: 'Annual',
    typicalDuration: 12
  },
  {
    id: 'bordetella',
    name: 'Bordetella (Kennel Cough)',
    description: 'Kennel cough vaccination',
    required: true,
    frequency: 'Semi-Annual',
    typicalDuration: 6
  },
  {
    id: 'canine_influenza',
    name: 'Canine Influenza',
    description: 'Dog flu vaccination',
    required: false,
    frequency: 'Annual',
    typicalDuration: 12
  },
  {
    id: 'fvrcp',
    name: 'FVRCP',
    description: 'Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia',
    required: true,
    frequency: 'Annual',
    typicalDuration: 12
  },
  {
    id: 'feline_leukemia',
    name: 'Feline Leukemia',
    description: 'Feline leukemia vaccination',
    required: false,
    frequency: 'Annual',
    typicalDuration: 12
  }
];

/**
 * Get vaccination types by pet type
 */
export const getVaccinationTypesByPetType = (petType: 'DOG' | 'CAT' | 'OTHER'): VaccinationType[] => {
  switch (petType) {
    case 'DOG':
      return VACCINATION_TYPES.filter(v => 
        ['rabies', 'dhpp', 'bordetella', 'canine_influenza'].includes(v.id)
      );
    case 'CAT':
      return VACCINATION_TYPES.filter(v => 
        ['rabies', 'fvrcp', 'feline_leukemia'].includes(v.id)
      );
    default:
      return VACCINATION_TYPES.filter(v => v.required);
  }
};

/**
 * Calculate vaccination status based on expiration date
 */
export const calculateVaccinationStatus = (expirationDate?: string): 'CURRENT' | 'EXPIRED' | 'PENDING' => {
  if (!expirationDate) return 'PENDING';
  
  const now = new Date();
  const expiration = new Date(expirationDate);
  
  if (expiration > now) {
    return 'CURRENT';
  } else {
    return 'EXPIRED';
  }
};

/**
 * Get next due date for vaccination
 */
export const getNextDueDate = (lastGiven?: string, frequencyMonths?: number): string | undefined => {
  if (!lastGiven || !frequencyMonths) return undefined;
  
  const lastDate = new Date(lastGiven);
  lastDate.setMonth(lastDate.getMonth() + frequencyMonths);
  return lastDate.toISOString();
};

/**
 * Check if pet is compliant with required vaccinations
 */
export const isPetCompliant = (vaccinationStatus: PetVaccinationStatus, petType: 'DOG' | 'CAT' | 'OTHER'): boolean => {
  const requiredVaccines = getVaccinationTypesByPetType(petType).filter(v => v.required);
  
  return requiredVaccines.every(vaccine => {
    const record = vaccinationStatus[vaccine.id];
    return record && record.status === 'CURRENT';
  });
};

/**
 * Get overall vaccination compliance status
 */
export const getComplianceStatus = (vaccinationStatus: PetVaccinationStatus, petType: 'DOG' | 'CAT' | 'OTHER'): {
  compliant: boolean;
  expiredCount: number;
  missingCount: number;
  totalCount: number;
} => {
  const requiredVaccines = getVaccinationTypesByPetType(petType).filter(v => v.required);
  
  let expiredCount = 0;
  let missingCount = 0;
  
  requiredVaccines.forEach(vaccine => {
    const record = vaccinationStatus[vaccine.id];
    if (!record || record.status === 'PENDING') {
      missingCount++;
    } else if (record.status === 'EXPIRED') {
      expiredCount++;
    }
  });
  
  return {
    compliant: expiredCount === 0 && missingCount === 0,
    expiredCount,
    missingCount,
    totalCount: requiredVaccines.length
  };
};

/**
 * Format vaccination status for display
 */
export const formatVaccinationStatus = (status: string): string => {
  switch (status) {
    case 'CURRENT':
      return 'Current';
    case 'EXPIRED':
      return 'Expired';
    case 'PENDING':
      return 'Due';
    case 'NOT_REQUIRED':
      return 'Not Required';
    default:
      return 'Unknown';
  }
};

/**
 * Get color for vaccination status
 */
export const getVaccinationStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'CURRENT':
      return 'success';
    case 'EXPIRED':
      return 'error';
    case 'PENDING':
      return 'warning';
    case 'NOT_REQUIRED':
      return 'default';
    default:
      return 'default';
  }
};
