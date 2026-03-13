/**
 * Utility to enrich reservations with full pet and customer data
 *
 * The reservation service returns minimal data (just IDs for pets and customers).
 * This utility fetches the full pet and customer details from the customer service
 * and enriches the reservation objects with this data.
 */

import { customerApi } from "../services/api";
import { logger } from "./logger";

interface MinimalReservation {
  id: string;
  petId?: string;
  customerId?: string;
  [key: string]: any;
}

interface EnrichedReservation extends MinimalReservation {
  pet?: {
    id: string;
    name: string;
    playgroupCompatibility?: string;
    [key: string]: any;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    [key: string]: any;
  };
}

/**
 * Enrich reservations with full pet and customer data
 *
 * @param reservations - Array of reservations with petId and customerId
 * @returns Array of reservations with full pet and customer objects
 */
export const enrichReservationsWithPetData = async (
  reservations: MinimalReservation[]
): Promise<EnrichedReservation[]> => {
  if (!Array.isArray(reservations) || reservations.length === 0) {
    return reservations as EnrichedReservation[];
  }

  // Collect unique pet and customer IDs
  const petIds = new Set<string>();
  const customerIds = new Set<string>();

  reservations.forEach((res) => {
    if (res.petId) petIds.add(res.petId);
    if (res.customerId) customerIds.add(res.customerId);
  });

  // Fetch all pets and customers in parallel
  const [petsMap, customersMap] = await Promise.all([
    fetchPetsMap(Array.from(petIds)),
    fetchCustomersMap(Array.from(customerIds)),
  ]);

  // Enrich reservations with pet and customer data
  return reservations.map((reservation) => ({
    ...reservation,
    pet: reservation.petId ? petsMap.get(reservation.petId) : undefined,
    customer: reservation.customerId
      ? customersMap.get(reservation.customerId)
      : undefined,
  }));
};

/**
 * Fetch multiple pets and return as a Map for quick lookup
 */
async function fetchPetsMap(petIds: string[]): Promise<Map<string, any>> {
  const petsMap = new Map();

  if (petIds.length === 0) return petsMap;

  try {
    // Fetch pets in batches to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < petIds.length; i += batchSize) {
      const batch = petIds.slice(i, i + batchSize);

      // Fetch each pet (could be optimized with a batch endpoint if available)
      const petPromises = batch.map(async (petId) => {
        try {
          const response = await customerApi.get(`/api/pets/${petId}`);
          const pet = response.data?.data || response.data;
          if (pet) {
            petsMap.set(petId, pet);
          }
        } catch (error) {
          logger.warn(`Failed to fetch pet ${petId}:`, error);
        }
      });

      await Promise.all(petPromises);
    }
  } catch (error) {
    logger.error("Error fetching pets:", error);
  }

  return petsMap;
}

/**
 * Fetch multiple customers and return as a Map for quick lookup
 */
async function fetchCustomersMap(
  customerIds: string[]
): Promise<Map<string, any>> {
  const customersMap = new Map();

  if (customerIds.length === 0) return customersMap;

  try {
    // Fetch customers in batches
    const batchSize = 50;
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize);

      // Fetch each customer (could be optimized with a batch endpoint if available)
      const customerPromises = batch.map(async (customerId) => {
        try {
          const response = await customerApi.get(
            `/api/customers/${customerId}`
          );
          const customer = response.data?.data || response.data;
          if (customer) {
            customersMap.set(customerId, customer);
          }
        } catch (error) {
          logger.warn(`Failed to fetch customer ${customerId}:`, error);
        }
      });

      await Promise.all(customerPromises);
    }
  } catch (error) {
    logger.error("Error fetching customers:", error);
  }

  return customersMap;
}
