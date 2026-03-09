import { AppConfig } from './types';
import developmentConfig from './development';

/**
 * Test environment configuration
 * Extends development config with test-specific overrides
 */
const testConfig: AppConfig = {
  ...developmentConfig,
  api: {
    ...developmentConfig.api,
    // Use mock URLs for testing
    customerServiceUrl: 'http://localhost:9004',
    reservationServiceUrl: 'http://localhost:9003',
    // Always include a test tenant ID
    defaultTenantId: 'test',
  },
  features: {
    ...developmentConfig.features,
    // Enable mock API for tests
    mockApi: true,
    useNewCalendarComponents: true
  }
};

export default testConfig;
