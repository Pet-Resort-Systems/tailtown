/**
 * Resource Type Filter Tests
 *
 * These tests ensure resource type filtering works correctly,
 * including case-insensitive matching and suite type wildcards.
 */

import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../../utils/jwt";
import app from "../../index";

const prisma = new PrismaClient();

describe("Resource Type Filtering", () => {
  let testToken: string;
  let tenantId: string;
  let suiteId: string;
  let kennelId: string;
  let standardSuiteId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        businessName: "Test Filter Tenant",
        subdomain: "test-filter",
        contactName: "Test",
        contactEmail: "test-filter@example.com",
        status: "ACTIVE",
        isActive: true,
        isPaused: false,
      },
      select: { id: true },
    });
    tenantId = tenant.id;

    // Create test resources
    const suite = await prisma.resource.create({
      data: {
        name: "Suite A",
        type: "SUITE",
        capacity: 2,
        tenantId,
        isActive: true,
      },
    });
    suiteId = suite.id;

    const kennel = await prisma.resource.create({
      data: {
        name: "Kennel B",
        type: "KENNEL",
        capacity: 1,
        tenantId,
        isActive: true,
      },
    });
    kennelId = kennel.id;

    const standardSuite = await prisma.resource.create({
      data: {
        name: "Standard Suite C",
        type: "STANDARD_SUITE",
        capacity: 2,
        tenantId,
        isActive: true,
      },
    });
    standardSuiteId = standardSuite.id;

    // Generate test token
    testToken = generateToken({
      id: "test-user",
      email: "test@example.com",
      role: "ADMIN",
      tenantId,
    });
  });

  afterAll(async () => {
    await prisma.resource.deleteMany({
      where: { tenantId },
    });
    await prisma.tenant.delete({
      where: { id: tenantId },
    });
    await prisma.$disconnect();
  });

  describe("Suite Type Filter", () => {
    test("type=suite returns all suite types including SUITE", async () => {
      const response = await request(app)
        .get("/api/resources?type=suite")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const types = response.body.data.map((r: any) => r.type);
      expect(types).toContain("SUITE");
      expect(types).toContain("STANDARD_SUITE");
      expect(types).not.toContain("KENNEL");
    });

    test("type=SUITE (uppercase) works", async () => {
      const response = await request(app)
        .get("/api/resources?type=SUITE")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    test("type=Suite (mixed case) works", async () => {
      const response = await request(app)
        .get("/api/resources?type=Suite")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Kennel Type Filter", () => {
    test("type=kennel returns only kennels", async () => {
      const response = await request(app)
        .get("/api/resources?type=kennel")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);

      const types = response.body.data.map((r: any) => r.type);
      expect(types).toContain("KENNEL");
      expect(types).not.toContain("SUITE");
      expect(types).not.toContain("STANDARD_SUITE");
    });

    test("type=KENNEL (uppercase) works", async () => {
      const response = await request(app)
        .get("/api/resources?type=KENNEL")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("No Filter", () => {
    test("returns all resource types when no filter specified", async () => {
      const response = await request(app)
        .get("/api/resources")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      const types = response.body.data.map((r: any) => r.type);
      expect(types).toContain("SUITE");
      expect(types).toContain("KENNEL");
      expect(types).toContain("STANDARD_SUITE");
    });
  });

  describe("Case Sensitivity", () => {
    test("lowercase and uppercase filters return same results", async () => {
      const lowerResponse = await request(app)
        .get("/api/resources?type=suite")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      const upperResponse = await request(app)
        .get("/api/resources?type=SUITE")
        .set("Authorization", `Bearer ${testToken}`)
        .set("x-tenant-subdomain", "test-filter");

      expect(lowerResponse.body.data.length).toBe(
        upperResponse.body.data.length
      );
    });
  });
});
