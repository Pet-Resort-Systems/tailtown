/**
 * Vaccine Name Normalization Utilities
 * 
 * Provides consistent vaccine name handling across the application.
 * All vaccine keys should be lowercase to prevent lookup failures.
 */

// Standard vaccine names (lowercase only)
export const STANDARD_VACCINE_NAMES = [
  'rabies',
  'dhpp',
  'bordetella',
  'fvrcp',
  'influenza',
  'lepto'
] as const;

export type VaccineName = typeof STANDARD_VACCINE_NAMES[number];

/**
 * Normalize a vaccine description to a standard lowercase vaccine name
 * @param description - The vaccine description from medical records
 * @returns Lowercase vaccine name or null if not recognized
 */
export function normalizeVaccineName(description: string): VaccineName | null {
  const desc = description.toLowerCase().trim();
  
  if (desc.includes('rabies')) return 'rabies';
  if (desc.includes('dhpp')) return 'dhpp';
  if (desc.includes('bordetella') || desc.includes('bordatella')) return 'bordetella'; // Handle common typo
  if (desc.includes('fvrcp')) return 'fvrcp';
  if (desc.includes('influenza')) return 'influenza';
  if (desc.includes('lepto')) return 'lepto';
  
  return null;
}

/**
 * Validate that all keys in an object are lowercase vaccine names
 * @param data - Object with vaccine keys
 * @returns Validation result with errors if any
 */
export function validateVaccineKeys(data: Record<string, any>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  Object.keys(data).forEach(key => {
    // Check if lowercase
    if (key !== key.toLowerCase()) {
      errors.push(`Key "${key}" is not lowercase (should be "${key.toLowerCase()}")`);
    }
    
    // Check if it's a standard vaccine name
    if (!STANDARD_VACCINE_NAMES.includes(key as VaccineName)) {
      errors.push(`Key "${key}" is not a recognized vaccine name`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convert any vaccine data object to use lowercase keys
 * @param data - Object with potentially mixed-case vaccine keys
 * @returns New object with lowercase keys
 */
export function normalizVaccineKeys<T>(data: Record<string, T>): Record<string, T> {
  const normalized: Record<string, T> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    normalized[key.toLowerCase()] = value;
  });
  
  return normalized;
}

/**
 * Validate and normalize vaccination status data
 * Ensures all keys are lowercase and match standard vaccine names
 */
export function normalizeVaccinationStatus(
  vaccinationStatus: any,
  vaccineExpirations: any
): {
  vaccinationStatus: Record<string, any>;
  vaccineExpirations: Record<string, any>;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Normalize keys to lowercase
  const normalizedStatus = normalizVaccineKeys(vaccinationStatus || {});
  const normalizedExpirations = normalizVaccineKeys(vaccineExpirations || {});
  
  // Validate keys
  const statusValidation = validateVaccineKeys(normalizedStatus);
  const expirationValidation = validateVaccineKeys(normalizedExpirations);
  
  warnings.push(...statusValidation.errors, ...expirationValidation.errors);
  
  // Check for mismatched keys
  const statusKeys = Object.keys(normalizedStatus);
  const expirationKeys = Object.keys(normalizedExpirations);
  
  statusKeys.forEach(key => {
    if (!expirationKeys.includes(key)) {
      warnings.push(`Vaccine "${key}" has status but no expiration date`);
    }
  });
  
  expirationKeys.forEach(key => {
    if (!statusKeys.includes(key)) {
      warnings.push(`Vaccine "${key}" has expiration but no status`);
    }
  });
  
  return {
    vaccinationStatus: normalizedStatus,
    vaccineExpirations: normalizedExpirations,
    warnings
  };
}

/**
 * Get required vaccines for a pet type
 * @param petType - 'DOG' or 'CAT'
 * @returns Array of required vaccine names (lowercase)
 */
export function getRequiredVaccines(petType: string): VaccineName[] {
  switch (petType?.toUpperCase()) {
    case 'DOG':
      return ['rabies', 'dhpp', 'bordetella'];
    case 'CAT':
      return ['rabies', 'fvrcp'];
    default:
      return ['rabies'];
  }
}
