/**
 * Sorting Utilities
 * Centralized sorting functions to eliminate code duplication
 */

/**
 * Sort kennels/suites by room letter and number (A01, A02, A03, ..., B01, B02, etc.)
 * Handles formats like: A01, B12, C03, A06R, B08Q, C20K, Cat Condo 3, etc.
 *
 * @param items - Array of items with a 'name' property
 * @returns Sorted array
 */
export function sortByRoomAndNumber<T extends { name?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';

    // Extract room letter (A, B, C, etc.) and number
    // Handles formats: A01, A06R, B08Q, C20K (letter + digits + optional suffix)
    const matchA = nameA.match(/^([A-Z])(\d+)/);
    const matchB = nameB.match(/^([A-Z])(\d+)/);

    if (matchA && matchB) {
      const [, roomA, numA] = matchA;
      const [, roomB, numB] = matchB;

      // First sort by room letter
      if (roomA !== roomB) {
        return roomA.localeCompare(roomB);
      }

      // Then sort by number within the same room
      return Number(numA) - Number(numB);
    }

    // Handle "Cat Condo X" format - extract number and sort numerically
    const catCondoA = nameA.match(/Cat Condo (\d+)/i);
    const catCondoB = nameB.match(/Cat Condo (\d+)/i);

    if (catCondoA && catCondoB) {
      return Number(catCondoA[1]) - Number(catCondoB[1]);
    }

    // Put Cat Condos after regular kennels
    if (catCondoA && !catCondoB) return 1;
    if (!catCondoA && catCondoB) return -1;

    // Fallback to string comparison if pattern doesn't match
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sort items by suite number
 * Extracts numeric value from suiteNumber or name property
 *
 * @param items - Array of items with suiteNumber or name property
 * @returns Sorted array
 */
export function sortBySuiteNumber<
  T extends { suiteNumber?: string | number; name?: string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const numA = a.suiteNumber || a.name?.replace(/\D/g, '') || '0';
    const numB = b.suiteNumber || b.name?.replace(/\D/g, '') || '0';
    return Number(numA) - Number(numB);
  });
}

/**
 * Sort items alphabetically by name
 *
 * @param items - Array of items with a 'name' property
 * @returns Sorted array
 */
export function sortByName<T extends { name?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
}

/**
 * Extract kennel/suite number from various formats
 * Handles: suiteNumber property, name with numbers, or defaults to 0
 *
 * @param item - Item with potential kennel number
 * @returns Extracted number
 */
export function extractKennelNumber(item: {
  suiteNumber?: string | number;
  name?: string;
  attributes?: { suiteNumber?: string | number };
}): string | number {
  // Try suiteNumber first
  if (item.suiteNumber) {
    return item.suiteNumber;
  }

  // Try attributes.suiteNumber
  if (item.attributes?.suiteNumber) {
    return item.attributes.suiteNumber;
  }

  // Try extracting from name
  if (item.name) {
    const match = item.name.match(/([A-Z]?\d+)/);
    if (match) {
      return match[1];
    }
  }

  return 0;
}
