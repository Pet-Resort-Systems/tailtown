/**
 * Password validation utility
 * Enforces strong password requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Common weak passwords to reject
 */
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
  'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael',
  'football', 'admin', 'admin123', 'welcome', 'login', 'test123'
];

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with errors and strength rating
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

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
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more unique password');
  }

  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Password should not contain sequential characters');
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
  }

  // Calculate strength
  if (errors.length === 0) {
    let strengthScore = 0;
    
    // Length bonus
    if (password.length >= 12) strengthScore += 2;
    else if (password.length >= 10) strengthScore += 1;
    
    // Complexity bonus
    if (/[A-Z]/.test(password)) strengthScore += 1;
    if (/[a-z]/.test(password)) strengthScore += 1;
    if (/[0-9]/.test(password)) strengthScore += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strengthScore += 1;
    
    // Multiple special characters
    const specialCharCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;
    if (specialCharCount >= 2) strengthScore += 1;
    
    // Determine strength
    if (strengthScore >= 7) strength = 'strong';
    else if (strengthScore >= 5) strength = 'medium';
    else strength = 'weak';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Validate password and throw error if invalid
 * @param password - Password to validate
 * @throws Error if password is invalid
 */
export function validatePasswordOrThrow(password: string): void {
  const result = validatePassword(password);
  if (!result.isValid) {
    throw new Error(`Password validation failed: ${result.errors.join(', ')}`);
  }
}
