/**
 * Auto-initializes the tenant ID for Tailtown services.
 * 
 * This script is imported by index.js to ensure tenant ID is set before any API calls.
 * It detects the tenant from the subdomain (e.g., brangro.canicloud.com -> brangro)
 * or falls back to "dev" if no subdomain is present.
 */

const DEFAULT_TENANT_ID = 'dev';

function getTenantFromSubdomain() {
  try {
    const hostname = window.location.hostname;
    
    // Extract subdomain from hostname
    // Examples:
    //   brangro.canicloud.com -> brangro
    //   canicloud.com -> null (use default)
    //   localhost -> null (use default)
    const parts = hostname.split('.');
    
    // If hostname has 3+ parts (subdomain.domain.tld), extract subdomain
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting subdomain:', error);
    return null;
  }
}

function initTenantId() {
  try {
    // Check if we're on a super admin route - don't set tenant ID for super admin
    const pathname = window.location.pathname;
    const isSuperAdminRoute = pathname.startsWith('/super-admin') || pathname.startsWith('/admin/tenants');
    
    if (isSuperAdminRoute) {
      console.log('Super admin route detected. Skipping tenant ID initialization.');
      return;
    }
    
    // First, check if subdomain specifies a tenant
    const subdomainTenant = getTenantFromSubdomain();
    
    if (subdomainTenant) {
      console.log('Detected tenant from subdomain:', subdomainTenant);
      localStorage.setItem('tailtown_tenant_id', subdomainTenant);
      return;
    }
    
    // Otherwise, check localStorage
    const existingTenantId = 
      localStorage.getItem('tailtown_tenant_id') || 
      localStorage.getItem('tenantId');
    
    if (!existingTenantId) {
      console.log('No tenant ID found in localStorage. Setting default tenant ID:', DEFAULT_TENANT_ID);
      localStorage.setItem('tailtown_tenant_id', DEFAULT_TENANT_ID);
    } else {
      console.log('Found existing tenant ID:', existingTenantId);
    }
  } catch (error) {
    console.error('Error initializing tenant ID:', error);
  }
}

// Run immediately when imported
initTenantId();

export default initTenantId;
