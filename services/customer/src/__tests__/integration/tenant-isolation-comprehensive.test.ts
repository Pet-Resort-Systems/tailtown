/**
 * Comprehensive Tenant Isolation Test Suite
 *
 * Tests all aspects of tenant data isolation:
 * 1. Middleware UUID conversion and validation
 * 2. Controller tenant filtering
 * 3. Cross-tenant data leakage prevention
 * 4. Tenant context validation
 * 5. Database query isolation
 */

// @ts-nocheck

import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../../utils/jwt";
import app from "../../index";
import crypto from "crypto";

const prisma = new PrismaClient();
const isUuid = (value: unknown) => {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
};

describe("Comprehensive Tenant Isolation", () => {
  // Test tenant UUIDs
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();

  // Test data IDs
  let tenantAStaffId: string;
  let tenantBStaffId: string;
  let tenantACustomerId: string;
  let tenantBCustomerId: string;
  let tenantAPetId: string;
  let tenantBPetId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Create test tenants with proper UUIDs
    await prisma.tenant.createMany({
      data: [
        {
          id: tenantAId,
          subdomain: "tenant-a-isolation-test",
          businessName: "Tenant A Isolation Test",
          contactEmail: "isolation-a@test.com",
          contactName: "Contact A",
          isActive: true,
          status: "ACTIVE",
        },
        {
          id: tenantBId,
          subdomain: "tenant-b-isolation-test",
          businessName: "Tenant B Isolation Test",
          contactEmail: "isolation-b@test.com",
          contactName: "Contact B",
          isActive: true,
          status: "ACTIVE",
        },
      ],
      skipDuplicates: true,
    });

    // Create test staff
    const staffA = await prisma.staff.create({
      data: {
        email: "staff-a-isolation@test.com",
        firstName: "Staff",
        lastName: "A",
        password: "$2b$10$testpasswordhash",
        role: "ADMIN",
        tenantId: tenantAId,
        isActive: true,
      },
    });
    tenantAStaffId = staffA.id;

    const staffB = await prisma.staff.create({
      data: {
        email: "staff-b-isolation@test.com",
        firstName: "Staff",
        lastName: "B",
        password: "$2b$10$testpasswordhash",
        role: "ADMIN",
        tenantId: tenantBId,
        isActive: true,
      },
    });
    tenantBStaffId = staffB.id;

    // Create test customers
    const customerA = await prisma.customer.create({
      data: {
        email: "customer-a-isolation@test.com",
        firstName: "Customer",
        lastName: "A",
        tenantId: tenantAId,
      },
    });
    tenantACustomerId = customerA.id;

    const customerB = await prisma.customer.create({
      data: {
        email: "customer-b-isolation@test.com",
        firstName: "Customer",
        lastName: "B",
        tenantId: tenantBId,
      },
    });
    tenantBCustomerId = customerB.id;

    // Create test pets
    const petA = await prisma.pet.create({
      data: {
        name: "Pet A Isolation",
        type: "DOG",
        breed: "Labrador",
        customerId: tenantACustomerId,
        tenantId: tenantAId,
      },
    });
    tenantAPetId = petA.id;

    const petB = await prisma.pet.create({
      data: {
        name: "Pet B Isolation",
        type: "CAT",
        breed: "Persian",
        customerId: tenantBCustomerId,
        tenantId: tenantBId,
      },
    });
    tenantBPetId = petB.id;

    // Generate JWT tokens
    tokenA = generateToken({
      id: tenantAStaffId,
      email: "staff-a-isolation@test.com",
      role: "ADMIN",
      tenantId: tenantAId,
    });

    tokenB = generateToken({
      id: tenantBStaffId,
      email: "staff-b-isolation@test.com",
      role: "ADMIN",
      tenantId: tenantBId,
    });
  });

  afterAll(async () => {
    // Clean up in correct order (respecting foreign keys)
    await prisma.pet.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.customer.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.staff.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
    await prisma.$disconnect();

    // Close any open handles to allow Jest to exit
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("1. Middleware UUID Conversion", () => {
    test("converts subdomain to UUID tenant ID", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(200);
      // Verify middleware converted subdomain to UUID
      const customers = response.body.data;
      customers.forEach((customer: any) => {
        expect(isUuid(customer.tenantId)).toBe(true);
        expect(customer.tenantId).toBe(tenantAId);
      });
    });

    test("accepts UUID tenant ID via x-tenant-id header", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-id", tenantAId);

      expect(response.status).toBe(200);
      const customers = response.body.data;
      customers.forEach((customer: any) => {
        expect(customer.tenantId).toBe(tenantAId);
      });
    });

    test("rejects invalid UUID format", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-id", "not-a-valid-uuid");

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    test("rejects non-existent tenant UUID", async () => {
      const fakeUuid = crypto.randomUUID();
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-id", fakeUuid);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/not found/i);
    });

    test("requires tenant context", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`);
      // No tenant header

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/tenant/i);
    });
  });

  describe("2. Controller Tenant Filtering - Customers", () => {
    test("GET /api/customers returns only tenant-specific data", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(200);

      const customerEmails = response.body.data.map((c: any) => c.email);
      expect(customerEmails).toContain("customer-a-isolation@test.com");
      expect(customerEmails).not.toContain("customer-b-isolation@test.com");

      // Verify all have correct tenant ID
      response.body.data.forEach((customer: any) => {
        expect(customer.tenantId).toBe(tenantAId);
      });
    });

    test("GET /api/customers/:id cannot access other tenant data", async () => {
      const response = await request(app)
        .get(`/api/customers/${tenantBCustomerId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(404);
    });

    test("PUT /api/customers/:id cannot update other tenant data", async () => {
      const response = await request(app)
        .put(`/api/customers/${tenantBCustomerId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test")
        .send({
          firstName: "Hacked",
          lastName: "Customer",
        });

      expect(response.status).toBe(404);

      // Verify data wasn't changed
      const customer = await prisma.customer.findUnique({
        where: { id: tenantBCustomerId },
      });
      expect(customer?.firstName).not.toBe("Hacked");
    });

    test("DELETE /api/customers/:id cannot delete other tenant data", async () => {
      const response = await request(app)
        .delete(`/api/customers/${tenantBCustomerId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(404);

      // Verify data still exists
      const customer = await prisma.customer.findUnique({
        where: { id: tenantBCustomerId },
      });
      expect(customer).not.toBeNull();
    });
  });

  describe("3. Controller Tenant Filtering - Pets", () => {
    test("GET /api/pets returns only tenant-specific data", async () => {
      const response = await request(app)
        .get("/api/pets")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(200);

      const petNames = response.body.data.map((p: any) => p.name);
      expect(petNames).toContain("Pet A Isolation");
      expect(petNames).not.toContain("Pet B Isolation");

      // Verify all have correct tenant ID
      response.body.data.forEach((pet: any) => {
        expect(pet.tenantId).toBe(tenantAId);
      });
    });

    test("GET /api/pets/:id cannot access other tenant data", async () => {
      const response = await request(app)
        .get(`/api/pets/${tenantBPetId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(404);
    });

    test("PUT /api/pets/:id cannot update other tenant data", async () => {
      const response = await request(app)
        .put(`/api/pets/${tenantBPetId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test")
        .send({
          name: "Hacked Pet",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("4. Controller Tenant Filtering - Staff", () => {
    test("GET /api/staff returns only tenant-specific data", async () => {
      const response = await request(app)
        .get("/api/staff")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(200);

      const staffEmails = response.body.data.map((s: any) => s.email);
      expect(staffEmails).toContain("staff-a-isolation@test.com");
      expect(staffEmails).not.toContain("staff-b-isolation@test.com");

      // Verify all have correct tenant ID
      response.body.data.forEach((staff: any) => {
        expect(staff.tenantId).toBe(tenantAId);
      });
    });

    test("GET /api/staff/:id cannot access other tenant data", async () => {
      const response = await request(app)
        .get(`/api/staff/${tenantBStaffId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(404);
    });
  });

  describe("5. Cross-Tenant Data Leakage Prevention", () => {
    test("search queries do not return other tenant data", async () => {
      const response = await request(app)
        .get("/api/customers?search=Customer")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(200);

      // Should find Customer A but not Customer B
      const customerEmails = response.body.data.map((c: any) => c.email);
      expect(customerEmails).toContain("customer-a-isolation@test.com");
      expect(customerEmails).not.toContain("customer-b-isolation@test.com");
    });

    test("pagination does not leak data across tenants", async () => {
      const response = await request(app)
        .get("/api/customers?page=1&limit=100")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(200);

      // Verify no cross-tenant data in any page
      response.body.data.forEach((customer: any) => {
        expect(customer.tenantId).toBe(tenantAId);
      });
    });

    test("related data (pets) only from same tenant", async () => {
      const response = await request(app)
        .get(`/api/customers/${tenantACustomerId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test");

      expect(response.status).toBe(200);

      // Check that related pets are also from the same tenant
      if (response.body.data.pets && response.body.data.pets.length > 0) {
        response.body.data.pets.forEach((pet: any) => {
          expect(pet.tenantId).toBe(tenantAId);
        });
      }
    });

    test("tenant B cannot see tenant A data", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenB}`)
        .set("x-tenant-subdomain", "tenant-b-isolation-test");

      expect(response.status).toBe(200);

      const customerEmails = response.body.data.map((c: any) => c.email);
      expect(customerEmails).toContain("customer-b-isolation@test.com");
      expect(customerEmails).not.toContain("customer-a-isolation@test.com");
    });
  });

  describe("6. Tenant Context Validation", () => {
    test("rejects request with inactive tenant", async () => {
      // Create inactive tenant
      const inactiveTenantId = crypto.randomUUID();
      await prisma.tenant.create({
        data: {
          id: inactiveTenantId,
          subdomain: "inactive-isolation-test",
          businessName: "Inactive Isolation Test",
          contactEmail: "inactive-isolation@test.com",
          contactName: "Inactive",
          isActive: false,
          status: "PAUSED",
        },
      });

      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "inactive-isolation-test");

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/inactive/i);

      // Cleanup
      await prisma.tenant.delete({ where: { id: inactiveTenantId } });
    });

    test("rejects request with paused tenant", async () => {
      // Create paused tenant
      const pausedTenantId = crypto.randomUUID();
      await prisma.tenant.create({
        data: {
          id: pausedTenantId,
          subdomain: "paused-isolation-test",
          businessName: "Paused Isolation Test",
          contactEmail: "paused-isolation@test.com",
          contactName: "Paused",
          isActive: true,
          isPaused: true,
          status: "ACTIVE",
        },
      });

      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "paused-isolation-test");

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.tenant.delete({ where: { id: pausedTenantId } });
    });
  });

  describe("7. Database Query Isolation", () => {
    test("direct Prisma queries respect tenant isolation", async () => {
      // Query customers for tenant A
      const customersA = await prisma.customer.findMany({
        where: { tenantId: tenantAId },
      });

      // Verify no tenant B data
      customersA.forEach((customer) => {
        expect(customer.tenantId).toBe(tenantAId);
      });

      const hasCustomerB = customersA.some(
        (customer) => customer.id === tenantBCustomerId
      );
      expect(hasCustomerB).toBe(false);
    });

    test("count queries respect tenant isolation", async () => {
      const countA = await prisma.customer.count({
        where: { tenantId: tenantAId },
      });

      const countB = await prisma.customer.count({
        where: { tenantId: tenantBId },
      });

      // Each tenant should have at least their test customer
      expect(countA).toBeGreaterThanOrEqual(1);
      expect(countB).toBeGreaterThanOrEqual(1);

      // Verify counts are independent
      const totalCount = await prisma.customer.count({
        where: {
          tenantId: { in: [tenantAId, tenantBId] },
        },
      });

      expect(totalCount).toBe(countA + countB);
    });

    test("aggregate queries respect tenant isolation", async () => {
      const aggregateA = await prisma.customer.aggregate({
        where: { tenantId: tenantAId },
        _count: true,
      });

      const aggregateB = await prisma.customer.aggregate({
        where: { tenantId: tenantBId },
        _count: true,
      });

      expect(aggregateA._count).toBeGreaterThanOrEqual(1);
      expect(aggregateB._count).toBeGreaterThanOrEqual(1);
    });

    test("findFirst respects tenant isolation", async () => {
      const customer = await prisma.customer.findFirst({
        where: {
          tenantId: tenantAId,
          email: "customer-b-isolation@test.com", // Tenant B email
        },
      });

      // Should not find tenant B customer when filtering by tenant A
      expect(customer).toBeNull();
    });
  });

  describe("8. Email Uniqueness Per Tenant", () => {
    test("allows same email across different tenants", async () => {
      // Create customer with same email in tenant B
      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${tokenB}`)
        .set("x-tenant-subdomain", "tenant-b-isolation-test")
        .send({
          email: "customer-a-isolation@test.com", // Same as tenant A
          firstName: "Different",
          lastName: "Customer",
        });

      // Should succeed because it's a different tenant
      expect([200, 201]).toContain(response.status);

      // Cleanup
      if (response.body.data?.id) {
        await prisma.customer.delete({
          where: { id: response.body.data.id },
        });
      }
    });

    test("prevents duplicate email within same tenant", async () => {
      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-subdomain", "tenant-a-isolation-test")
        .send({
          email: "customer-a-isolation@test.com", // Duplicate in same tenant
          firstName: "Duplicate",
          lastName: "Customer",
        });

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.error).toMatch(
        /already|exists|duplicate/i
      );
    });
  });
});
