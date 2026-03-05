import { useCallback } from 'react';
import config, { AppConfig } from '../config';

/**
 * Custom hook for accessing application configuration
 */
export function useConfig(): {
  config: AppConfig;
  isFeatureEnabled: (featureName: keyof AppConfig['features']) => boolean;
  getServiceUrl: (service: 'customer' | 'reservation') => string;
} {
  /**
   * Check if a feature is enabled
   */
  const isFeatureEnabled = useCallback(
    (featureName: keyof AppConfig['features']): boolean => {
      return config.features[featureName] === true;
    },
    []
  );
  
  /**
   * Get the URL for a service
   */
  const getServiceUrl = useCallback(
    (service: 'customer' | 'reservation'): string => {
      return service === 'customer'
        ? config.api.customerServiceUrl
        : config.api.reservationServiceUrl;
    },
    []
  );
  
  return {
    config,
    isFeatureEnabled,
    getServiceUrl
  };
}

export default useConfig;
