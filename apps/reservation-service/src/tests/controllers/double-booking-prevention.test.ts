// @ts-nocheck
/**
 * Double-Booking Prevention Tests
 * Tests for preventing kennel overbooking and conflicts
 */

import { PrismaClient } from "@prisma/client";
import { detectReservationConflicts } from "../../utils/reservation-conflicts";

// Mock the Prisma client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    reservation: {
      findMany: jest.fn(),
    },
    resource: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Get the mocked Prisma client
const prisma = new PrismaClient();

describe("Double-Booking Prevention", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Resource Conflict Detection", () => {
    it("should detect conflict when resource is already booked", async () => {
      const existingReservation = {
        id: "existing-1",
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "kennel-1",
        status: "CONFIRMED",
      };

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        existingReservation,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-12"),
        endDate: new Date("2026-06-17"),
        resourceId: "kennel-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictingReservations).toHaveLength(1);
      expect(result.warnings[0]).toContain("Resource is not available");
    });

    it("should not detect conflict when resource is available", async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "kennel-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(false);
      expect(result.conflictingReservations).toHaveLength(0);
    });

    it("should not detect conflict for adjacent bookings (checkout/checkin same day)", async () => {
      // Existing reservation ends on June 10
      const existingReservation = {
        id: "existing-1",
        startDate: new Date("2026-06-05"),
        endDate: new Date("2026-06-10"),
        resourceId: "kennel-1",
        status: "CONFIRMED",
      };

      // New reservation starts on June 10 - should be allowed
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "kennel-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(false);
    });
  });

  describe("Pet Conflict Detection", () => {
    it("should detect conflict when pet already has a reservation", async () => {
      // First call - no resource conflicts
      (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce([]);

      // Second call - pet has existing reservation
      const petConflict = {
        id: "existing-1",
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        petId: "pet-1",
        resourceId: "kennel-2", // Different kennel
        status: "CONFIRMED",
      };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce([
        petConflict,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-12"),
        endDate: new Date("2026-06-17"),
        resourceId: "kennel-1",
        petId: "pet-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.warnings[0]).toContain("Pet already has");
    });

    it("should allow same pet in different non-overlapping time slots", async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-20"),
        endDate: new Date("2026-06-25"),
        resourceId: "kennel-1",
        petId: "pet-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(false);
    });
  });

  describe("Update Reservation Conflicts", () => {
    it("should exclude current reservation when checking for conflicts during update", async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await detectReservationConflicts({
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "kennel-1",
        reservationId: "current-reservation-id",
        tenantId: "tenant-1",
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: "current-reservation-id" },
          }),
        })
      );
    });

    it("should detect conflict with other reservations during update", async () => {
      const otherReservation = {
        id: "other-reservation",
        startDate: new Date("2026-06-12"),
        endDate: new Date("2026-06-17"),
        resourceId: "kennel-1",
        status: "CONFIRMED",
      };

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        otherReservation,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "kennel-1",
        reservationId: "current-reservation-id",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
    });
  });

  describe("Multiple Conflicts", () => {
    it("should detect multiple overlapping reservations", async () => {
      const conflicts = [
        {
          id: "conflict-1",
          startDate: new Date("2026-06-08"),
          endDate: new Date("2026-06-12"),
          resourceId: "kennel-1",
        },
        {
          id: "conflict-2",
          startDate: new Date("2026-06-14"),
          endDate: new Date("2026-06-18"),
          resourceId: "kennel-1",
        },
      ];

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue(conflicts);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-05"),
        endDate: new Date("2026-06-20"),
        resourceId: "kennel-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictingReservations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Date Validation", () => {
    it("should reject reservation with end date before start date", async () => {
      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-06-10"), // Before start
        resourceId: "kennel-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.warnings).toContain("Start date must be before end date");
      // Should not even query the database
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });

    it("should warn about past dates but still check conflicts", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: pastDate,
        endDate: new Date("2026-06-15"),
        resourceId: "kennel-1",
        tenantId: "tenant-1",
      });

      expect(result.warnings.some((w) => w.includes("past"))).toBe(true);
    });
  });
});
