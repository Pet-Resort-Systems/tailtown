export interface Pet {
  id: string;
  name: string;
  type: 'DOG' | 'CAT' | 'OTHER';
  breed?: string | null;
  birthdate?: string | null;
  weight?: number | null;
  customerId: string;
  profilePhoto?: string | null;
  // Pet icons for quick visual reference
  petIcons?: string[];
  // Custom notes for generic flag icons
  iconNotes?: { [iconId: string]: string };
  vaccinationStatus?: Record<string, string | { 
    status: 'CURRENT' | 'EXPIRED' | 'PENDING';
    lastGiven?: string;
    notes?: string;
  }>;
  vaccineExpirations?: Record<string, string> | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}
