export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  portalEnabled?: boolean;
  preferredContact?: 'EMAIL' | 'SMS' | 'BOTH';
  emergencyContact?: string;
  emergencyPhone?: string;
  vatTaxId?: string;
  referralSource?: string;
  tags?: string[];
  icon?: string; // Customer avatar icon (person, face, smile, etc.)
  iconColor?: string; // Customer avatar color (blue, green, purple, etc.)
  customerIcons?: string[]; // Array of icon IDs for quick visual reference
  iconNotes?: Record<string, string>; // Custom notes for generic flag icons
  veterinarianId?: string; // Link to preferred veterinarian
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  storeCredit?: number; // Add store credit property
  pets?: {
    id: string;
    name: string;
    breed?: string;
    type?: string;
  }[];
}
