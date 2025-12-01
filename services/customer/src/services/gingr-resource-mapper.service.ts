/**
 * Gingr Resource Mapper Service
 * Maps Gingr lodging/kennel data to Tailtown resources
 *
 * Based on Gingr's lodging system:
 * - Area: "A. Indoor", "B. Outdoor", etc.
 * - Lodging Label: "A 02", "A 01", etc.
 *
 * Resource Type to Service Mapping (Nov 2025):
 * - JUNIOR_KENNEL, QUEEN_KENNEL → "Boarding | Indoor Suite"
 * - KING_KENNEL → "Boarding | King Suite"
 * - VIP_ROOM → "Boarding | VIP Suite"
 * - CAT_CONDO → "Boarding | Cat Cabana"
 * - DAY_CAMP_FULL → "Day Camp | Full Day"
 * - DAY_CAMP_HALF → "Day Camp | Half Day"
 */

// Use native fetch (Node 18+) instead of node-fetch

interface ResourceCache {
  [gingrLodging: string]: string; // Gingr lodging → Tailtown resource ID
}

const resourceCache: ResourceCache = {};

/**
 * Extract lodging/kennel from Gingr reservation data
 *
 * TODO: Update field names based on actual Gingr API structure
 * Possible field names: lodging_id, lodging_label, lodging, room, kennel
 */
export function extractGingrLodging(reservation: any): string | null {
  // Check for nested structures first (lodging/room as objects)
  if (reservation.lodging && typeof reservation.lodging === "object") {
    return reservation.lodging.label || reservation.lodging.id || null;
  }

  if (reservation.room && typeof reservation.room === "object") {
    return reservation.room.label || reservation.room.id || null;
  }

  // Try multiple possible field names (string values)
  const lodging =
    reservation.lodging_label ||
    reservation.lodging_id ||
    (typeof reservation.lodging === "string" ? reservation.lodging : null) ||
    reservation.room_label ||
    reservation.room_id ||
    (typeof reservation.room === "string" ? reservation.room : null) ||
    reservation.kennel_label ||
    reservation.kennel_id ||
    reservation.kennel ||
    reservation.suite_label ||
    reservation.suite_id ||
    null;

  return lodging;
}

/**
 * Normalize lodging names for consistency
 * Examples:
 *   "A 02" → "A02"
 *   "A. Indoor - A 02" → "A02"
 *   "Suite A02" → "A02"
 */
function normalizeLodgingName(gingrLodging: string): string {
  if (!gingrLodging) return "";

  // Remove common prefixes and extra spaces
  let normalized = gingrLodging
    .replace(/^(Suite|Room|Kennel|Lodging)\s+/i, "")
    .replace(/^[A-Z]\.\s*\w+\s*-\s*/i, "") // Remove "A. Indoor - "
    .trim();

  // Remove spaces between letter and number: "A 02" → "A02"
  normalized = normalized.replace(/^([A-Z])\s+(\d+)$/, "$1$2");

  // Ensure two-digit format: "A2" → "A02"
  const match = normalized.match(/^([A-Z])(\d+)$/);
  if (match) {
    const letter = match[1];
    const number = match[2].padStart(2, "0");
    normalized = `${letter}${number}`;
  }

  return normalized;
}

/**
 * Resource type to service name mapping
 * Matches frontend/src/config/resource-service-mapping.ts
 */
const RESOURCE_SERVICE_MAP: Record<string, string> = {
  JUNIOR_KENNEL: "Boarding | Indoor Suite",
  QUEEN_KENNEL: "Boarding | Indoor Suite",
  KING_KENNEL: "Boarding | King Suite",
  VIP_ROOM: "Boarding | VIP Suite",
  CAT_CONDO: "Boarding | Cat Cabana",
  DAY_CAMP_FULL: "Day Camp | Full Day",
  DAY_CAMP_HALF: "Day Camp | Half Day",
  // Legacy types (fallback)
  STANDARD_SUITE: "Boarding | Indoor Suite",
  STANDARD_PLUS_SUITE: "Boarding | Indoor Suite",
  VIP_SUITE: "Boarding | VIP Suite",
};

/**
 * Determine resource type from lodging name
 * Updated to use new resource types (JUNIOR_KENNEL, QUEEN_KENNEL, KING_KENNEL, etc.)
 */
function determineResourceType(lodgingName: string): string {
  const name = lodgingName.toUpperCase();

  // Check for VIP indicators
  if (
    name.includes("VIP") ||
    name.startsWith("V") ||
    name.includes("PREMIUM")
  ) {
    return "VIP_ROOM";
  }

  // Check for Cat indicators
  if (
    name.includes("CAT") ||
    name.includes("FELINE") ||
    name.includes("CONDO")
  ) {
    return "CAT_CONDO";
  }

  // Check for Day Camp indicators
  if (name.includes("DAY") || name.includes("CAMP")) {
    if (name.includes("HALF")) {
      return "DAY_CAMP_HALF";
    }
    return "DAY_CAMP_FULL";
  }

  // Check for King indicators (suffix K or contains KING)
  if (name.endsWith("K") || name.includes("KING") || name.includes("LARGE")) {
    return "KING_KENNEL";
  }

  // Check for Queen indicators (suffix Q or contains QUEEN)
  if (name.endsWith("Q") || name.includes("QUEEN") || name.includes("MEDIUM")) {
    return "QUEEN_KENNEL";
  }

  // Check for Junior indicators (suffix R or contains JUNIOR/SMALL)
  if (name.endsWith("R") || name.includes("JUNIOR") || name.includes("SMALL")) {
    return "JUNIOR_KENNEL";
  }

  // Default to Junior kennel for standard boarding
  return "JUNIOR_KENNEL";
}

/**
 * Get service name for a resource type
 * Used to auto-select the correct service when syncing reservations
 */
export function getServiceNameForResourceType(resourceType: string): string {
  return RESOURCE_SERVICE_MAP[resourceType] || "Boarding | Indoor Suite";
}

/**
 * Find or create a Tailtown resource matching the Gingr lodging
 */
export async function findOrCreateResource(
  gingrLodging: string,
  reservationServiceUrl: string = "http://localhost:4003"
): Promise<{ id: string; name: string }> {
  if (!gingrLodging) {
    throw new Error("No lodging specified");
  }

  // Normalize the lodging name
  const normalizedName = normalizeLodgingName(gingrLodging);

  if (!normalizedName) {
    throw new Error(`Could not normalize lodging: ${gingrLodging}`);
  }

  // Check cache first
  if (resourceCache[normalizedName]) {
    return {
      id: resourceCache[normalizedName] as string,
      name: normalizedName,
    } as { id: string; name: string };
  }

  try {
    // Try to find existing resource by name
    const searchResponse = await fetch(
      `${reservationServiceUrl}/api/resources?limit=1000`,
      { headers: { "x-tenant-id": "dev" } }
    );

    const searchData = (await searchResponse.json()) as any;
    const resources = searchData.data?.resources || [];

    // Look for exact match
    const existingResource = resources.find(
      (r: any) => r.name === normalizedName
    );

    if (existingResource) {
      resourceCache[normalizedName] = existingResource.id;
      console.log(
        `[Resource Mapper] Found existing resource: ${normalizedName} (${existingResource.id})`
      );
      return existingResource;
    }

    // Resource doesn't exist - create it
    console.log(
      `[Resource Mapper] Creating new resource: ${normalizedName} (from Gingr: "${gingrLodging}")`
    );

    const createResponse = await fetch(
      `${reservationServiceUrl}/api/resources`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": "dev",
        },
        body: JSON.stringify({
          name: normalizedName,
          type: determineResourceType(normalizedName),
          capacity: 1,
          isActive: true,
          tenantId: "dev",
          description: `Imported from Gingr: ${gingrLodging}`,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create resource: ${errorText}`);
    }

    const newResource = (await createResponse.json()) as any;
    resourceCache[normalizedName] = newResource.id;

    console.log(
      `[Resource Mapper] ✅ Created resource: ${normalizedName} (${newResource.id})`
    );

    return newResource;
  } catch (error: any) {
    console.error(
      `[Resource Mapper] Error mapping lodging "${gingrLodging}":`,
      error.message
    );
    throw error;
  }
}

/**
 * Clear the resource cache (useful for testing)
 */
export function clearResourceCache(): void {
  Object.keys(resourceCache).forEach((key) => delete resourceCache[key]);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: Object.keys(resourceCache).length,
    entries: Object.keys(resourceCache),
  };
}

/**
 * Get all supported resource types
 */
export function getSupportedResourceTypes(): string[] {
  return Object.keys(RESOURCE_SERVICE_MAP);
}

/**
 * Check if a resource type is valid
 */
export function isValidResourceType(type: string): boolean {
  return type in RESOURCE_SERVICE_MAP;
}
