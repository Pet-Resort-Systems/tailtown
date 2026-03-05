// @ts-nocheck
// Note: Test mocks may not match actual Prisma types after schema changes
import { PrismaClient } from "@prisma/client";
import { detectReservationConflicts } from "../../utils/reservation-conflicts";
import { ExtendedReservationStatus } from "../../types/prisma-extensions";
import { createMockPrismaClient } from "./test-helpers";

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
    $transaction: jest.fn((callback) => callback()),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock the safeExecutePrismaQuery function
jest.mock("../../utils/service", () => ({
  safeExecutePrismaQuery: jest.fn().mockImplementation((fn, fallback) => fn()),
  AppError: jest.fn().mockImplementation((message, statusCode) => ({
    message,
    statusCode,
  })),
}));

// Get the mocked Prisma client
const prisma = new PrismaClient();

describe("detectReservationConflicts", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("should detect no conflicts when dates are valid and no overlapping reservations", async () => {
    // Mock the Prisma findMany to return empty array (no conflicts)
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    const result = await detectReservationConflicts({
      startDate: new Date("2026-06-10"),
      endDate: new Date("2026-06-15"),
      resourceId: "resource-1",
      tenantId: "tenant-1",
    });

    expect(result.hasConflicts).toBe(false);
    expect(result.conflictingReservations).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
  });

  it("should detect conflicts when there are overlapping reservations for a resource", async () => {
    // Mock overlapping reservations
    const mockConflicts = [
      {
        id: "reservation-1",
        startDate: new Date("2026-06-12"),
        endDate: new Date("2026-06-17"),
        resourceId: "resource-1",
        customer: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        pet: { name: "Buddy", breed: "Golden Retriever" },
      },
    ];

    (prisma.reservation.findMany as jest.Mock).mockResolvedValue(mockConflicts);

    const result = await detectReservationConflicts({
      startDate: new Date("2026-06-10"),
      endDate: new Date("2026-06-15"),
      resourceId: "resource-1",
      tenantId: "tenant-1",
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.conflictingReservations).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Resource is not available");
    expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
  });

  it("should detect pet conflicts when a pet has overlapping reservations", async () => {
    // No resource conflicts
    (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce([]);

    // But pet has conflicts in other reservations
    const mockPetConflicts = [
      {
        id: "reservation-2",
        startDate: new Date("2026-06-12"),
        endDate: new Date("2026-06-17"),
        resourceId: "resource-2",
        resource: { name: "Suite 2", type: "STANDARD_SUITE" },
      },
    ];

    (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce(
      mockPetConflicts
    );

    const result = await detectReservationConflicts({
      startDate: new Date("2026-06-10"),
      endDate: new Date("2026-06-15"),
      resourceId: "resource-1",
      petId: "pet-1",
      tenantId: "tenant-1",
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.conflictingReservations).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Pet already has");
    expect(prisma.reservation.findMany).toHaveBeenCalledTimes(2);
  });

  it("should detect suite type conflicts when all resources of a type are booked", async () => {
    // Mock resources of the requested suite type
    const mockResources = [
      { id: "resource-1", type: "VIP_SUITE" },
      { id: "resource-2", type: "VIP_SUITE" },
    ];

    (prisma.resource.findMany as jest.Mock).mockResolvedValue(mockResources);

    // Mock that all resources have conflicts
    (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce([
      { id: "conflict-1" },
    ]);
    (prisma.reservation.findMany as jest.Mock).mockResolvedValueOnce([
      { id: "conflict-2" },
    ]);

    const result = await detectReservationConflicts({
      startDate: new Date("2026-06-10"),
      endDate: new Date("2026-06-15"),
      suiteType: "VIP_SUITE",
      tenantId: "tenant-1",
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("All VIP_SUITE suites are booked");
  });

  it("should handle the case when no resources of the requested suite type exist", async () => {
    // Mock no resources of the requested suite type
    (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);

    const result = await detectReservationConflicts({
      startDate: new Date("2026-06-10"),
      endDate: new Date("2026-06-15"),
      suiteType: "NONEXISTENT_SUITE",
      tenantId: "tenant-1",
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("No resources found for suite type");
  });

  it("should exclude current reservation when reservationId is provided", async () => {
    // Mock the Prisma findMany to return empty array (no conflicts)
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    await detectReservationConflicts({
      startDate: new Date("2026-06-10"),
      endDate: new Date("2026-06-15"),
      resourceId: "resource-1",
      reservationId: "reservation-to-exclude",
      tenantId: "tenant-1",
    });

    // Verify that the query included the exclusion
    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "reservation-to-exclude" },
        }),
      })
    );
  });

  it("should warn when start date is in the past", async () => {
    // Mock the Prisma findMany to return empty array (no conflicts)
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

    const result = await detectReservationConflicts({
      startDate: pastDate,
      endDate: new Date("2026-06-15"),
      resourceId: "resource-1",
      tenantId: "tenant-1",
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Start date is in the past");
  });

  it("should detect invalid date range (start date after end date)", async () => {
    const result = await detectReservationConflicts({
      startDate: new Date("2026-06-20"),
      endDate: new Date("2026-06-15"), // End date before start date
      resourceId: "resource-1",
      tenantId: "tenant-1",
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Start date must be before end date");
    // Should not call Prisma at all for invalid dates
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();
  });
});
