// @ts-nocheck
/**
 * Reservation Integration Tests
 * Tests with real database connection
 *
 * These tests use the actual PostgreSQL database to validate:
 * - Pagination limits work correctly
 * - Kennel assignment validation enforced
 * - Double-booking prevention works
 * - Multi-tenant isolation
 *
 * TODO: Needs refactoring for new architecture
 */

import { PrismaClient } from "@prisma/client";
import request from "supertest";
import app from "../../index"; // Your Express app

// PrismaClient uses DATABASE_URL from environment automatically
const prisma = new PrismaClient();

// Test tenant ID
const TEST_TENANT_ID = "test-tenant-integration";

describe.skip("Reservation Integration Tests", () => {
  let testCustomerId: string;
  let testPetId: string;
  let testServiceBoardingId: string;
  let testServiceGroomingId: string;
  let testResourceId: string;

  beforeAll(async () => {
    // Connect to database
    await prisma.$connect();

    // Clean up any existing test data
    await cleanupTestData();

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();

    // Disconnect from database
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    // Delete in correct order to respect foreign keys
    await prisma.reservation.deleteMany({
      where: { tenantId: TEST_TENANT_ID },
    });

    await prisma.resource.deleteMany({
      where: { tenantId: TEST_TENANT_ID },
    });

    await prisma.service.deleteMany({
      where: { tenantId: TEST_TENANT_ID },
    });

    await prisma.pet.deleteMany({
      where: { tenantId: TEST_TENANT_ID },
    });

    await prisma.customer.deleteMany({
      where: { tenantId: TEST_TENANT_ID },
    });
  }

  async function setupTestData() {
    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        firstName: "Integration",
        lastName: "Test",
        email: "integration@test.com",
        phone: "555-0000",
        tenantId: TEST_TENANT_ID,
      },
    });
    testCustomerId = customer.id;

    // Create test pet
    const pet = await prisma.pet.create({
      data: {
        name: "TestPet",
        breed: "Test Breed",
        customerId: testCustomerId,
        tenantId: TEST_TENANT_ID,
      },
    });
    testPetId = pet.id;

    // Create boarding service
    const boardingService = await prisma.service.create({
      data: {
        name: "Integration Boarding",
        serviceCategory: "BOARDING",
        price: 50.0,
        tenantId: TEST_TENANT_ID,
      },
    });
    testServiceBoardingId = boardingService.id;

    // Create grooming service
    const groomingService = await prisma.service.create({
      data: {
        name: "Integration Grooming",
        serviceCategory: "GROOMING",
        price: 40.0,
        tenantId: TEST_TENANT_ID,
      },
    });
    testServiceGroomingId = groomingService.id;

    // Create test resource (kennel)
    const resource = await prisma.resource.create({
      data: {
        name: "Test Kennel A01",
        type: "STANDARD_SUITE",
        tenantId: TEST_TENANT_ID,
        attributes: {
          suiteNumber: "A01",
        },
      },
    });
    testResourceId = resource.id;
  }

  describe("Pagination Integration", () => {
    beforeEach(async () => {
      // Clean up reservations before each test
      await prisma.reservation.deleteMany({
        where: { tenantId: TEST_TENANT_ID },
      });
    });

    it("should return up to 250 reservations", async () => {
      // Create 260 test reservations
      const reservations = [];
      for (let i = 0; i < 260; i++) {
        reservations.push({
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: new Date(
            `2025-11-${String((i % 28) + 1).padStart(2, "0")}`
          ),
          endDate: new Date(
            `2025-11-${String((i % 28) + 1 + 1).padStart(2, "0")}`
          ),
          status: "CONFIRMED",
          tenantId: TEST_TENANT_ID,
        });
      }

      await prisma.reservation.createMany({
        data: reservations,
      });

      // Request 250 reservations
      const response = await request(app)
        .get("/api/reservations")
        .query({ limit: 250 })
        .set("x-tenant-id", TEST_TENANT_ID)
        .expect(200);

      expect(response.body.data).toHaveLength(250);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(250);
    });

    it("should reject limit > 500", async () => {
      const response = await request(app)
        .get("/api/reservations")
        .query({ limit: 1000 })
        .set("x-tenant-id", TEST_TENANT_ID)
        .expect(200);

      // Should use default limit and include warning
      expect(response.body.warnings).toBeDefined();
      expect(
        response.body.warnings.some((w: string) => w.includes("Invalid limit"))
      ).toBe(true);
    });
  });

  describe("Kennel Assignment Integration", () => {
    beforeEach(async () => {
      await prisma.reservation.deleteMany({
        where: { tenantId: TEST_TENANT_ID },
      });
    });

    it("should require resourceId for boarding service", async () => {
      const response = await request(app)
        .post("/api/reservations")
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          startDate: "2025-10-25",
          endDate: "2025-10-27",
          // Missing resourceId
        })
        .expect(400);

      expect(response.body.error).toMatch(
        /kennel.*required|resource.*required/i
      );
    });

    it("should allow boarding with specific resourceId", async () => {
      const response = await request(app)
        .post("/api/reservations")
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: "2025-10-25",
          endDate: "2025-10-27",
        })
        .expect(201);

      expect(response.body.data.resourceId).toBe(testResourceId);

      // Clean up
      await prisma.reservation.delete({
        where: { id: response.body.data.id },
      });
    });

    it("should allow boarding with auto-assign (empty resourceId + suiteType)", async () => {
      const response = await request(app)
        .post("/api/reservations")
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: "",
          suiteType: "STANDARD_SUITE",
          startDate: "2025-10-25",
          endDate: "2025-10-27",
        })
        .expect(201);

      // Should have auto-assigned a resource
      expect(response.body.data.resourceId).toBeDefined();

      // Clean up
      await prisma.reservation.delete({
        where: { id: response.body.data.id },
      });
    });

    it("should NOT require resourceId for grooming service", async () => {
      const response = await request(app)
        .post("/api/reservations")
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceGroomingId,
          startDate: "2025-10-25",
          endDate: "2025-10-25",
          // No resourceId - should be OK for grooming
        })
        .expect(201);

      expect(response.body.data.serviceId).toBe(testServiceGroomingId);

      // Clean up
      await prisma.reservation.delete({
        where: { id: response.body.data.id },
      });
    });

    it("should prevent removing resourceId from boarding reservation", async () => {
      // Create boarding reservation with kennel
      const reservation = await prisma.reservation.create({
        data: {
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: new Date("2025-10-25"),
          endDate: new Date("2025-10-27"),
          status: "CONFIRMED",
          tenantId: TEST_TENANT_ID,
        },
      });

      // Try to remove resourceId
      const response = await request(app)
        .put(`/api/reservations/${reservation.id}`)
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          resourceId: null,
        })
        .expect(400);

      expect(response.body.error).toMatch(/cannot remove.*kennel/i);

      // Clean up
      await prisma.reservation.delete({
        where: { id: reservation.id },
      });
    });
  });

  describe("Double-Booking Prevention Integration", () => {
    beforeEach(async () => {
      await prisma.reservation.deleteMany({
        where: { tenantId: TEST_TENANT_ID },
      });
    });

    it("should prevent overlapping reservations on same kennel", async () => {
      // Create first reservation
      const firstReservation = await prisma.reservation.create({
        data: {
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: new Date("2025-10-25"),
          endDate: new Date("2025-10-27"),
          status: "CONFIRMED",
          tenantId: TEST_TENANT_ID,
        },
      });

      // Try to create overlapping reservation
      const response = await request(app)
        .post("/api/reservations")
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: "2025-10-26", // Overlaps with existing
          endDate: "2025-10-28",
        })
        .expect(409);

      expect(response.body.error).toMatch(
        /not available|conflict|already booked/i
      );

      // Clean up
      await prisma.reservation.delete({
        where: { id: firstReservation.id },
      });
    });

    it("should allow non-overlapping reservations on same kennel", async () => {
      // Create first reservation
      const firstReservation = await prisma.reservation.create({
        data: {
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: new Date("2025-10-25"),
          endDate: new Date("2025-10-27"),
          status: "CONFIRMED",
          tenantId: TEST_TENANT_ID,
        },
      });

      // Create non-overlapping reservation
      const response = await request(app)
        .post("/api/reservations")
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: "2025-10-28", // After first reservation
          endDate: "2025-10-30",
        })
        .expect(201);

      expect(response.body.data.resourceId).toBe(testResourceId);

      // Clean up
      await prisma.reservation.deleteMany({
        where: {
          id: { in: [firstReservation.id, response.body.data.id] },
        },
      });
    });

    it("should allow editing own reservation without conflict", async () => {
      // Create reservation
      const reservation = await prisma.reservation.create({
        data: {
          customerId: testCustomerId,
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: testResourceId,
          startDate: new Date("2025-10-25"),
          endDate: new Date("2025-10-27"),
          status: "CONFIRMED",
          tenantId: TEST_TENANT_ID,
        },
      });

      // Update same reservation (should not conflict with itself)
      const response = await request(app)
        .put(`/api/reservations/${reservation.id}`)
        .set("x-tenant-id", TEST_TENANT_ID)
        .send({
          notes: "Updated notes",
        })
        .expect(200);

      expect(response.body.data.id).toBe(reservation.id);

      // Clean up
      await prisma.reservation.delete({
        where: { id: reservation.id },
      });
    });
  });

  describe("Multi-Tenant Isolation Integration", () => {
    const TENANT_A = "tenant-a-integration";
    const TENANT_B = "tenant-b-integration";
    let tenantACustomerId: string;
    let tenantAPetId: string;
    let tenantAServiceId: string;
    let tenantAResourceId: string;

    beforeAll(async () => {
      // Create data for tenant A
      const customerA = await prisma.customer.create({
        data: {
          firstName: "Tenant",
          lastName: "A",
          email: "tenanta@test.com",
          tenantId: TENANT_A,
        },
      });
      tenantACustomerId = customerA.id;

      const petA = await prisma.pet.create({
        data: {
          name: "PetA",
          customerId: tenantACustomerId,
          tenantId: TENANT_A,
        },
      });
      tenantAPetId = petA.id;

      const serviceA = await prisma.service.create({
        data: {
          name: "Service A",
          serviceCategory: "BOARDING",
          price: 50,
          tenantId: TENANT_A,
        },
      });
      tenantAServiceId = serviceA.id;

      const resourceA = await prisma.resource.create({
        data: {
          name: "Kennel A",
          type: "STANDARD_SUITE",
          tenantId: TENANT_A,
        },
      });
      tenantAResourceId = resourceA.id;
    });

    afterAll(async () => {
      // Clean up tenant A data
      await prisma.reservation.deleteMany({ where: { tenantId: TENANT_A } });
      await prisma.resource.deleteMany({ where: { tenantId: TENANT_A } });
      await prisma.service.deleteMany({ where: { tenantId: TENANT_A } });
      await prisma.pet.deleteMany({ where: { tenantId: TENANT_A } });
      await prisma.customer.deleteMany({ where: { tenantId: TENANT_A } });

      await prisma.reservation.deleteMany({ where: { tenantId: TENANT_B } });
    });

    it("should not see other tenant reservations", async () => {
      // Create reservation for tenant A
      const reservationA = await prisma.reservation.create({
        data: {
          customerId: tenantACustomerId,
          petId: tenantAPetId,
          serviceId: tenantAServiceId,
          resourceId: tenantAResourceId,
          startDate: new Date("2025-10-25"),
          endDate: new Date("2025-10-27"),
          status: "CONFIRMED",
          tenantId: TENANT_A,
        },
      });

      // Query as tenant B
      const response = await request(app)
        .get("/api/reservations")
        .set("x-tenant-id", TENANT_B)
        .expect(200);

      // Should not see tenant A's reservation
      const foundReservation = response.body.data.find(
        (r: any) => r.id === reservationA.id
      );
      expect(foundReservation).toBeUndefined();

      // Clean up
      await prisma.reservation.delete({
        where: { id: reservationA.id },
      });
    });

    it("should not allow using other tenant resources", async () => {
      // Try to create reservation for tenant B using tenant A's resource
      const response = await request(app)
        .post("/api/reservations")
        .set("x-tenant-id", TENANT_B)
        .send({
          customerId: testCustomerId, // This won't work either
          petId: testPetId,
          serviceId: testServiceBoardingId,
          resourceId: tenantAResourceId, // Tenant A's resource
          startDate: "2025-10-25",
          endDate: "2025-10-27",
        })
        .expect(400); // Should fail validation

      expect(response.body.error).toBeDefined();
    });
  });
});
