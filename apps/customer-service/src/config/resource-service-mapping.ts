/**
 * Resource Type to Service Mapping Configuration
 *
 * This configuration defines which service is automatically selected
 * when a resource of a given type is chosen for a reservation.
 *
 * The price comes from the Resource itself, not the Service.
 * The Service is used for categorization and add-on eligibility.
 */

export interface ResourceServiceMapping {
  resourceType: string;
  serviceName: string;
  serviceCategory: "BOARDING" | "DAYCARE" | "GROOMING" | "TRAINING" | "OTHER";
  description: string;
}

/**
 * Maps resource types to their corresponding service names
 * When a resource is selected, the service is auto-selected and disabled
 */
export const RESOURCE_SERVICE_MAPPINGS: ResourceServiceMapping[] = [
  // Dog Boarding - Indoor Suite (Junior & Queen kennels)
  {
    resourceType: "JUNIOR_KENNEL",
    serviceName: "Indoor Suite",
    serviceCategory: "BOARDING",
    description: "Standard indoor boarding for small to medium dogs",
  },
  {
    resourceType: "QUEEN_KENNEL",
    serviceName: "Indoor Suite",
    serviceCategory: "BOARDING",
    description: "Standard indoor boarding for medium to large dogs",
  },

  // Dog Boarding - King Suite
  {
    resourceType: "KING_KENNEL",
    serviceName: "King Suite",
    serviceCategory: "BOARDING",
    description: "Premium boarding with extra space for large dogs",
  },

  // Dog Boarding - VIP Suite
  {
    resourceType: "VIP_ROOM",
    serviceName: "VIP Suite",
    serviceCategory: "BOARDING",
    description: "Luxury private room with premium amenities",
  },

  // Cat Boarding
  {
    resourceType: "CAT_CONDO",
    serviceName: "Cat Boarding",
    serviceCategory: "BOARDING",
    description: "Comfortable condo for feline guests",
  },

  // Daycare
  {
    resourceType: "DAY_CAMP_FULL",
    serviceName: "Day Camp Full Day",
    serviceCategory: "DAYCARE",
    description: "Full day of supervised play and socialization",
  },
  {
    resourceType: "DAY_CAMP_HALF",
    serviceName: "Day Camp Half Day",
    serviceCategory: "DAYCARE",
    description: "Half day of supervised play and socialization",
  },
];

/**
 * Get the service name for a given resource type
 */
export function getServiceNameForResourceType(
  resourceType: string
): string | null {
  const mapping = RESOURCE_SERVICE_MAPPINGS.find(
    (m) => m.resourceType === resourceType
  );
  return mapping?.serviceName || null;
}

/**
 * Get the service category for a given resource type
 */
export function getServiceCategoryForResourceType(
  resourceType: string
): string | null {
  const mapping = RESOURCE_SERVICE_MAPPINGS.find(
    (m) => m.resourceType === resourceType
  );
  return mapping?.serviceCategory || null;
}

/**
 * Check if a resource type should auto-select a service
 */
export function shouldAutoSelectService(resourceType: string): boolean {
  return RESOURCE_SERVICE_MAPPINGS.some((m) => m.resourceType === resourceType);
}

/**
 * Get all resource types that map to a specific service
 */
export function getResourceTypesForService(serviceName: string): string[] {
  return RESOURCE_SERVICE_MAPPINGS.filter(
    (m) => m.serviceName === serviceName
  ).map((m) => m.resourceType);
}
