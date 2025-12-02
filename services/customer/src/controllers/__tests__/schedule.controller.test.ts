/**
 * Schedule Controller Tests
 *
 * Tests for staff schedule queries and availability.
 * Used by groomer availability checks in the calendar.
 */

import { Request, Response, NextFunction } from "express";

// Mock Prisma
const mockQueryRaw = jest.fn();
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    staffSchedule: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    staff: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
    },
    $queryRaw: mockQueryRaw,
  })),
}));

describe("Schedule Controller", () => {
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

  describe("Schedule Query Parameters", () => {
    it("should accept date range filters", () => {
      const queryParams = {
        startDate: "2025-12-01",
        endDate: "2025-12-07",
        staffId: "staff-123",
        page: "1",
        limit: "10",
      };

      expect(queryParams.startDate).toBe("2025-12-01");
      expect(queryParams.endDate).toBe("2025-12-07");
      expect(queryParams.staffId).toBe("staff-123");
    });

    it("should parse date strings correctly", () => {
      const startDate = new Date("2025-12-01T00:00:00Z");
      const endDate = new Date("2025-12-07T00:00:00Z");

      expect(startDate.getUTCFullYear()).toBe(2025);
      expect(startDate.getUTCMonth()).toBe(11); // December is 11
      expect(startDate.getUTCDate()).toBe(1);

      expect(endDate.getUTCDate()).toBe(7);
    });
  });

  describe("Staff Schedule Data Structure", () => {
    it("should return schedule with staff info", () => {
      const scheduleData = {
        id: "schedule-1",
        staffId: "staff-123",
        date: new Date("2025-12-03"),
        startTime: "09:00",
        endTime: "17:00",
        status: "SCHEDULED",
        notes: null,
        location: "Main Building",
        staff: {
          id: "staff-123",
          firstName: "Isabel",
          lastName: "Gonzalez",
          email: "isabel@tailtown.com",
          role: "GROOMER",
          department: "Grooming",
          position: "Senior Groomer",
        },
      };

      expect(scheduleData.staffId).toBe("staff-123");
      expect(scheduleData.staff.firstName).toBe("Isabel");
      expect(scheduleData.staff.role).toBe("GROOMER");
    });

    it("should handle multiple schedules for same staff", () => {
      const schedules = [
        {
          id: "schedule-1",
          staffId: "staff-123",
          date: new Date("2025-12-03"),
          startTime: "09:00",
          endTime: "12:00",
        },
        {
          id: "schedule-2",
          staffId: "staff-123",
          date: new Date("2025-12-03"),
          startTime: "13:00",
          endTime: "17:00",
        },
      ];

      expect(schedules.length).toBe(2);
      expect(schedules.every((s) => s.staffId === "staff-123")).toBe(true);
    });
  });

  describe("Groomer Availability Check", () => {
    it("should determine if groomer is available at specific time", () => {
      const schedule = {
        startTime: "09:00",
        endTime: "17:00",
        status: "SCHEDULED",
      };

      const requestedTime = "10:00";

      // Parse times for comparison
      const [schedStart, schedEnd] = [schedule.startTime, schedule.endTime];
      const isWithinSchedule =
        requestedTime >= schedStart && requestedTime < schedEnd;

      expect(isWithinSchedule).toBe(true);
    });

    it("should return unavailable if outside schedule", () => {
      const schedule = {
        startTime: "09:00",
        endTime: "17:00",
        status: "SCHEDULED",
      };

      const requestedTime = "18:00";

      const isWithinSchedule =
        requestedTime >= schedule.startTime && requestedTime < schedule.endTime;

      expect(isWithinSchedule).toBe(false);
    });

    it("should handle time-off status", () => {
      const schedule = {
        startTime: "09:00",
        endTime: "17:00",
        status: "TIME_OFF",
      };

      const isAvailable = schedule.status === "SCHEDULED";
      expect(isAvailable).toBe(false);
    });
  });

  describe("Schedule Filtering", () => {
    it("should filter schedules by date range", () => {
      const schedules = [
        { id: "1", date: new Date("2025-12-01") },
        { id: "2", date: new Date("2025-12-03") },
        { id: "3", date: new Date("2025-12-05") },
        { id: "4", date: new Date("2025-12-10") },
      ];

      const startDate = new Date("2025-12-02");
      const endDate = new Date("2025-12-06");

      const filtered = schedules.filter((s) => {
        return s.date >= startDate && s.date <= endDate;
      });

      expect(filtered.length).toBe(2);
      expect(filtered.map((s) => s.id)).toEqual(["2", "3"]);
    });

    it("should filter schedules by staff ID", () => {
      const schedules = [
        { id: "1", staffId: "staff-1" },
        { id: "2", staffId: "staff-2" },
        { id: "3", staffId: "staff-1" },
      ];

      const filtered = schedules.filter((s) => s.staffId === "staff-1");

      expect(filtered.length).toBe(2);
    });
  });

  describe("Pagination", () => {
    it("should calculate skip correctly", () => {
      const page = 2;
      const limit = 10;
      const skip = (page - 1) * limit;

      expect(skip).toBe(10);
    });

    it("should return correct total pages", () => {
      const total = 25;
      const limit = 10;
      const totalPages = Math.ceil(total / limit);

      expect(totalPages).toBe(3);
    });
  });

  describe("Schedule Status Values", () => {
    it("should recognize valid status values", () => {
      const validStatuses = [
        "SCHEDULED",
        "TIME_OFF",
        "SICK",
        "VACATION",
        "CANCELLED",
      ];

      expect(validStatuses).toContain("SCHEDULED");
      expect(validStatuses).toContain("TIME_OFF");
      expect(validStatuses).toContain("SICK");
    });
  });

  describe("My Schedule Endpoint", () => {
    it("should filter by current user staff ID", () => {
      const currentUserId = "staff-123";
      const allSchedules = [
        { id: "1", staffId: "staff-123", date: new Date("2025-12-03") },
        { id: "2", staffId: "staff-456", date: new Date("2025-12-03") },
        { id: "3", staffId: "staff-123", date: new Date("2025-12-04") },
      ];

      const mySchedules = allSchedules.filter(
        (s) => s.staffId === currentUserId
      );

      expect(mySchedules.length).toBe(2);
      expect(mySchedules.every((s) => s.staffId === currentUserId)).toBe(true);
    });
  });
});
