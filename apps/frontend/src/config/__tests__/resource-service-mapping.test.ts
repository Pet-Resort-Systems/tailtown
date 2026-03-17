/**
 * Tests for Resource-Service Mapping Configuration
 *
 * These tests verify the auto-selection logic that maps resource types
 * (like KING_KENNEL) to service names (like "Boarding | King Suite")
 */

import {
  RESOURCE_SERVICE_MAPPINGS,
  getServiceNameForResourceType,
  getServiceCategoryForResourceType,
  shouldAutoSelectService,
  getResourceTypesForService,
} from '../resource-service-mapping';

describe('Resource-Service Mapping', () => {
  describe('RESOURCE_SERVICE_MAPPINGS configuration', () => {
    it('should have mappings for all kennel types', () => {
      const kennelTypes = [
        'JUNIOR_KENNEL',
        'QUEEN_KENNEL',
        'KING_KENNEL',
        'VIP_ROOM',
        'CAT_CONDO',
        'DAY_CAMP_FULL',
        'DAY_CAMP_HALF',
      ];

      kennelTypes.forEach((type) => {
        const mapping = RESOURCE_SERVICE_MAPPINGS.find(
          (m) => m.resourceType === type
        );
        expect(mapping).toBeDefined();
        expect(mapping?.serviceName).toBeTruthy();
        expect(mapping?.serviceCategory).toBeTruthy();
      });
    });

    it('should have valid service categories', () => {
      const validCategories = [
        'BOARDING',
        'DAYCARE',
        'GROOMING',
        'TRAINING',
        'OTHER',
      ];

      RESOURCE_SERVICE_MAPPINGS.forEach((mapping) => {
        expect(validCategories).toContain(mapping.serviceCategory);
      });
    });

    it('should have unique resource types', () => {
      const resourceTypes = RESOURCE_SERVICE_MAPPINGS.map(
        (m) => m.resourceType
      );
      const uniqueTypes = new Set(resourceTypes);
      expect(uniqueTypes.size).toBe(resourceTypes.length);
    });
  });

  describe('getServiceNameForResourceType', () => {
    it('should return "Boarding | Indoor Suite" for JUNIOR_KENNEL', () => {
      expect(getServiceNameForResourceType('JUNIOR_KENNEL')).toBe(
        'Boarding | Indoor Suite'
      );
    });

    it('should return "Boarding | Indoor Suite" for QUEEN_KENNEL', () => {
      expect(getServiceNameForResourceType('QUEEN_KENNEL')).toBe(
        'Boarding | Indoor Suite'
      );
    });

    it('should return "Boarding | King Suite" for KING_KENNEL', () => {
      expect(getServiceNameForResourceType('KING_KENNEL')).toBe(
        'Boarding | King Suite'
      );
    });

    it('should return "Boarding | VIP Suite" for VIP_ROOM', () => {
      expect(getServiceNameForResourceType('VIP_ROOM')).toBe(
        'Boarding | VIP Suite'
      );
    });

    it('should return "Boarding | Cat Cabana" for CAT_CONDO', () => {
      expect(getServiceNameForResourceType('CAT_CONDO')).toBe(
        'Boarding | Cat Cabana'
      );
    });

    it('should return "Day Camp | Full Day" for DAY_CAMP_FULL', () => {
      expect(getServiceNameForResourceType('DAY_CAMP_FULL')).toBe(
        'Day Camp | Full Day'
      );
    });

    it('should return "Day Camp | Half Day" for DAY_CAMP_HALF', () => {
      expect(getServiceNameForResourceType('DAY_CAMP_HALF')).toBe(
        'Day Camp | Half Day'
      );
    });

    it('should return null for unknown resource types', () => {
      expect(getServiceNameForResourceType('UNKNOWN_TYPE')).toBeNull();
      expect(getServiceNameForResourceType('')).toBeNull();
      expect(getServiceNameForResourceType('STANDARD_SUITE')).toBeNull();
    });

    it('should be case-sensitive', () => {
      expect(getServiceNameForResourceType('king_kennel')).toBeNull();
      expect(getServiceNameForResourceType('King_Kennel')).toBeNull();
    });
  });

  describe('getServiceCategoryForResourceType', () => {
    it('should return BOARDING for all kennel types', () => {
      expect(getServiceCategoryForResourceType('JUNIOR_KENNEL')).toBe(
        'BOARDING'
      );
      expect(getServiceCategoryForResourceType('QUEEN_KENNEL')).toBe(
        'BOARDING'
      );
      expect(getServiceCategoryForResourceType('KING_KENNEL')).toBe('BOARDING');
      expect(getServiceCategoryForResourceType('VIP_ROOM')).toBe('BOARDING');
      expect(getServiceCategoryForResourceType('CAT_CONDO')).toBe('BOARDING');
    });

    it('should return DAYCARE for day camp types', () => {
      expect(getServiceCategoryForResourceType('DAY_CAMP_FULL')).toBe(
        'DAYCARE'
      );
      expect(getServiceCategoryForResourceType('DAY_CAMP_HALF')).toBe(
        'DAYCARE'
      );
    });

    it('should return null for unknown resource types', () => {
      expect(getServiceCategoryForResourceType('UNKNOWN_TYPE')).toBeNull();
    });
  });

  describe('shouldAutoSelectService', () => {
    it('should return true for mapped resource types', () => {
      expect(shouldAutoSelectService('JUNIOR_KENNEL')).toBe(true);
      expect(shouldAutoSelectService('QUEEN_KENNEL')).toBe(true);
      expect(shouldAutoSelectService('KING_KENNEL')).toBe(true);
      expect(shouldAutoSelectService('VIP_ROOM')).toBe(true);
      expect(shouldAutoSelectService('CAT_CONDO')).toBe(true);
      expect(shouldAutoSelectService('DAY_CAMP_FULL')).toBe(true);
      expect(shouldAutoSelectService('DAY_CAMP_HALF')).toBe(true);
    });

    it('should return false for unmapped resource types', () => {
      expect(shouldAutoSelectService('UNKNOWN_TYPE')).toBe(false);
      expect(shouldAutoSelectService('STANDARD_SUITE')).toBe(false);
      expect(shouldAutoSelectService('GROOMING_TABLE')).toBe(false);
      expect(shouldAutoSelectService('')).toBe(false);
    });
  });

  describe('getResourceTypesForService', () => {
    it('should return JUNIOR_KENNEL and QUEEN_KENNEL for Indoor Suite', () => {
      const types = getResourceTypesForService('Boarding | Indoor Suite');
      expect(types).toContain('JUNIOR_KENNEL');
      expect(types).toContain('QUEEN_KENNEL');
      expect(types).toHaveLength(2);
    });

    it('should return only KING_KENNEL for King Suite', () => {
      const types = getResourceTypesForService('Boarding | King Suite');
      expect(types).toEqual(['KING_KENNEL']);
    });

    it('should return only VIP_ROOM for VIP Suite', () => {
      const types = getResourceTypesForService('Boarding | VIP Suite');
      expect(types).toEqual(['VIP_ROOM']);
    });

    it('should return empty array for unknown service', () => {
      const types = getResourceTypesForService('Unknown Service');
      expect(types).toEqual([]);
    });

    it('should be case-sensitive for service names', () => {
      const types = getResourceTypesForService('boarding | indoor suite');
      expect(types).toEqual([]);
    });
  });

  describe('Service name format consistency', () => {
    it('should use consistent naming pattern with pipe separator', () => {
      RESOURCE_SERVICE_MAPPINGS.forEach((mapping) => {
        // All service names should contain " | " separator
        expect(mapping.serviceName).toMatch(/\w+ \| \w+/);
      });
    });

    it('should not have trailing or leading spaces in service names', () => {
      RESOURCE_SERVICE_MAPPINGS.forEach((mapping) => {
        expect(mapping.serviceName).toBe(mapping.serviceName.trim());
      });
    });
  });
});
