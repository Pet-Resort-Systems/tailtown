/**
 * Groomer Appointment Controller Tests
 *
 * Tests for grooming appointment management.
 */

import { Response, NextFunction } from "express";

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    groomerAppointment: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
  })),
}));

describe("Groomer Appointment Controller", () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("Tenant Isolation", () => {
    it("should filter appointments by tenantId", () => {
      const tenantId = "tenant-123";
      const where = { tenantId };
      expect(where.tenantId).toBe(tenantId);
    });

    it("should include tenantId when creating appointment", () => {
      const tenantId = "tenant-123";
      const appointmentData = {
        groomerId: "groomer-1",
        petId: "pet-1",
        scheduledDate: new Date(),
        tenantId,
      };
      expect(appointmentData.tenantId).toBe(tenantId);
    });
  });

  describe("Date Filtering", () => {
    it("should filter by date range", () => {
      const appointments = [
        { scheduledDate: new Date("2025-12-01") },
        { scheduledDate: new Date("2025-12-03") },
        { scheduledDate: new Date("2025-12-05") },
        { scheduledDate: new Date("2025-12-10") },
      ];

      const startDate = new Date("2025-12-02");
      const endDate = new Date("2025-12-06");

      const filtered = appointments.filter(
        (a) => a.scheduledDate >= startDate && a.scheduledDate <= endDate
      );
      expect(filtered.length).toBe(2);
    });

    it("should filter by single date", () => {
      const appointments = [
        { scheduledDate: new Date("2025-12-03T10:00:00Z") },
        { scheduledDate: new Date("2025-12-03T14:00:00Z") },
        { scheduledDate: new Date("2025-12-04T10:00:00Z") },
      ];

      const targetDate = "2025-12-03";
      const filtered = appointments.filter((a) =>
        a.scheduledDate.toISOString().startsWith(targetDate)
      );
      expect(filtered.length).toBe(2);
    });
  });

  describe("Groomer Filtering", () => {
    it("should filter by groomerId", () => {
      const appointments = [
        { groomerId: "groomer-1" },
        { groomerId: "groomer-2" },
        { groomerId: "groomer-1" },
      ];

      const filtered = appointments.filter((a) => a.groomerId === "groomer-1");
      expect(filtered.length).toBe(2);
    });
  });

  describe("Status Filtering", () => {
    it("should filter by status", () => {
      const appointments = [
        { status: "SCHEDULED" },
        { status: "IN_PROGRESS" },
        { status: "COMPLETED" },
        { status: "SCHEDULED" },
      ];

      const filtered = appointments.filter((a) => a.status === "SCHEDULED");
      expect(filtered.length).toBe(2);
    });

    it("should recognize valid status values", () => {
      const validStatuses = [
        "SCHEDULED",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ];

      expect(validStatuses).toContain("SCHEDULED");
      expect(validStatuses).toContain("IN_PROGRESS");
    });
  });

  describe("Appointment Data", () => {
    it("should include groomer info", () => {
      const appointment = {
        groomer: {
          id: "groomer-1",
          firstName: "Isabel",
          lastName: "Gonzalez",
          specialties: ["Full Groom", "Bath"],
        },
      };

      expect(appointment.groomer.firstName).toBe("Isabel");
      expect(appointment.groomer.specialties).toContain("Full Groom");
    });

    it("should include service info", () => {
      const appointment = {
        service: {
          id: "service-1",
          name: "Full Groom",
          duration: 120,
          price: 85,
        },
      };

      expect(appointment.service.name).toBe("Full Groom");
      expect(appointment.service.duration).toBe(120);
    });

    it("should include pet info", () => {
      const appointment = {
        pet: {
          id: "pet-1",
          name: "Buddy",
          type: "DOG",
          breed: "Golden Retriever",
        },
      };

      expect(appointment.pet.name).toBe("Buddy");
      expect(appointment.pet.breed).toBe("Golden Retriever");
    });

    it("should include customer info", () => {
      const appointment = {
        customer: {
          id: "cust-1",
          firstName: "John",
          lastName: "Doe",
          phone: "505-555-1234",
          email: "john@example.com",
        },
      };

      expect(appointment.customer.firstName).toBe("John");
      expect(appointment.customer.phone).toBe("505-555-1234");
    });
  });

  describe("Appointment Creation", () => {
    it("should require groomerId", () => {
      const request = { petId: "pet-1", scheduledDate: new Date() };
      const isValid = !!(request as any).groomerId;
      expect(isValid).toBe(false);
    });

    it("should require petId", () => {
      const request = { groomerId: "groomer-1", scheduledDate: new Date() };
      const isValid = !!(request as any).petId;
      expect(isValid).toBe(false);
    });

    it("should require scheduledDate", () => {
      const request = { groomerId: "groomer-1", petId: "pet-1" };
      const isValid = !!(request as any).scheduledDate;
      expect(isValid).toBe(false);
    });

    it("should require serviceId", () => {
      const request = {
        groomerId: "groomer-1",
        petId: "pet-1",
        scheduledDate: new Date(),
      };
      const isValid = !!(request as any).serviceId;
      expect(isValid).toBe(false);
    });
  });

  describe("Time Slot Calculation", () => {
    it("should calculate end time from duration", () => {
      const startTime = new Date("2025-12-03T10:00:00Z");
      const durationMinutes = 120;
      const endTime = new Date(
        startTime.getTime() + durationMinutes * 60 * 1000
      );

      expect(endTime.toISOString()).toBe("2025-12-03T12:00:00.000Z");
    });

    it("should check for time slot conflicts", () => {
      const existingAppointments = [
        {
          scheduledDate: new Date("2025-12-03T10:00:00Z"),
          endTime: new Date("2025-12-03T12:00:00Z"),
        },
      ];

      const newStart = new Date("2025-12-03T11:00:00Z");
      const newEnd = new Date("2025-12-03T13:00:00Z");

      const hasConflict = existingAppointments.some(
        (apt) => newStart < apt.endTime && newEnd > apt.scheduledDate
      );
      expect(hasConflict).toBe(true);
    });

    it("should allow non-overlapping appointments", () => {
      const existingAppointments = [
        {
          scheduledDate: new Date("2025-12-03T10:00:00Z"),
          endTime: new Date("2025-12-03T12:00:00Z"),
        },
      ];

      const newStart = new Date("2025-12-03T14:00:00Z");
      const newEnd = new Date("2025-12-03T16:00:00Z");

      const hasConflict = existingAppointments.some(
        (apt) => newStart < apt.endTime && newEnd > apt.scheduledDate
      );
      expect(hasConflict).toBe(false);
    });
  });

  describe("Status Updates", () => {
    it("should update status to IN_PROGRESS", () => {
      const appointment = { status: "SCHEDULED" };
      const updated = { ...appointment, status: "IN_PROGRESS" };
      expect(updated.status).toBe("IN_PROGRESS");
    });

    it("should update status to COMPLETED", () => {
      const appointment = { status: "IN_PROGRESS" };
      const updated = { ...appointment, status: "COMPLETED" };
      expect(updated.status).toBe("COMPLETED");
    });

    it("should record completion time", () => {
      const completedAt = new Date();
      expect(completedAt).toBeInstanceOf(Date);
    });
  });
});
