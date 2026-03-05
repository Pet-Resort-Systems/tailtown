import { AppConfig } from './types';
import developmentConfig from './development';

/**
 * Production environment configuration
 * Extends development config with production-specific overrides
 */
const productionConfig: AppConfig = {
  ...developmentConfig,
  api: {
    ...developmentConfig.api,
    // Use the actual production URLs
    customerServiceUrl: process.env.REACT_APP_API_URL || 'https://api.tailtown.com',
    reservationServiceUrl: process.env.REACT_APP_RESERVATION_API_URL || 'https://api.tailtown.com',
    // No default tenant ID in production
    defaultTenantId: '',
  },
  features: {
    ...developmentConfig.features,
    // Disable development features in production
    showDebugPanel: false,
    mockApi: false,
    useNewCalendarComponents: true
  }
};

export default productionConfig;
