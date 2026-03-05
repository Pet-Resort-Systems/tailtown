/**
 * Date Utilities Tests
 * Tests for date formatting and manipulation functions
 */

import {
  formatDateToYYYYMMDD,
  getCurrentDateFormatted,
  parseLocalDate,
  getDayOfWeek,
  getDayOfWeekName,
  isWeekend,
  getMonth,
  getYear,
  compareDates,
  addDays,
  daysBetween,
  // Gingr date utilities
  parseGingrDate,
  formatGingrDate,
  formatGingrTime,
  formatGingrDateTime,
  getGingrDateString,
  getGingrTimeString,
  gingrDateToInputValue,
  gingrTimeToInputValue,
  inputsToGingrDate,
} from "../dateUtils";

describe("dateUtils", () => {
  describe("formatDateToYYYYMMDD", () => {
    it("should format date to YYYY-MM-DD", () => {
      const date = new Date("2025-10-24T12:00:00Z");
      const result = formatDateToYYYYMMDD(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should pad single digit months and days", () => {
      const date = new Date("2025-01-05T12:00:00Z");
      const result = formatDateToYYYYMMDD(date);
      expect(result).toContain("-01-");
      expect(result).toContain("-05");
    });

    it("should return undefined for null date", () => {
      const result = formatDateToYYYYMMDD(null);
      expect(result).toBeUndefined();
    });

    it("should return undefined for undefined date", () => {
      const result = formatDateToYYYYMMDD(undefined);
      expect(result).toBeUndefined();
    });

    it("should handle dates at year boundaries", () => {
      const date = new Date("2025-12-31T23:59:59Z");
      const result = formatDateToYYYYMMDD(date);
      expect(result).toContain("2025-12-31");
    });
  });

  describe("getCurrentDateFormatted", () => {
    it("should return current date in YYYY-MM-DD format", () => {
      const result = getCurrentDateFormatted();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return today's date", () => {
      const result = getCurrentDateFormatted();
      const today = new Date();
      const expected = formatDateToYYYYMMDD(today);
      expect(result).toBe(expected);
    });
  });

  describe("parseLocalDate", () => {
    it("should parse date string in local timezone", () => {
      const result = parseLocalDate("2025-11-01");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10); // November (0-indexed)
      expect(result.getDate()).toBe(1);
    });

    it("should handle different months", () => {
      const jan = parseLocalDate("2025-01-15");
      expect(jan.getMonth()).toBe(0);

      const dec = parseLocalDate("2025-12-31");
      expect(dec.getMonth()).toBe(11);
    });
  });

  describe("getDayOfWeek", () => {
    it("should return correct day index for string dates", () => {
      expect(getDayOfWeek("2025-11-01")).toBe(6); // Saturday
      expect(getDayOfWeek("2025-11-02")).toBe(0); // Sunday
      expect(getDayOfWeek("2025-11-03")).toBe(1); // Monday
    });

    it("should work with Date objects", () => {
      const date = new Date(2025, 10, 1); // November 1, 2025
      expect(getDayOfWeek(date)).toBe(6); // Saturday
    });
  });

  describe("getDayOfWeekName", () => {
    it("should return correct day names", () => {
      expect(getDayOfWeekName("2025-11-01")).toBe("SATURDAY");
      expect(getDayOfWeekName("2025-11-02")).toBe("SUNDAY");
      expect(getDayOfWeekName("2025-11-03")).toBe("MONDAY");
      expect(getDayOfWeekName("2025-11-04")).toBe("TUESDAY");
      expect(getDayOfWeekName("2025-11-05")).toBe("WEDNESDAY");
      expect(getDayOfWeekName("2025-11-06")).toBe("THURSDAY");
      expect(getDayOfWeekName("2025-11-07")).toBe("FRIDAY");
    });
  });

  describe("isWeekend", () => {
    it("should return true for Saturday and Sunday", () => {
      expect(isWeekend("2025-11-01")).toBe(true); // Saturday
      expect(isWeekend("2025-11-02")).toBe(true); // Sunday
      expect(isWeekend("2025-11-08")).toBe(true); // Saturday
      expect(isWeekend("2025-11-09")).toBe(true); // Sunday
    });

    it("should return false for weekdays", () => {
      expect(isWeekend("2025-11-03")).toBe(false); // Monday
      expect(isWeekend("2025-11-04")).toBe(false); // Tuesday
      expect(isWeekend("2025-11-05")).toBe(false); // Wednesday
      expect(isWeekend("2025-11-06")).toBe(false); // Thursday
      expect(isWeekend("2025-11-07")).toBe(false); // Friday
    });
  });

  describe("getMonth", () => {
    it("should return correct month (1-12)", () => {
      expect(getMonth("2025-01-15")).toBe(1);
      expect(getMonth("2025-06-15")).toBe(6);
      expect(getMonth("2025-12-15")).toBe(12);
    });
  });

  describe("getYear", () => {
    it("should return correct year", () => {
      expect(getYear("2025-01-15")).toBe(2025);
      expect(getYear("2024-12-31")).toBe(2024);
    });
  });

  describe("compareDates", () => {
    it("should return -1 when first date is earlier", () => {
      expect(compareDates("2025-11-01", "2025-11-02")).toBe(-1);
    });

    it("should return 1 when first date is later", () => {
      expect(compareDates("2025-11-02", "2025-11-01")).toBe(1);
    });

    it("should return 0 when dates are equal", () => {
      expect(compareDates("2025-11-01", "2025-11-01")).toBe(0);
    });
  });

  describe("addDays", () => {
    it("should add days correctly", () => {
      expect(addDays("2025-11-01", 1)).toBe("2025-11-02");
      expect(addDays("2025-11-01", 7)).toBe("2025-11-08");
    });

    it("should subtract days with negative values", () => {
      expect(addDays("2025-11-08", -7)).toBe("2025-11-01");
    });

    it("should handle month boundaries", () => {
      expect(addDays("2025-10-31", 1)).toBe("2025-11-01");
      expect(addDays("2025-11-01", -1)).toBe("2025-10-31");
    });

    it("should handle year boundaries", () => {
      expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
      expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    });
  });

  describe("daysBetween", () => {
    it("should calculate days between dates", () => {
      expect(daysBetween("2025-11-01", "2025-11-08")).toBe(7);
      expect(daysBetween("2025-11-01", "2025-11-02")).toBe(1);
    });

    it("should return 0 for same date", () => {
      expect(daysBetween("2025-11-01", "2025-11-01")).toBe(0);
    });

    it("should handle negative differences", () => {
      expect(daysBetween("2025-11-08", "2025-11-01")).toBe(-7);
    });

    it("should handle month boundaries", () => {
      expect(daysBetween("2025-10-31", "2025-11-02")).toBe(2);
    });

    it("should handle year boundaries", () => {
      expect(daysBetween("2025-12-30", "2026-01-02")).toBe(3);
    });
  });

  // ============================================================================
  // Gingr Date Handling Tests
  // ============================================================================
  // These tests verify that Gingr dates (stored as local time with 'Z' suffix)
  // are handled correctly without timezone conversion.

  describe("parseGingrDate", () => {
    it("should parse Gingr ISO string as local time (not UTC)", () => {
      // This is the key test: "06:30:00.000Z" should be 6:30 AM local, not UTC
      const result = parseGingrDate("2025-11-20T06:30:00.000Z");
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(6);
      expect(result!.getMinutes()).toBe(30);
      expect(result!.getFullYear()).toBe(2025);
      expect(result!.getMonth()).toBe(10); // November (0-indexed)
      expect(result!.getDate()).toBe(20);
    });

    it("should handle afternoon times correctly", () => {
      const result = parseGingrDate("2025-12-01T17:00:00.000Z");
      expect(result!.getHours()).toBe(17); // 5 PM local, not converted
      expect(result!.getMinutes()).toBe(0);
    });

    it("should handle midnight correctly", () => {
      const result = parseGingrDate("2025-12-01T00:00:00.000Z");
      expect(result!.getHours()).toBe(0);
      expect(result!.getMinutes()).toBe(0);
    });

    it("should handle end of day correctly", () => {
      const result = parseGingrDate("2025-12-01T23:59:59.000Z");
      expect(result!.getHours()).toBe(23);
      expect(result!.getMinutes()).toBe(59);
    });

    it("should return null for null input", () => {
      expect(parseGingrDate(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(parseGingrDate(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseGingrDate("")).toBeNull();
    });
  });

  describe("formatGingrTime", () => {
    it("should format morning time correctly", () => {
      const result = formatGingrTime("2025-11-20T06:30:00.000Z");
      expect(result).toBe("6:30 AM");
    });

    it("should format afternoon time correctly", () => {
      const result = formatGingrTime("2025-12-01T17:00:00.000Z");
      expect(result).toBe("5:00 PM");
    });

    it("should format noon correctly", () => {
      const result = formatGingrTime("2025-12-01T12:00:00.000Z");
      expect(result).toBe("12:00 PM");
    });

    it("should format midnight correctly", () => {
      const result = formatGingrTime("2025-12-01T00:00:00.000Z");
      expect(result).toBe("12:00 AM");
    });

    it("should return empty string for null", () => {
      expect(formatGingrTime(null)).toBe("");
    });
  });

  describe("formatGingrDate", () => {
    it("should format date correctly", () => {
      const result = formatGingrDate("2025-11-20T06:30:00.000Z");
      expect(result).toBe("Nov 20, 2025");
    });

    it("should return empty string for null", () => {
      expect(formatGingrDate(null)).toBe("");
    });
  });

  describe("formatGingrDateTime", () => {
    it("should format date and time correctly", () => {
      const result = formatGingrDateTime("2025-11-20T06:30:00.000Z");
      expect(result).toBe("Nov 20, 2025, 6:30 AM");
    });

    it("should return empty string for null", () => {
      expect(formatGingrDateTime(null)).toBe("");
    });
  });

  describe("getGingrDateString", () => {
    it("should extract date portion correctly", () => {
      expect(getGingrDateString("2025-11-20T06:30:00.000Z")).toBe("2025-11-20");
      expect(getGingrDateString("2025-12-01T17:00:00.000Z")).toBe("2025-12-01");
    });

    it("should return empty string for null", () => {
      expect(getGingrDateString(null)).toBe("");
    });
  });

  describe("getGingrTimeString", () => {
    it("should extract time portion correctly", () => {
      expect(getGingrTimeString("2025-11-20T06:30:00.000Z")).toBe("06:30");
      expect(getGingrTimeString("2025-12-01T17:00:00.000Z")).toBe("17:00");
    });

    it("should return empty string for null", () => {
      expect(getGingrTimeString(null)).toBe("");
    });
  });

  describe("gingrDateToInputValue", () => {
    it("should return date for input field", () => {
      expect(gingrDateToInputValue("2025-11-20T06:30:00.000Z")).toBe(
        "2025-11-20"
      );
    });
  });

  describe("gingrTimeToInputValue", () => {
    it("should return time for input field", () => {
      expect(gingrTimeToInputValue("2025-11-20T06:30:00.000Z")).toBe("06:30");
    });
  });

  describe("inputsToGingrDate", () => {
    it("should combine date and time inputs", () => {
      expect(inputsToGingrDate("2025-11-20", "06:30")).toBe(
        "2025-11-20T06:30:00.000"
      );
    });

    it("should default to midnight if no time provided", () => {
      expect(inputsToGingrDate("2025-11-20", "")).toBe(
        "2025-11-20T00:00:00.000"
      );
    });

    it("should return empty string if no date provided", () => {
      expect(inputsToGingrDate("", "06:30")).toBe("");
    });
  });

  // Critical regression test for the 11:30 PM bug
  describe("Gingr timezone regression tests", () => {
    it("should NOT convert 6:30 AM to 11:30 PM previous day (MST timezone bug)", () => {
      // This was the bug: "2025-11-20T06:30:00.000Z" was being interpreted as UTC
      // and converted to 11:30 PM MST on Nov 19
      const result = parseGingrDate("2025-11-20T06:30:00.000Z");

      // The date should still be Nov 20, not Nov 19
      expect(result!.getDate()).toBe(20);
      expect(result!.getMonth()).toBe(10); // November

      // The time should be 6:30 AM, not 11:30 PM
      expect(result!.getHours()).toBe(6);
      expect(result!.getMinutes()).toBe(30);
    });

    it("should handle Lila reservation correctly (real production data)", () => {
      // Real data from production: Lila's check-in was showing as 11:30 PM
      // Database has: 2025-11-20 06:30:00 (local time)
      // API returns: 2025-11-20T06:30:00.000Z
      const result = formatGingrTime("2025-11-20T06:30:00.000Z");

      // Should show 6:30 AM, not 11:30 PM
      expect(result).toBe("6:30 AM");
      expect(result).not.toContain("11:30");
      expect(result).not.toContain("PM");
    });

    it("should handle overnight count calculation dates correctly", () => {
      // For overnight count, we compare dates not times
      // A reservation starting "2025-12-01T06:30:00.000Z" should be on Dec 1
      const dateStr = getGingrDateString("2025-12-01T06:30:00.000Z");
      expect(dateStr).toBe("2025-12-01");
    });
  });
});
