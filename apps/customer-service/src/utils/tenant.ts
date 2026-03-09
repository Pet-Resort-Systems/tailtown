/**
 * Tenant Utility Functions
 * 
 * Provides safe tenant ID handling with environment-aware fallbacks
 */

/**
 * Get tenant ID with safe fallback for non-production environments
 * 
 * In production: Throws error if tenantId is missing
 * In development/test: Falls back to 'dev' for convenience
 * 
 * @param tenantId - The tenant ID from request
 * @returns Valid tenant ID
 * @throws Error in production if tenantId is missing
 */
export function getTenantId(tenantId: string | undefined): string {
  // In production, require tenant ID
  if (process.env.NODE_ENV === 'production') {
    if (!tenantId) {
      throw new Error('Tenant ID is required in production');
    }
    return tenantId;
  }
  
  // In development/test, allow fallback for convenience
  return tenantId || 'dev';
}

/**
 * Validate tenant ID exists
 * Throws error if missing regardless of environment
 * 
 * @param tenantId - The tenant ID to validate
 * @throws Error if tenantId is missing
 */
export function requireTenantId(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }
  return tenantId;
}
