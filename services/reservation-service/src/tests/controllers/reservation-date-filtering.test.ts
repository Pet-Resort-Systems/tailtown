// @ts-nocheck
/**
 * Reservation Date Filtering Tests
 *
 * Tests the different date filtering modes for reservations:
 * 1. checkInDate - Filter for exact check-in date (startDate matches)
 * 2. date - Filter for reservations active on a date (overlapping)
 * 3. startDate/endDate range - Filter for overlapping date ranges
 *
 * TODO: Needs refactoring for new architecture
 */

import request from "supertest";
// import app from '../../index'; // Commented out - starts server which conflicts with running service
import { prisma } from "../../controllers/reservation/utils/prisma-helpers";
import { format, addDays, subDays } from "date-fns";

describe.skip("Reservation Date Filtering", () => {
  let testTenantId: string;
  let testCustomerId: string;
  let testPetId: string;
  let testServiceId: string;

  // Test reservations with different date ranges
  let checkInTodayId: string;
  let checkInYesterdayId: string;
  let checkInTomorrowId: string;
  let checkInLastWeekId: string;

  beforeAll(async () => {
    testTenantId = "dev"; // Use existing dev tenant

    // Note: In a real test environment, you'd create test data
    // For now, we'll use existing customer/pet/service IDs
    // These tests assume the dev tenant has at least one customer, pet, and service

    // Get existing customer
    const customer = await prisma.customer.findFirst({
      where: { tenantId: testTenantId },
    });
    if (!customer) throw new Error("No customer found for testing");
    testCustomerId = customer.id;

    // Get existing pet
    const pet = await prisma.pet.findFirst({
      where: { tenantId: testTenantId, customerId: testCustomerId },
    });
    if (!pet) throw new Error("No pet found for testing");
    testPetId = pet.id;

    // Get existing service
    const service = await prisma.service.findFirst({
      where: { tenantId: testTenantId },
    });
    if (!service) throw new Error("No service found for testing");
    testServiceId = service.id;

    // Create test reservations with different date ranges
    const today = new Date();
    const yesterday = subDays(today, 1);
    const tomorrow = addDays(today, 1);
    const lastWeek = subDays(today, 7);
    const nextWeek = addDays(today, 7);

    // Reservation checking in TODAY (staying 3 days)
    const res1 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: testPetId,
        serviceId: testServiceId,
        startDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          10,
          0,
          0
        ),
        endDate: addDays(today, 3),
        status: "CONFIRMED",
      },
    });
    checkInTodayId = res1.id;

    // Reservation checked in YESTERDAY (staying until tomorrow)
    const res2 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: testPetId,
        serviceId: testServiceId,
        startDate: new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          10,
          0,
          0
        ),
        endDate: tomorrow,
        status: "CHECKED_IN",
      },
    });
    checkInYesterdayId = res2.id;

    // Reservation checking in TOMORROW (staying 2 days)
    const res3 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: testPetId,
        serviceId: testServiceId,
        startDate: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          10,
          0,
          0
        ),
        endDate: addDays(tomorrow, 2),
        status: "CONFIRMED",
      },
    });
    checkInTomorrowId = res3.id;

    // Reservation checked in LAST WEEK (already checked out)
    const res4 = await prisma.reservation.create({
      data: {
        tenantId: testTenantId,
        customerId: testCustomerId,
        petId: testPetId,
        serviceId: testServiceId,
        startDate: new Date(
          lastWeek.getFullYear(),
          lastWeek.getMonth(),
          lastWeek.getDate(),
          10,
          0,
          0
        ),
        endDate: subDays(today, 5),
        status: "COMPLETED",
      },
    });
    checkInLastWeekId = res4.id;
  });

  afterAll(async () => {
    // Clean up only the test reservations we created
    await prisma.reservation.deleteMany({
      where: {
        id: {
          in: [
            checkInTodayId,
            checkInYesterdayId,
            checkInTomorrowId,
            checkInLastWeekId,
          ],
        },
      },
    });
  });

  describe("checkInDate Filter", () => {
    it("should return only reservations checking in TODAY", async () => {
      const today = new Date();
      const formattedDate = format(today, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({ checkInDate: formattedDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");

      const reservations = response.body.data.reservations;
      expect(reservations).toHaveLength(1);
      expect(reservations[0].id).toBe(checkInTodayId);
    });

    it("should return only reservations checking in YESTERDAY", async () => {
      const yesterday = subDays(new Date(), 1);
      const formattedDate = format(yesterday, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({ checkInDate: formattedDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;
      expect(reservations).toHaveLength(1);
      expect(reservations[0].id).toBe(checkInYesterdayId);
    });

    it("should return only reservations checking in TOMORROW", async () => {
      const tomorrow = addDays(new Date(), 1);
      const formattedDate = format(tomorrow, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({ checkInDate: formattedDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;
      expect(reservations).toHaveLength(1);
      expect(reservations[0].id).toBe(checkInTomorrowId);
    });

    it("should return empty array for date with no check-ins", async () => {
      const futureDate = addDays(new Date(), 30);
      const formattedDate = format(futureDate, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({ checkInDate: formattedDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;
      expect(reservations).toHaveLength(0);
    });
  });

  describe("date Filter (Active Reservations)", () => {
    it("should return reservations ACTIVE on TODAY", async () => {
      const today = new Date();
      const formattedDate = format(today, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({ date: formattedDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;
      const reservationIds = reservations.map((r: any) => r.id);

      // Should include: checking in today AND checked in yesterday (still staying)
      expect(reservationIds).toContain(checkInTodayId);
      expect(reservationIds).toContain(checkInYesterdayId);

      // Should NOT include: checking in tomorrow or completed last week
      expect(reservationIds).not.toContain(checkInTomorrowId);
      expect(reservationIds).not.toContain(checkInLastWeekId);
    });

    it("should return reservations ACTIVE on YESTERDAY", async () => {
      const yesterday = subDays(new Date(), 1);
      const formattedDate = format(yesterday, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({ date: formattedDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;
      const reservationIds = reservations.map((r: any) => r.id);

      // Should only include: checked in yesterday
      expect(reservationIds).toContain(checkInYesterdayId);

      // Should NOT include others
      expect(reservationIds).not.toContain(checkInTodayId);
      expect(reservationIds).not.toContain(checkInTomorrowId);
    });
  });

  describe("startDate/endDate Range Filter", () => {
    it("should return reservations overlapping a date range", async () => {
      const today = new Date();
      const startDate = format(subDays(today, 1), "yyyy-MM-dd");
      const endDate = format(addDays(today, 1), "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({ startDate, endDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;
      const reservationIds = reservations.map((r: any) => r.id);

      // Should include: today, yesterday, and tomorrow (all overlap the range)
      expect(reservationIds).toContain(checkInTodayId);
      expect(reservationIds).toContain(checkInYesterdayId);
      expect(reservationIds).toContain(checkInTomorrowId);

      // Should NOT include: last week (outside range)
      expect(reservationIds).not.toContain(checkInLastWeekId);
    });
  });

  describe("Filter Priority", () => {
    it("checkInDate should take priority over date parameter", async () => {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const checkInDateFormatted = format(today, "yyyy-MM-dd");
      const dateFormatted = format(yesterday, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({
          checkInDate: checkInDateFormatted,
          date: dateFormatted, // This should be ignored
        })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;

      // Should use checkInDate (today), not date (yesterday)
      expect(reservations).toHaveLength(1);
      expect(reservations[0].id).toBe(checkInTodayId);
    });

    it("checkInDate should take priority over startDate/endDate range", async () => {
      const today = new Date();
      const checkInDateFormatted = format(today, "yyyy-MM-dd");
      const rangeStart = format(subDays(today, 7), "yyyy-MM-dd");
      const rangeEnd = format(addDays(today, 7), "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({
          checkInDate: checkInDateFormatted,
          startDate: rangeStart, // These should be ignored
          endDate: rangeEnd,
        })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;

      // Should use checkInDate (today), not the range
      expect(reservations).toHaveLength(1);
      expect(reservations[0].id).toBe(checkInTodayId);
    });
  });

  describe("Invalid Date Handling", () => {
    it("should handle invalid checkInDate gracefully", async () => {
      const response = await request(app)
        .get("/api/reservations")
        .query({ checkInDate: "invalid-date" })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);
      expect(response.body.warnings).toBeDefined();
      expect(response.body.warnings.length).toBeGreaterThan(0);
    });

    it("should handle invalid date format gracefully", async () => {
      const response = await request(app)
        .get("/api/reservations")
        .query({ date: "2025/11/06" }) // Wrong format
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);
      // Should still return data, just with warnings
    });
  });

  describe("Tenant Isolation with Date Filters", () => {
    it("checkInDate should respect tenant boundaries", async () => {
      const today = new Date();
      const formattedDate = format(today, "yyyy-MM-dd");

      // Query with correct tenant
      const response1 = await request(app)
        .get("/api/reservations")
        .query({ checkInDate: formattedDate })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response1.status).toBe(200);
      expect(response1.body.data.reservations).toHaveLength(1);

      // Query with different tenant (should return different results)
      const response2 = await request(app)
        .get("/api/reservations")
        .query({ checkInDate: formattedDate })
        .set("x-tenant-subdomain", "tailtown"); // Different tenant

      expect(response2.status).toBe(200);
      // Should not include our test reservation
      const reservationIds = response2.body.data.reservations.map(
        (r: any) => r.id
      );
      expect(reservationIds).not.toContain(checkInTodayId);
    });
  });

  describe("Use Case: Kennel Cards", () => {
    it("should return correct reservations for kennel cards (check-ins only)", async () => {
      const today = new Date();
      const formattedDate = format(today, "yyyy-MM-dd");

      const response = await request(app)
        .get("/api/reservations")
        .query({
          checkInDate: formattedDate,
          status: "CONFIRMED,CHECKED_IN",
          limit: 500,
        })
        .set("x-tenant-subdomain", "test-date-filter");

      expect(response.status).toBe(200);

      const reservations = response.body.data.reservations;

      // Should only include dogs checking in today
      expect(reservations).toHaveLength(1);
      expect(reservations[0].id).toBe(checkInTodayId);

      // Should include pet and customer data
      expect(reservations[0].pet).toBeDefined();
      expect(reservations[0].customer).toBeDefined();
    });
  });
});
