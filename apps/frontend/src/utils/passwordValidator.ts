/**
 * Frontend password validation utility
 * Matches backend validation requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password strength (matches backend requirements)
 * @param password - Password to validate
 * @returns Validation result with errors
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length (prevent DoS)
  if (password && password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  }

  // Check for special character
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Should not contain sequential characters (abc, 123, etc.)');
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Should not contain repeated characters (aaa, 111, etc.)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get password strength indicator
 * @param password - Password to check
 * @returns Strength level and color
 */
export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  color: string;
  label: string;
} {
  if (!password) {
    return { strength: 'weak', color: '#d32f2f', label: 'Too weak' };
  }

  let score = 0;
  
  // Length bonus
  if (password.length >= 12) score += 2;
  else if (password.length >= 10) score += 1;
  
  // Complexity bonus
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  // Multiple special characters
  const specialCharCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;
  if (specialCharCount >= 2) score += 1;
  
  // Determine strength
  if (score >= 7) {
    return { strength: 'strong', color: '#2e7d32', label: 'Strong' };
  } else if (score >= 5) {
    return { strength: 'medium', color: '#ed6c02', label: 'Medium' };
  } else {
    return { strength: 'weak', color: '#d32f2f', label: 'Weak' };
  }
}
