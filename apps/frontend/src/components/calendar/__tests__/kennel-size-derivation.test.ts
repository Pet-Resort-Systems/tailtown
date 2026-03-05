/**
 * Tests for Kennel Size Derivation Logic
 *
 * These tests verify the logic that derives room size labels (Junior, Queen, King)
 * from resource types (JUNIOR_KENNEL, QUEEN_KENNEL, KING_KENNEL)
 */

describe("Kennel Size Derivation", () => {
  /**
   * Helper function that mirrors the logic in KennelRow.tsx and useKennelData.ts
   * Derives room size from resource type
   */
  const getRoomSizeFromType = (type: string | undefined): string => {
    if (!type) return "JUNIOR";
    if (type.includes("JUNIOR")) return "JUNIOR";
    if (type.includes("QUEEN")) return "QUEEN";
    if (type.includes("KING")) return "KING";
    if (type.includes("VIP")) return "VIP";
    if (type.includes("CAT")) return "CAT";
    return "JUNIOR";
  };

  /**
   * Helper function that mirrors the display logic in KennelRow.tsx
   */
  const getSizeDisplay = (size: string): { label: string; color: string } => {
    switch (size) {
      case "JUNIOR":
        return { label: "Junior (1)", color: "default" };
      case "QUEEN":
        return { label: "Queen (2)", color: "primary" };
      case "KING":
        return { label: "King (3)", color: "secondary" };
      case "VIP":
        return { label: "VIP", color: "success" };
      case "CAT":
        return { label: "Cat", color: "info" };
      default:
        return { label: size, color: "default" };
    }
  };

  describe("getRoomSizeFromType", () => {
    describe("Standard kennel types", () => {
      it("should return JUNIOR for JUNIOR_KENNEL", () => {
        expect(getRoomSizeFromType("JUNIOR_KENNEL")).toBe("JUNIOR");
      });

      it("should return QUEEN for QUEEN_KENNEL", () => {
        expect(getRoomSizeFromType("QUEEN_KENNEL")).toBe("QUEEN");
      });

      it("should return KING for KING_KENNEL", () => {
        expect(getRoomSizeFromType("KING_KENNEL")).toBe("KING");
      });
    });

    describe("Special room types", () => {
      it("should return VIP for VIP_ROOM", () => {
        expect(getRoomSizeFromType("VIP_ROOM")).toBe("VIP");
      });

      it("should return CAT for CAT_CONDO", () => {
        expect(getRoomSizeFromType("CAT_CONDO")).toBe("CAT");
      });
    });

    describe("Edge cases", () => {
      it("should return JUNIOR for undefined type", () => {
        expect(getRoomSizeFromType(undefined)).toBe("JUNIOR");
      });

      it("should return JUNIOR for empty string", () => {
        expect(getRoomSizeFromType("")).toBe("JUNIOR");
      });

      it("should return JUNIOR for unknown types", () => {
        expect(getRoomSizeFromType("UNKNOWN_TYPE")).toBe("JUNIOR");
        expect(getRoomSizeFromType("STANDARD_SUITE")).toBe("JUNIOR");
        expect(getRoomSizeFromType("GROOMING_TABLE")).toBe("JUNIOR");
      });
    });

    describe("Case sensitivity", () => {
      it("should handle mixed case (includes is case-sensitive)", () => {
        // The includes() method is case-sensitive, so these should default to JUNIOR
        expect(getRoomSizeFromType("junior_kennel")).toBe("JUNIOR");
        expect(getRoomSizeFromType("queen_kennel")).toBe("JUNIOR");
        expect(getRoomSizeFromType("king_kennel")).toBe("JUNIOR");
      });

      it("should match partial strings containing the keyword", () => {
        expect(getRoomSizeFromType("SOME_JUNIOR_TYPE")).toBe("JUNIOR");
        expect(getRoomSizeFromType("QUEEN_SOMETHING")).toBe("QUEEN");
        expect(getRoomSizeFromType("THE_KING_SUITE")).toBe("KING");
      });
    });

    describe("Priority order", () => {
      it("should prioritize JUNIOR over other matches", () => {
        // If a type somehow contains multiple keywords, JUNIOR wins
        expect(getRoomSizeFromType("JUNIOR_QUEEN_KENNEL")).toBe("JUNIOR");
      });

      it("should prioritize QUEEN over KING", () => {
        expect(getRoomSizeFromType("QUEEN_KING_KENNEL")).toBe("QUEEN");
      });
    });
  });

  describe("getSizeDisplay", () => {
    it("should return correct label and color for JUNIOR", () => {
      const display = getSizeDisplay("JUNIOR");
      expect(display.label).toBe("Junior (1)");
      expect(display.color).toBe("default");
    });

    it("should return correct label and color for QUEEN", () => {
      const display = getSizeDisplay("QUEEN");
      expect(display.label).toBe("Queen (2)");
      expect(display.color).toBe("primary");
    });

    it("should return correct label and color for KING", () => {
      const display = getSizeDisplay("KING");
      expect(display.label).toBe("King (3)");
      expect(display.color).toBe("secondary");
    });

    it("should return correct label and color for VIP", () => {
      const display = getSizeDisplay("VIP");
      expect(display.label).toBe("VIP");
      expect(display.color).toBe("success");
    });

    it("should return correct label and color for CAT", () => {
      const display = getSizeDisplay("CAT");
      expect(display.label).toBe("Cat");
      expect(display.color).toBe("info");
    });

    it("should return the size as label for unknown sizes", () => {
      const display = getSizeDisplay("UNKNOWN");
      expect(display.label).toBe("UNKNOWN");
      expect(display.color).toBe("default");
    });
  });

  describe("Integration: Type to Display", () => {
    it("should correctly display Junior for JUNIOR_KENNEL resources", () => {
      const type = "JUNIOR_KENNEL";
      const size = getRoomSizeFromType(type);
      const display = getSizeDisplay(size);
      expect(display.label).toBe("Junior (1)");
    });

    it("should correctly display Queen for QUEEN_KENNEL resources", () => {
      const type = "QUEEN_KENNEL";
      const size = getRoomSizeFromType(type);
      const display = getSizeDisplay(size);
      expect(display.label).toBe("Queen (2)");
    });

    it("should correctly display King for KING_KENNEL resources", () => {
      const type = "KING_KENNEL";
      const size = getRoomSizeFromType(type);
      const display = getSizeDisplay(size);
      expect(display.label).toBe("King (3)");
    });

    it("should correctly display VIP for VIP_ROOM resources", () => {
      const type = "VIP_ROOM";
      const size = getRoomSizeFromType(type);
      const display = getSizeDisplay(size);
      expect(display.label).toBe("VIP");
    });

    it("should correctly display Cat for CAT_CONDO resources", () => {
      const type = "CAT_CONDO";
      const size = getRoomSizeFromType(type);
      const display = getSizeDisplay(size);
      expect(display.label).toBe("Cat");
    });
  });

  describe("Kennel naming convention parsing", () => {
    /**
     * Tests for parsing kennel names like B10Q, B11K, A04R
     * where the suffix indicates the size:
     * - R = Regular/Junior
     * - Q = Queen
     * - K = King
     */
    const parseKennelNameSuffix = (name: string): string | null => {
      if (!name) return null;
      const lastChar = name.slice(-1).toUpperCase();
      switch (lastChar) {
        case "R":
          return "JUNIOR";
        case "Q":
          return "QUEEN";
        case "K":
          return "KING";
        default:
          return null;
      }
    };

    it("should parse R suffix as JUNIOR", () => {
      expect(parseKennelNameSuffix("A04R")).toBe("JUNIOR");
      expect(parseKennelNameSuffix("B01R")).toBe("JUNIOR");
    });

    it("should parse Q suffix as QUEEN", () => {
      expect(parseKennelNameSuffix("B10Q")).toBe("QUEEN");
      expect(parseKennelNameSuffix("A05Q")).toBe("QUEEN");
    });

    it("should parse K suffix as KING", () => {
      expect(parseKennelNameSuffix("B11K")).toBe("KING");
      expect(parseKennelNameSuffix("A06K")).toBe("KING");
    });

    it("should return null for unknown suffixes", () => {
      expect(parseKennelNameSuffix("A01")).toBeNull();
      expect(parseKennelNameSuffix("B02X")).toBeNull();
    });

    it("should handle empty or null names", () => {
      expect(parseKennelNameSuffix("")).toBeNull();
    });
  });
});
