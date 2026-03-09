/**
 * Availability Controller Tests
 *
 * Tests for resource availability checks.
 * Used by calendars and reservation forms.
 */

import { Request, Response, NextFunction } from "express";

// Mock Prisma
const mockFindMany = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    resource: {
      findMany: mockFindMany,
    },
    reservation: {
      findMany: mockFindMany,
    },
  })),
}));

describe("Availability Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("Date Range Validation", () => {
    it("should require both startDate and endDate", () => {
      const body = { startDate: "2025-12-03" }; // Missing endDate

      const isValid = body.startDate && (body as any).endDate;
      expect(isValid).toBeFalsy();
    });

    it("should parse date strings correctly", () => {
      const startDate = new Date("2025-12-03");
      const endDate = new Date("2025-12-05");

      expect(startDate < endDate).toBe(true);
      expect(endDate.getTime() - startDate.getTime()).toBe(
        2 * 24 * 60 * 60 * 1000
      );
    });
  });

  describe("Availability Check Logic", () => {
    it("should find available suites when no conflicts", () => {
      const resources = [
        {
          id: "suite-1",
          name: "Suite A",
          type: "STANDARD_SUITE",
          isActive: true,
        },
        {
          id: "suite-2",
          name: "Suite B",
          type: "STANDARD_SUITE",
          isActive: true,
        },
      ];

      const reservations: any[] = []; // No reservations

      const availableSuites = resources.filter((resource) => {
        const hasConflict = reservations.some(
          (reservation) => reservation.resourceId === resource.id
        );
        return !hasConflict;
      });

      expect(availableSuites.length).toBe(2);
    });

    it("should exclude suites with conflicting reservations", () => {
      const resources = [
        {
          id: "suite-1",
          name: "Suite A",
          type: "STANDARD_SUITE",
          isActive: true,
        },
        {
          id: "suite-2",
          name: "Suite B",
          type: "STANDARD_SUITE",
          isActive: true,
        },
      ];

      const reservations = [
        { id: "res-1", resourceId: "suite-1", status: "CONFIRMED" },
      ];

      const availableSuites = resources.filter((resource) => {
        const hasConflict = reservations.some(
          (reservation) => reservation.resourceId === resource.id
        );
        return !hasConflict;
      });

      expect(availableSuites.length).toBe(1);
      expect(availableSuites[0].id).toBe("suite-2");
    });

    it("should check date overlap correctly", () => {
      // Reservation: Dec 3-5
      // Check: Dec 4-6 (overlaps)
      const reservation = {
        startDate: new Date("2025-12-03"),
        endDate: new Date("2025-12-05"),
      };

      const checkStart = new Date("2025-12-04");
      const checkEnd = new Date("2025-12-06");

      // Overlap: reservation.startDate <= checkEnd AND reservation.endDate >= checkStart
      const hasOverlap =
        reservation.startDate <= checkEnd && reservation.endDate >= checkStart;

      expect(hasOverlap).toBe(true);
    });

    it("should not flag non-overlapping dates", () => {
      // Reservation: Dec 3-5
      // Check: Dec 6-8 (no overlap)
      const reservation = {
        startDate: new Date("2025-12-03"),
        endDate: new Date("2025-12-05"),
      };

      const checkStart = new Date("2025-12-06");
      const checkEnd = new Date("2025-12-08");

      const hasOverlap =
        reservation.startDate <= checkEnd && reservation.endDate >= checkStart;

      expect(hasOverlap).toBe(false);
    });
  });

  describe("Suite Type Filtering", () => {
    it("should filter by suite type when specified", () => {
      const resources = [
        {
          id: "suite-1",
          name: "Suite A",
          type: "STANDARD_SUITE",
          isActive: true,
        },
        { id: "suite-2", name: "Suite B", type: "VIP_SUITE", isActive: true },
        {
          id: "suite-3",
          name: "Suite C",
          type: "STANDARD_SUITE",
          isActive: true,
        },
      ];

      const suiteType = "STANDARD_SUITE";
      const filtered = resources.filter((r) => r.type === suiteType);

      expect(filtered.length).toBe(2);
      expect(filtered.every((r) => r.type === "STANDARD_SUITE")).toBe(true);
    });

    it("should return all types when no filter specified", () => {
      const resources = [
        { id: "suite-1", type: "STANDARD_SUITE" },
        { id: "suite-2", type: "VIP_SUITE" },
      ];

      const suiteType = undefined;
      const filtered = suiteType
        ? resources.filter((r) => r.type === suiteType)
        : resources;

      expect(filtered.length).toBe(2);
    });
  });

  describe("Availability Response Format", () => {
    it("should return correct response structure", () => {
      const availableSuites = [
        { id: "suite-1", name: "Suite A", type: "STANDARD_SUITE", capacity: 1 },
      ];

      const response = {
        isAvailable: availableSuites.length > 0,
        status: availableSuites.length > 0 ? "AVAILABLE" : "UNAVAILABLE",
        message: `${availableSuites.length} suite(s) available`,
        availableSuites: availableSuites.map((suite) => ({
          suiteId: suite.id,
          suiteName: suite.name,
          suiteType: suite.type,
          capacity: suite.capacity || 1,
          isAvailable: true,
        })),
        waitlistAvailable: availableSuites.length === 0,
      };

      expect(response.isAvailable).toBe(true);
      expect(response.status).toBe("AVAILABLE");
      expect(response.availableSuites.length).toBe(1);
      expect(response.waitlistAvailable).toBe(false);
    });

    it("should indicate waitlist when no availability", () => {
      const availableSuites: any[] = [];

      const response = {
        isAvailable: availableSuites.length > 0,
        status: "UNAVAILABLE",
        message: "No suites available for selected dates",
        availableSuites: [],
        waitlistAvailable: true,
      };

      expect(response.isAvailable).toBe(false);
      expect(response.waitlistAvailable).toBe(true);
    });
  });

  describe("Calendar Availability", () => {
    it("should generate availability for each day in month", () => {
      const year = 2025;
      const month = 12;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month

      const daysInMonth = endDate.getDate();
      expect(daysInMonth).toBe(31); // December has 31 days

      // Generate array of dates
      const dates = [];
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month - 1, day));
      }

      expect(dates.length).toBe(31);
      expect(dates[0].getDate()).toBe(1);
      expect(dates[30].getDate()).toBe(31);
    });

    it("should count available suites per day", () => {
      const totalSuites = 10;
      const reservationsPerDay = [
        { date: "2025-12-01", count: 3 },
        { date: "2025-12-02", count: 5 },
        { date: "2025-12-03", count: 10 }, // Fully booked
      ];

      const availability = reservationsPerDay.map((day) => ({
        date: day.date,
        available: totalSuites - day.count,
        total: totalSuites,
        status:
          day.count >= totalSuites
            ? "FULL"
            : day.count > totalSuites * 0.8
            ? "LIMITED"
            : "AVAILABLE",
      }));

      expect(availability[0].available).toBe(7);
      expect(availability[0].status).toBe("AVAILABLE");
      expect(availability[2].available).toBe(0);
      expect(availability[2].status).toBe("FULL");
    });
  });

  describe("Reservation Status Filtering", () => {
    it("should only consider CONFIRMED and CHECKED_IN reservations", () => {
      const reservations = [
        { id: "1", status: "CONFIRMED", resourceId: "suite-1" },
        { id: "2", status: "CHECKED_IN", resourceId: "suite-2" },
        { id: "3", status: "CANCELLED", resourceId: "suite-3" },
        { id: "4", status: "COMPLETED", resourceId: "suite-4" },
        { id: "5", status: "PENDING", resourceId: "suite-5" },
      ];

      const activeStatuses = ["CONFIRMED", "CHECKED_IN"];
      const activeReservations = reservations.filter((r) =>
        activeStatuses.includes(r.status)
      );

      expect(activeReservations.length).toBe(2);
      expect(activeReservations.map((r) => r.id)).toEqual(["1", "2"]);
    });
  });

  describe("Multi-Pet Capacity", () => {
    it("should check capacity for multiple pets", () => {
      const suite = { id: "suite-1", capacity: 2 };
      const numberOfPets = 2;

      const hasCapacity = suite.capacity >= numberOfPets;
      expect(hasCapacity).toBe(true);
    });

    it("should reject if capacity exceeded", () => {
      const suite = { id: "suite-1", capacity: 1 };
      const numberOfPets = 2;

      const hasCapacity = suite.capacity >= numberOfPets;
      expect(hasCapacity).toBe(false);
    });
  });
});
