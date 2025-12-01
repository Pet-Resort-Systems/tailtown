// @ts-nocheck
/**
 * Reservation Overlap Prevention Tests
 *
 * Tests to ensure the system prevents overlapping reservations
 * for the same resource (suite/room).
 */

import { PrismaClient } from "@prisma/client";
import { detectReservationConflicts } from "../utils/reservation-conflicts";

// Mock the Prisma client
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    reservation: {
      findMany: jest.fn(),
    },
    resource: {
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Get the mocked Prisma client
const prisma = new PrismaClient();

describe("Reservation Overlap Prevention", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Resource-based overlap detection", () => {
    it("should detect overlap when new reservation starts during existing reservation", async () => {
      const existingReservation = {
        id: "existing-1",
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "suite-1",
      };

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        existingReservation,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-12"), // Starts during existing
        endDate: new Date("2026-06-17"),
        resourceId: "suite-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictingReservations).toHaveLength(1);
      expect(result.warnings[0]).toContain("Resource is not available");
    });

    it("should detect overlap when new reservation ends during existing reservation", async () => {
      const existingReservation = {
        id: "existing-1",
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "suite-1",
      };

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        existingReservation,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-08"), // Starts before
        endDate: new Date("2026-06-12"), // Ends during existing
        resourceId: "suite-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
    });

    it("should detect overlap when new reservation completely contains existing", async () => {
      const existingReservation = {
        id: "existing-1",
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "suite-1",
      };

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        existingReservation,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-08"), // Starts before
        endDate: new Date("2026-06-20"), // Ends after
        resourceId: "suite-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
    });

    it("should detect overlap when new reservation is completely within existing", async () => {
      const existingReservation = {
        id: "existing-1",
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-20"),
        resourceId: "suite-1",
      };

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        existingReservation,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-12"), // Within existing
        endDate: new Date("2026-06-15"), // Within existing
        resourceId: "suite-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
    });

    it("should NOT detect overlap for non-overlapping reservations", async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-20"),
        endDate: new Date("2026-06-25"),
        resourceId: "suite-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(false);
      expect(result.conflictingReservations).toHaveLength(0);
    });

    it("should NOT detect overlap for different resources", async () => {
      // No conflicts returned because we're checking a different resource
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "suite-2", // Different resource
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(false);
    });
  });

  describe("Pet-based overlap detection", () => {
    it("should detect when same pet has overlapping reservations", async () => {
      // First call for resource conflicts - none
      (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce([]);

      // Second call for pet conflicts - has overlap
      const petConflict = {
        id: "existing-1",
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        petId: "pet-1",
        resourceId: "suite-2", // Different resource but same pet
      };
      (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce([
        petConflict,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-12"),
        endDate: new Date("2026-06-17"),
        resourceId: "suite-1",
        petId: "pet-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.warnings[0]).toContain("Pet already has");
    });
  });

  describe("Multiple overlaps", () => {
    it("should detect multiple overlapping reservations", async () => {
      const existingReservations = [
        {
          id: "existing-1",
          startDate: new Date("2026-06-10"),
          endDate: new Date("2026-06-12"),
          resourceId: "suite-1",
        },
        {
          id: "existing-2",
          startDate: new Date("2026-06-14"),
          endDate: new Date("2026-06-16"),
          resourceId: "suite-1",
        },
      ];

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue(
        existingReservations
      );

      const result = await detectReservationConflicts({
        startDate: new Date("2026-06-08"),
        endDate: new Date("2026-06-20"), // Spans both existing reservations
        resourceId: "suite-1",
        tenantId: "tenant-1",
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictingReservations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Reservation update exclusion", () => {
    it("should exclude current reservation when checking for overlaps during update", async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await detectReservationConflicts({
        startDate: new Date("2026-06-10"),
        endDate: new Date("2026-06-15"),
        resourceId: "suite-1",
        reservationId: "current-reservation", // Exclude this from conflict check
        tenantId: "tenant-1",
      });

      expect(prisma.reservation.findMany as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: "current-reservation" },
          }),
        })
      );
    });
  });
});
