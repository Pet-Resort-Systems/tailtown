/**
 * Types and interfaces for the pet icon system
 */

export type IconCategory =
  | "group"
  | "size"
  | "behavior"
  | "medical"
  | "handling"
  | "kennel"
  | "notes"
  | "account"
  | "flag";

export interface PetIcon {
  id: string;
  category: IconCategory;
  icon: string; // Unicode emoji
  label: string; // Short name
  description: string; // Detailed description for tooltip
  color?: string; // Optional color code
}

export interface PetNotes {
  petId: string;
  icons: string[]; // Array of icon IDs
  customNotes?: { [iconId: string]: string }; // Custom notes for generic flags
}
