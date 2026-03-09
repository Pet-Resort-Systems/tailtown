import { transformAnimalToPet } from '../src/services/gingr-transform.service';

describe('Gingr Transform Service - Pet Icon Filtering', () => {
  const baseAnimal = {
    id: '123',
    first_name: 'Test Dog',
    owner_id: '456',
    species_id: '1',
    breed_id: 'Labrador',
    vip: '0',
    banned: '0',
    temperment: undefined,
    medicines: undefined,
    allergies: undefined,
    notes: undefined,
    feeding_notes: undefined,
    grooming_notes: undefined
  };

  describe('Allergy Icon Filtering', () => {
    it('should NOT add allergy icon when allergies field is "no"', () => {
      const animal = { ...baseAnimal, allergies: 'no' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is "none"', () => {
      const animal = { ...baseAnimal, allergies: 'none' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is "None"', () => {
      const animal = { ...baseAnimal, allergies: 'None' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is "n/a"', () => {
      const animal = { ...baseAnimal, allergies: 'n/a' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is "N/A"', () => {
      const animal = { ...baseAnimal, allergies: 'N/A' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is "no allergies"', () => {
      const animal = { ...baseAnimal, allergies: 'no allergies' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is "No Allergies"', () => {
      const animal = { ...baseAnimal, allergies: 'No Allergies' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is empty', () => {
      const animal = { ...baseAnimal, allergies: '' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add allergy icon when allergies field is undefined', () => {
      const animal = { ...baseAnimal, allergies: undefined };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should ADD allergy icon when allergies field has actual allergy info', () => {
      const animal = { ...baseAnimal, allergies: 'Allergic to chicken' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('allergies');
    });

    it('should ADD allergy icon when allergies field has detailed info', () => {
      const animal = { ...baseAnimal, allergies: 'Grass, pollen, and dust mites' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('allergies');
    });

    it('should ADD allergy icon when allergies field mentions specific allergen', () => {
      const animal = { ...baseAnimal, allergies: 'Beef protein allergy' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('allergies');
    });
  });

  describe('Medication Icon Filtering', () => {
    it('should NOT add medication icon when medicines field is "no"', () => {
      const animal = { ...baseAnimal, medicines: 'no' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add medication icon when medicines field is "none"', () => {
      const animal = { ...baseAnimal, medicines: 'none' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add medication icon when medicines field is "None"', () => {
      const animal = { ...baseAnimal, medicines: 'None' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add medication icon when medicines field is "n/a"', () => {
      const animal = { ...baseAnimal, medicines: 'n/a' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should NOT add medication icon when medicines field is "no medications"', () => {
      const animal = { ...baseAnimal, medicines: 'no medications' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should ADD medication icon when medicines field has actual medication info', () => {
      const animal = { ...baseAnimal, medicines: 'Prednisone 5mg daily' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('medication-required');
    });

    it('should ADD medication icon when medicines field mentions specific medication', () => {
      const animal = { ...baseAnimal, medicines: 'Apoquel for allergies' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('medication-required');
    });
  });

  describe('Multiple Icons', () => {
    it('should add both allergy and medication icons when both have valid info', () => {
      const animal = {
        ...baseAnimal,
        allergies: 'Chicken allergy',
        medicines: 'Benadryl as needed'
      };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('allergies');
      expect(result.petIcons).toContain('medication-required');
      expect(result.petIcons?.length).toBe(2);
    });

    it('should add VIP icon along with allergy icon', () => {
      const animal = {
        ...baseAnimal,
        vip: '1',
        allergies: 'Peanut allergy'
      };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('vip');
      expect(result.petIcons).toContain('allergies');
      expect(result.petIcons?.length).toBe(2);
    });

    it('should add red-flag icon along with medication icon', () => {
      const animal = {
        ...baseAnimal,
        banned: '1',
        medicines: 'Insulin twice daily'
      };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('red-flag');
      expect(result.petIcons).toContain('medication-required');
      expect(result.petIcons?.length).toBe(2);
    });

    it('should NOT add allergy/medication icons when both are "none"', () => {
      const animal = {
        ...baseAnimal,
        allergies: 'none',
        medicines: 'none'
      };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in negative indicators', () => {
      const animal = { ...baseAnimal, allergies: '  none  ' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should handle mixed case in negative indicators', () => {
      const animal = { ...baseAnimal, medicines: 'NoNe' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toBeNull();
    });

    it('should add icon for text that starts with "no" but is not a negative', () => {
      const animal = { ...baseAnimal, allergies: 'Noticed rash after eating beef' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      expect(result.petIcons).toContain('allergies');
    });

    it('should add icon for text that contains "none" but is not just "none"', () => {
      const animal = { ...baseAnimal, medicines: 'None currently, but may need antibiotics' };
      const result = transformAnimalToPet(animal, 'customer-123');
      
      // This should add the icon because it's not JUST "none"
      expect(result.petIcons).toContain('medication-required');
    });
  });
});
