/**
 * Vaccination Icon Utilities
 * 
 * Utility functions to process pet vaccination status and convert it to display icons
 * Integrates with existing vaccineUtils system
 */

import { countVaccineStatuses } from './vaccineUtils';

/**
 * Process vaccination status and return appropriate icon IDs
 * 
 * @param pet - Pet object from backend API
 * @returns Array of icon IDs to add to pet's icon array
 */
export const getVaccinationIcons = (pet: any): string[] => {
  if (!pet) {
    return ['vaccinations-overdue'];
  }

  try {
    // Use existing vaccineUtils to count statuses
    const { expired, missing, current } = countVaccineStatuses(pet);
    
    // If any expired or missing vaccines, show overdue icon
    if (expired > 0 || missing > 0) {
      return ['vaccinations-overdue'];
    }
    
    // If all required vaccines are current, show current icon
    if (current > 0) {
      return ['vaccinations-current'];
    }
    
    // Default to overdue if no clear status
    return ['vaccinations-overdue'];
  } catch (error) {
    console.warn('Error processing vaccination status:', error);
    return ['vaccinations-overdue'];
  }
};

/**
 * Enhanced pet data processing that adds vaccination icons to pet data
 * 
 * @param pet - Pet object from backend API
 * @returns Enhanced pet object with vaccination icons included
 */
export const enhancePetWithVaccinationIcons = (pet: any): any => {
  if (!pet) return pet;

  // Get vaccination icons based on status
  const vaccinationIcons = getVaccinationIcons(pet);

  // Merge existing icons with vaccination icons
  const existingIcons = Array.isArray(pet.petIcons) ? pet.petIcons : [];
  const enhancedIcons = [...existingIcons, ...vaccinationIcons];

  // Remove duplicates while preserving order
  const uniqueIcons = enhancedIcons.filter((icon, index) => enhancedIcons.indexOf(icon) === index);

  return {
    ...pet,
    petIcons: uniqueIcons
  };
};

/**
 * Process an array of pets and add vaccination icons to each
 * 
 * @param pets - Array of pet objects from backend API
 * @returns Enhanced array of pets with vaccination icons
 */
export const enhancePetsWithVaccinationIcons = (pets: any[]): any[] => {
  if (!Array.isArray(pets)) return pets;
  
  return pets.map(pet => enhancePetWithVaccinationIcons(pet));
};

/**
 * Process reservation data and add vaccination icons to pets
 * 
 * @param reservations - Array of reservation objects from backend API
 * @returns Enhanced array of reservations with vaccination icons on pets
 */
export const enhanceReservationsWithVaccinationIcons = (reservations: any[]): any[] => {
  if (!Array.isArray(reservations)) return reservations;
  
  return reservations.map(reservation => ({
    ...reservation,
    pet: reservation.pet ? enhancePetWithVaccinationIcons(reservation.pet) : reservation.pet
  }));
};
