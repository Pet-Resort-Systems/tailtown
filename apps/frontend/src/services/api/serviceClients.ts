import { createApiClient } from './apiClient';
import config from '../../config';

/**
 * Customer Service API client
 * Handles customer, pet, and staff-related operations
 */
export const customerApiClient = createApiClient(
  config.api.customerServiceUrl
);

/**
 * Reservation Service API client
 * Handles reservation and resource operations
 */
export const reservationApiClient = createApiClient(
  config.api.reservationServiceUrl
);

/**
 * Export for backward compatibility
 * @deprecated Use specific service clients instead
 */
export const legacyApi = customerApiClient;

export default {
  customer: customerApiClient,
  reservation: reservationApiClient
};
