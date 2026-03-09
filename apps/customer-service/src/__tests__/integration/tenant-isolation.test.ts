/**
 * Comprehensive Tenant Data Isolation Tests
 *
 * These tests ensure that multi-tenant data isolation is working correctly.
 * Each tenant should only be able to access their own data.
 *
 * Test Coverage:
 * 1. Middleware UUID conversion
 * 2. Controller tenant filtering
 * 3. Cross-tenant data leakage prevention
 * 4. Tenant context validation
 * 5. Database query isolation
 */

import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../../utils/jwt";
import app from "../../index";
import crypto from "crypto";

const prisma = new PrismaClient();

describe("Tenant Data Isolation", () => {
  // Test data IDs
  let tenantAStaffId: string;
  let tenantBStaffId: string;
  let tenantACustomerId: string;
  let tenantBCustomerId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Create test staff for tenant A
    const staffA = await prisma.staff.create({
      data: {
        email: "admin-a@test.com",
        firstName: "Admin",
        lastName: "A",
        password: "$2b$10$test", // Hashed password
        role: "ADMIN",
        tenantId: "tenant-a",
        isActive: true,
      },
    });
    tenantAStaffId = staffA.id;

    // Create test staff for tenant B
    const staffB = await prisma.staff.create({
      data: {
        email: "admin-b@test.com",
        firstName: "Admin",
        lastName: "B",
        password: "$2b$10$test",
        role: "ADMIN",
        tenantId: "tenant-b",
        isActive: true,
      },
    });
    tenantBStaffId = staffB.id;

    // Create test customers
    const customerA = await prisma.customer.create({
      data: {
        email: "customer-a@test.com",
        firstName: "Customer",
        lastName: "A",
        tenantId: "tenant-a",
      },
    });
    tenantACustomerId = customerA.id;

    const customerB = await prisma.customer.create({
      data: {
        email: "customer-b@test.com",
        firstName: "Customer",
        lastName: "B",
        tenantId: "tenant-b",
      },
    });
    tenantBCustomerId = customerB.id;

    // Generate tokens
    tokenA = generateToken({
      id: tenantAStaffId,
      email: "admin-a@test.com",
      role: "ADMIN",
      tenantId: "tenant-a",
    });

    tokenB = generateToken({
      id: tenantBStaffId,
      email: "admin-b@test.com",
      role: "ADMIN",
      tenantId: "tenant-b",
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.customer.deleteMany({
      where: { tenantId: { in: ["tenant-a", "tenant-b"] } },
    });
    await prisma.staff.deleteMany({
      where: { tenantId: { in: ["tenant-a", "tenant-b"] } },
    });
    await prisma.$disconnect();
  });

  describe("Staff Endpoint Isolation", () => {
    test("returns only tenant-specific staff", async () => {
      const response = await request(app)
        .get("/api/staff")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-id", "tenant-a");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");

      // Should only return staff from tenant-a
      const staffEmails = response.body.data.map((s: any) => s.email);
      expect(staffEmails).toContain("admin-a@test.com");
      expect(staffEmails).not.toContain("admin-b@test.com");
    });

    test("tenant B cannot see tenant A staff", async () => {
      const response = await request(app)
        .get("/api/staff")
        .set("Authorization", `Bearer ${tokenB}`)
        .set("x-tenant-id", "tenant-b");

      expect(response.status).toBe(200);

      const staffEmails = response.body.data.map((s: any) => s.email);
      expect(staffEmails).toContain("admin-b@test.com");
      expect(staffEmails).not.toContain("admin-a@test.com");
    });
  });

  describe("Customer Endpoint Isolation", () => {
    test("returns only tenant-specific customers", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-id", "tenant-a");

      expect(response.status).toBe(200);

      const customerEmails = response.body.data.map((c: any) => c.email);
      expect(customerEmails).toContain("customer-a@test.com");
      expect(customerEmails).not.toContain("customer-b@test.com");
    });

    test("cannot access other tenant customers", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-id", "tenant-a");

      expect(response.status).toBe(200);

      // Verify no cross-tenant data
      const allCustomers = response.body.data;
      const hasCrossTenantData = allCustomers.some(
        (c: any) => c.tenantId !== "tenant-a"
      );
      expect(hasCrossTenantData).toBe(false);
    });
  });

  describe("Email Uniqueness Per Tenant", () => {
    test("allows same email across different tenants", async () => {
      // This should succeed - same email in different tenant
      const response = await request(app)
        .post("/api/staff")
        .set("Authorization", `Bearer ${tokenB}`)
        .set("x-tenant-id", "tenant-b")
        .send({
          email: "admin-a@test.com", // Same email as tenant-a
          firstName: "Different",
          lastName: "Person",
          password: "Password123!",
          role: "STAFF",
        });

      // Should succeed because it's a different tenant
      expect([200, 201]).toContain(response.status);
    });

    test("prevents duplicate email within same tenant", async () => {
      const response = await request(app)
        .post("/api/staff")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("x-tenant-id", "tenant-a")
        .send({
          email: "admin-a@test.com", // Duplicate in same tenant
          firstName: "Duplicate",
          lastName: "User",
          password: "Password123!",
          role: "STAFF",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already in use/i);
    });
  });
});
