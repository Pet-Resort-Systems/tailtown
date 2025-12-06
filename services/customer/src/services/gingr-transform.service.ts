/**
 * Gingr Data Transformation Service
 * Transforms Gingr data structures to Tailtown format
 */

import * as fs from "fs";
import * as path from "path";

// Load breed reference data
let breedMap: Map<string, string> | null = null;

function getBreedMap(): Map<string, string> {
  if (!breedMap) {
    breedMap = new Map();
    try {
      // Try multiple paths for the breeds file
      const possiblePaths = [
        path.join(__dirname, "../../../../data/gingr-reference/breeds.json"),
        path.join(process.cwd(), "data/gingr-reference/breeds.json"),
        "/opt/tailtown/data/gingr-reference/breeds.json",
      ];

      for (const breedPath of possiblePaths) {
        if (fs.existsSync(breedPath)) {
          const breedsData = JSON.parse(fs.readFileSync(breedPath, "utf-8"));
          for (const breed of breedsData) {
            breedMap.set(breed.value, breed.label);
          }
          break;
        }
      }
    } catch (error) {
      console.error("Failed to load breed reference data:", error);
    }
  }
  return breedMap;
}

function lookupBreedName(breedId: string | undefined): string {
  if (!breedId) return "Mixed";
  const map = getBreedMap();
  return map.get(breedId) || breedId; // Return ID if not found, for debugging
}

interface GingrOwner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  cell_phone?: string;
  home_phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

interface GingrAnimal {
  id: string;
  owner_id: string;
  first_name: string; // Pet name
  species_id?: string;
  breed_id?: string;
  color?: string;
  gender?: string;
  birthday?: number;
  weight?: string;
  microchip?: string;
  vet_id?: string;
  medicines?: string;
  allergies?: string;
  notes?: string;
  feeding_notes?: string;
  grooming_notes?: string;
  temperment?: string;
  fixed?: string; // "1" or "0"
  vip?: string; // "1" or "0"
  banned?: string; // "1" or "0"
}

interface GingrReservation {
  reservation_id: string;
  start_date: string; // ISO string
  end_date: string; // ISO string
  check_in_date?: string | null;
  check_out_date?: string | null;
  cancelled_date?: string | null;
  confirmed_date?: string | null;
  animal: {
    id: string;
    name: string;
    breed: string;
  };
  owner: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reservation_type: {
    id: string;
    type: string;
  };
  notes?: {
    reservation_notes?: string;
    animal_notes?: string;
    owner_notes?: string;
  };
  transaction?: {
    price?: number;
  };
}

/**
 * Transform Gingr owner to Tailtown customer
 */
export function transformOwnerToCustomer(owner: GingrOwner) {
  const address = owner.address_1 || "";
  const fullAddress = owner.address_2
    ? `${address} ${owner.address_2}`
    : address;

  return {
    firstName: owner.first_name || "",
    lastName: owner.last_name || "",
    email: owner.email || `customer${owner.id}@imported.local`,
    phone: owner.cell_phone || owner.home_phone || null,
    alternatePhone:
      owner.cell_phone && owner.home_phone ? owner.home_phone : null,
    address: fullAddress || null,
    city: owner.city || null,
    state: owner.state || null,
    zipCode: owner.zip || null,
    emergencyContact: owner.emergency_contact_name || null,
    emergencyPhone: owner.emergency_contact_phone || null,
    notes: stripHtml(owner.notes || ""),
    // Store Gingr ID for reference during migration
    externalId: owner.id,
    tenantId: "dev", // Will be replaced with actual tenant ID
  };
}

/**
 * Transform Gingr animal to Tailtown pet
 */
export function transformAnimalToPet(animal: GingrAnimal, customerId: string) {
  // Map species_id to PetType enum (1=Dog, 2=Cat, etc.)
  let petType = "DOG";
  if (animal.species_id === "2") petType = "CAT";
  else if (animal.species_id === "3") petType = "BIRD";
  else if (animal.species_id === "4") petType = "RABBIT";
  else if (animal.species_id === "5") petType = "REPTILE";
  else if (animal.species_id === "6") petType = "FISH";

  // Map gender
  let gender = "UNKNOWN";
  if (animal.gender) {
    const g = animal.gender.toLowerCase();
    if (g.includes("male") && !g.includes("female")) gender = "MALE";
    else if (g.includes("female")) gender = "FEMALE";
  }

  // Parse weight
  const weight = animal.weight ? parseFloat(animal.weight) : null;

  // Combine notes
  const allNotes = [
    animal.notes,
    animal.feeding_notes ? `Feeding: ${animal.feeding_notes}` : "",
    animal.grooming_notes ? `Grooming: ${animal.grooming_notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Map Gingr flags to Tailtown icons
  const petIcons: string[] = [];
  if (animal.vip === "1") petIcons.push("vip");
  if (animal.banned === "1") petIcons.push("red-flag");

  // Only add medication icon if there's actual medication info (not just "no" or "none")
  if (animal.medicines) {
    const medLower = animal.medicines.toLowerCase().trim();
    if (
      medLower &&
      !["no", "none", "n/a", "na", "no medications"].includes(medLower)
    ) {
      petIcons.push("medication-required");
    }
  }

  // Only add allergy icon if there's actual allergy info (not just "no" or "none")
  if (animal.allergies) {
    const allergyLower = animal.allergies.toLowerCase().trim();
    if (
      allergyLower &&
      !["no", "none", "n/a", "na", "no allergies"].includes(allergyLower)
    ) {
      petIcons.push("allergies");
    }
  }

  if (animal.temperment && ["1", "2"].includes(animal.temperment)) {
    // Temperament 1-2 might indicate behavioral concerns
    petIcons.push("behavioral-note");
  }

  return {
    customerId,
    name: animal.first_name || "Unknown",
    type: petType as any,
    breed: lookupBreedName(animal.breed_id),
    color: animal.color || null,
    gender: gender as any,
    birthdate: animal.birthday ? new Date(animal.birthday * 1000) : null,
    weight: weight,
    isNeutered: animal.fixed === "1",
    microchipNumber: animal.microchip || null,
    vetName: null, // Gingr uses vet_id, would need separate lookup
    vetPhone: null,
    medicationNotes: stripHtml(animal.medicines || ""),
    allergies: stripHtml(animal.allergies || ""),
    specialNeeds: animal.temperment || null,
    behaviorNotes: stripHtml(allNotes),
    petIcons: petIcons.length > 0 ? petIcons : null,
    isActive: true,
    externalId: animal.id,
    tenantId: "dev",
  };
}

/**
 * Transform Gingr reservation status to Tailtown status
 */
export function transformReservationStatus(statusId: number): string {
  // Gingr status mapping (common values)
  const statusMap: Record<number, string> = {
    1: "PENDING", // Pending/Requested
    2: "CONFIRMED", // Confirmed
    3: "CHECKED_IN", // Checked In
    4: "CHECKED_OUT", // Checked Out
    5: "COMPLETED", // Completed
    6: "CANCELLED", // Cancelled
    7: "NO_SHOW", // No Show
  };

  return statusMap[statusId] || "PENDING";
}

/**
 * Transform Gingr reservation to Tailtown reservation
 */
export function transformReservationToReservation(
  reservation: GingrReservation,
  customerId: string,
  petId: string,
  serviceId: string
) {
  // Determine status based on dates
  let status = "CONFIRMED";
  if (reservation.cancelled_date) status = "CANCELLED";
  else if (reservation.check_out_date) status = "COMPLETED";
  else if (reservation.check_in_date) status = "CHECKED_IN";
  else if (reservation.confirmed_date) status = "CONFIRMED";
  else status = "PENDING";

  // Combine notes
  const allNotes = [
    reservation.notes?.reservation_notes,
    reservation.notes?.animal_notes,
    reservation.notes?.owner_notes,
  ]
    .filter(Boolean)
    .join("\\n\\n");

  return {
    customerId,
    petId,
    serviceId,
    startDate: new Date(reservation.start_date),
    endDate: new Date(reservation.end_date),
    status: status as any,
    notes: stripHtml(allNotes),
    checkInDate: reservation.check_in_date
      ? new Date(reservation.check_in_date)
      : null,
    checkOutDate: reservation.check_out_date
      ? new Date(reservation.check_out_date)
      : null,
    // Store Gingr ID for reference
    externalId: reservation.reservation_id,
    tenantId: "dev",
  };
}

/**
 * Strip HTML tags from text (Gingr uses HTML in notes)
 */
function stripHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(/<br\s*\/?>/gi, "\n") // Convert <br> to newlines
    .replace(/<\/p>/gi, "\n\n") // Convert </p> to double newlines
    .replace(/<[^>]+>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Convert &nbsp; to spaces
    .replace(/&amp;/g, "&") // Convert &amp; to &
    .replace(/&lt;/g, "<") // Convert &lt; to <
    .replace(/&gt;/g, ">") // Convert &gt; to >
    .replace(/&quot;/g, '"') // Convert &quot; to "
    .trim();
}

/**
 * Format phone number to consistent format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return original if can't format
  return phone;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate unique order number for reservation
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

export default {
  transformOwnerToCustomer,
  transformAnimalToPet,
  transformReservationToReservation,
  transformReservationStatus,
  formatPhoneNumber,
  isValidEmail,
  generateOrderNumber,
};
