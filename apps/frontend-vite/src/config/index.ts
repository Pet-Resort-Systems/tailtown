import { AppConfig } from './types';
import developmentConfig from './development';
import productionConfig from './production';

/**
 * Get the current environment
 */
const getEnvironment = (): string => {
  return process.env.NODE_ENV || 'development';
};

/**
 * Get the appropriate configuration for the current environment
 */
const getConfig = (): AppConfig => {
  const env = getEnvironment();
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'development':
    default:
      return developmentConfig;
  }
};

/**
 * Application configuration
 */
const config: AppConfig = getConfig();

// Export the configuration
export default config;

// Export types
export * from './types';

// Helper function to get service URL
export const getServiceUrl = (service: 'customer' | 'reservation'): string => {
  return service === 'customer' 
    ? config.api.customerServiceUrl 
    : config.api.reservationServiceUrl;
};

// Helper function to get tenant ID
export const getTenantId = (): string | undefined => {
  try {
    const fromStorage =
      localStorage.getItem('tailtown_tenant_id') || localStorage.getItem('tenantId');
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch (_) {
    // Access to localStorage might fail in non-browser environments
  }
  
  return config.api.defaultTenantId;
};

// Helper function to get tenant timezone
export const getTenantTimezone = (): string => {
  try {
    const timezone = localStorage.getItem('tenant_timezone');
    if (timezone && timezone.trim()) return timezone.trim();
  } catch (_) {
    // Access to localStorage might fail in non-browser environments
  }
  
  // Default to America/Denver (Mountain Time) if not set
  return 'America/Denver';
};

// Helper function to format a date according to the configured format
export const formatDate = (date: Date | string, format?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  };
  
  return dateObj.toLocaleDateString('en-US', options);
};

// Helper function to format a time according to the configured format
export const formatTime = (date: Date | string, format?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  };
  
  return dateObj.toLocaleTimeString('en-US', options);
};

// Helper function to format a date and time according to the configured format
export const formatDateTime = (date: Date | string, format?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  };
  
  return dateObj.toLocaleString('en-US', options);
};
