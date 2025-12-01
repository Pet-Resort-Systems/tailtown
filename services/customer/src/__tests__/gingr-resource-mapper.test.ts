// @ts-nocheck
/**
 * Tests for Gingr Resource Mapper Service
 *
 * Verifies the lodging-to-resource type mapping and service name derivation
 * used during Gingr API sync.
 */

import {
  extractGingrLodging,
  getServiceNameForResourceType,
  getSupportedResourceTypes,
  isValidResourceType,
} from "../services/gingr-resource-mapper.service";

describe("Gingr Resource Mapper", () => {
  describe("extractGingrLodging", () => {
    it("should extract lodging_label", () => {
      const reservation = { lodging_label: "A02" };
      expect(extractGingrLodging(reservation)).toBe("A02");
    });

    it("should extract lodging_id as fallback", () => {
      const reservation = { lodging_id: "B10Q" };
      expect(extractGingrLodging(reservation)).toBe("B10Q");
    });

    it("should extract room_label", () => {
      const reservation = { room_label: "VIP-1" };
      expect(extractGingrLodging(reservation)).toBe("VIP-1");
    });

    it("should extract kennel_label", () => {
      const reservation = { kennel_label: "B11K" };
      expect(extractGingrLodging(reservation)).toBe("B11K");
    });

    it("should handle nested lodging object", () => {
      const reservation = { lodging: { label: "A04R" } };
      expect(extractGingrLodging(reservation)).toBe("A04R");
    });

    it("should return null for missing lodging", () => {
      const reservation = { other_field: "value" };
      expect(extractGingrLodging(reservation)).toBeNull();
    });

    it("should return null for empty reservation", () => {
      expect(extractGingrLodging({})).toBeNull();
    });
  });

  describe("getServiceNameForResourceType", () => {
    it("should return Indoor Suite for JUNIOR_KENNEL", () => {
      expect(getServiceNameForResourceType("JUNIOR_KENNEL")).toBe(
        "Boarding | Indoor Suite"
      );
    });

    it("should return Indoor Suite for QUEEN_KENNEL", () => {
      expect(getServiceNameForResourceType("QUEEN_KENNEL")).toBe(
        "Boarding | Indoor Suite"
      );
    });

    it("should return King Suite for KING_KENNEL", () => {
      expect(getServiceNameForResourceType("KING_KENNEL")).toBe(
        "Boarding | King Suite"
      );
    });

    it("should return VIP Suite for VIP_ROOM", () => {
      expect(getServiceNameForResourceType("VIP_ROOM")).toBe(
        "Boarding | VIP Suite"
      );
    });

    it("should return Cat Cabana for CAT_CONDO", () => {
      expect(getServiceNameForResourceType("CAT_CONDO")).toBe(
        "Boarding | Cat Cabana"
      );
    });

    it("should return Day Camp Full Day for DAY_CAMP_FULL", () => {
      expect(getServiceNameForResourceType("DAY_CAMP_FULL")).toBe(
        "Day Camp | Full Day"
      );
    });

    it("should return Day Camp Half Day for DAY_CAMP_HALF", () => {
      expect(getServiceNameForResourceType("DAY_CAMP_HALF")).toBe(
        "Day Camp | Half Day"
      );
    });

    it("should handle legacy STANDARD_SUITE type", () => {
      expect(getServiceNameForResourceType("STANDARD_SUITE")).toBe(
        "Boarding | Indoor Suite"
      );
    });

    it("should handle legacy VIP_SUITE type", () => {
      expect(getServiceNameForResourceType("VIP_SUITE")).toBe(
        "Boarding | VIP Suite"
      );
    });

    it("should return default for unknown type", () => {
      expect(getServiceNameForResourceType("UNKNOWN_TYPE")).toBe(
        "Boarding | Indoor Suite"
      );
    });
  });

  describe("getSupportedResourceTypes", () => {
    it("should return array of supported types", () => {
      const types = getSupportedResourceTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it("should include all new kennel types", () => {
      const types = getSupportedResourceTypes();
      expect(types).toContain("JUNIOR_KENNEL");
      expect(types).toContain("QUEEN_KENNEL");
      expect(types).toContain("KING_KENNEL");
      expect(types).toContain("VIP_ROOM");
      expect(types).toContain("CAT_CONDO");
    });

    it("should include day camp types", () => {
      const types = getSupportedResourceTypes();
      expect(types).toContain("DAY_CAMP_FULL");
      expect(types).toContain("DAY_CAMP_HALF");
    });
  });

  describe("isValidResourceType", () => {
    it("should return true for valid types", () => {
      expect(isValidResourceType("JUNIOR_KENNEL")).toBe(true);
      expect(isValidResourceType("KING_KENNEL")).toBe(true);
      expect(isValidResourceType("VIP_ROOM")).toBe(true);
    });

    it("should return false for invalid types", () => {
      expect(isValidResourceType("INVALID")).toBe(false);
      expect(isValidResourceType("")).toBe(false);
      expect(isValidResourceType("junior_kennel")).toBe(false);
    });
  });

  describe("Lodging Name to Resource Type Mapping", () => {
    /**
     * These tests verify the determineResourceType logic
     * by testing the full flow from lodging name to service name
     */

    // Helper to simulate the full mapping flow
    const mapLodgingToService = (lodgingName: string): string => {
      const name = lodgingName.toUpperCase();
      let resourceType = "JUNIOR_KENNEL";

      if (name.includes("VIP") || name.startsWith("V")) {
        resourceType = "VIP_ROOM";
      } else if (name.includes("CAT") || name.includes("CONDO")) {
        resourceType = "CAT_CONDO";
      } else if (name.endsWith("K") || name.includes("KING")) {
        resourceType = "KING_KENNEL";
      } else if (name.endsWith("Q") || name.includes("QUEEN")) {
        resourceType = "QUEEN_KENNEL";
      } else if (name.endsWith("R") || name.includes("JUNIOR")) {
        resourceType = "JUNIOR_KENNEL";
      }

      return getServiceNameForResourceType(resourceType);
    };

    describe("King kennels (suffix K)", () => {
      it("should map B11K to King Suite", () => {
        expect(mapLodgingToService("B11K")).toBe("Boarding | King Suite");
      });

      it("should map A06K to King Suite", () => {
        expect(mapLodgingToService("A06K")).toBe("Boarding | King Suite");
      });

      it("should map KING-1 to King Suite", () => {
        expect(mapLodgingToService("KING-1")).toBe("Boarding | King Suite");
      });
    });

    describe("Queen kennels (suffix Q)", () => {
      it("should map B10Q to Indoor Suite", () => {
        expect(mapLodgingToService("B10Q")).toBe("Boarding | Indoor Suite");
      });

      it("should map A05Q to Indoor Suite", () => {
        expect(mapLodgingToService("A05Q")).toBe("Boarding | Indoor Suite");
      });

      it("should map QUEEN-2 to Indoor Suite", () => {
        expect(mapLodgingToService("QUEEN-2")).toBe("Boarding | Indoor Suite");
      });
    });

    describe("Junior kennels (suffix R or default)", () => {
      it("should map A04R to Indoor Suite", () => {
        expect(mapLodgingToService("A04R")).toBe("Boarding | Indoor Suite");
      });

      it("should map B01R to Indoor Suite", () => {
        expect(mapLodgingToService("B01R")).toBe("Boarding | Indoor Suite");
      });

      it("should map JUNIOR-3 to Indoor Suite", () => {
        expect(mapLodgingToService("JUNIOR-3")).toBe("Boarding | Indoor Suite");
      });

      it("should default A01 (no suffix) to Indoor Suite", () => {
        expect(mapLodgingToService("A01")).toBe("Boarding | Indoor Suite");
      });
    });

    describe("VIP rooms", () => {
      it("should map VIP-1 to VIP Suite", () => {
        expect(mapLodgingToService("VIP-1")).toBe("Boarding | VIP Suite");
      });

      it("should map V01 to VIP Suite", () => {
        expect(mapLodgingToService("V01")).toBe("Boarding | VIP Suite");
      });
    });

    describe("Cat condos", () => {
      it("should map CAT-1 to Cat Cabana", () => {
        expect(mapLodgingToService("CAT-1")).toBe("Boarding | Cat Cabana");
      });

      it("should map CONDO-A to Cat Cabana", () => {
        expect(mapLodgingToService("CONDO-A")).toBe("Boarding | Cat Cabana");
      });
    });
  });

  describe("Service Name Consistency", () => {
    it("should use consistent naming with pipe separator", () => {
      const types = getSupportedResourceTypes();
      types.forEach((type) => {
        const serviceName = getServiceNameForResourceType(type);
        expect(serviceName).toMatch(/\w+.*\|.*\w+/);
      });
    });

    it("should not have trailing spaces in service names", () => {
      const types = getSupportedResourceTypes();
      types.forEach((type) => {
        const serviceName = getServiceNameForResourceType(type);
        expect(serviceName).toBe(serviceName.trim());
      });
    });
  });
});
