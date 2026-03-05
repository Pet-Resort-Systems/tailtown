/**
 * Daycare Pass Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Response, NextFunction } from "express";
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from "../../test/setup-test-db";
import {
  getPassPackages,
  createPassPackage,
  updatePassPackage,
  deletePassPackage,
  getCustomerPasses,
  purchasePass,
} from "../daycare-pass.controller";

// Extended request type
interface TenantRequest {
  tenantId?: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, any>;
  user?: { id: string; email: string; role: string };
}

describe("Daycare Pass Controller Integration Tests", () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerId: string;
  let testPackageIds: string[] = [];
  let testPassIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`daycare-test-${Date.now()}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: "Daycare",
        lastName: "Test",
        email: `daycare-test-${Date.now()}@example.com`,
        phone: "555-0600",
      },
    });
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Clean up passes first
    for (const passId of testPassIds) {
      await prisma.daycarePassRedemption
        .deleteMany({ where: { customerPassId: passId } })
        .catch(() => {});
      await prisma.customerDaycarePass
        .delete({ where: { id: passId } })
        .catch(() => {});
    }
    // Clean up packages
    for (const packageId of testPackageIds) {
      await prisma.daycarePassPackage
        .delete({ where: { id: packageId } })
        .catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Pass Package Management", () => {
    describe("getPassPackages", () => {
      beforeAll(async () => {
        // Create test packages
        const pkg1 = await prisma.daycarePassPackage.create({
          data: {
            tenantId: testTenantId,
            name: "5-Day Pass",
            passCount: 5,
            price: 100,
            regularPricePerDay: 25,
            discountPercent: 20,
            validityDays: 90,
            isActive: true,
            sortOrder: 1,
          },
        });
        testPackageIds.push(pkg1.id);

        const pkg2 = await prisma.daycarePassPackage.create({
          data: {
            tenantId: testTenantId,
            name: "10-Day Pass",
            passCount: 10,
            price: 180,
            regularPricePerDay: 25,
            discountPercent: 28,
            validityDays: 180,
            isActive: true,
            sortOrder: 2,
          },
        });
        testPackageIds.push(pkg2.id);

        const pkg3 = await prisma.daycarePassPackage.create({
          data: {
            tenantId: testTenantId,
            name: "Inactive Pass",
            passCount: 3,
            price: 60,
            regularPricePerDay: 25,
            discountPercent: 20,
            validityDays: 30,
            isActive: false,
            sortOrder: 3,
          },
        });
        testPackageIds.push(pkg3.id);
      });

      it("should return active packages only by default", async () => {
        const req = {
          tenantId: testTenantId,
          query: {},
          params: {},
          body: {},
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await getPassPackages(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseData.results).toBe(2); // Only active packages
        responseData.data.forEach((pkg: any) => {
          expect(pkg.isActive).toBe(true);
        });
      });

      it("should include inactive packages when requested", async () => {
        const req = {
          tenantId: testTenantId,
          query: { includeInactive: "true" },
          params: {},
          body: {},
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await getPassPackages(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseData.results).toBe(3); // All packages
      });

      it("should call next with error when tenantId is missing", async () => {
        const req = {
          query: {},
          params: {},
          body: {},
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await getPassPackages(req as any, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.message).toBe("Tenant ID is required");
      });
    });

    describe("createPassPackage", () => {
      it("should create a new pass package", async () => {
        const req = {
          tenantId: testTenantId,
          query: {},
          params: {},
          body: {
            name: `New Package ${Date.now()}`,
            passCount: 7,
            price: 140,
            regularPricePerDay: 25,
            discountPercent: 20,
            validityDays: 120,
          },
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await createPassPackage(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseData = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseData.data.passCount).toBe(7);
        expect(responseData.data.price).toBe(140);
        testPackageIds.push(responseData.data.id);
      });

      it("should reject package with missing required fields", async () => {
        const req = {
          tenantId: testTenantId,
          query: {},
          params: {},
          body: {
            name: "Incomplete Package",
            // Missing passCount, price, etc.
          },
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await createPassPackage(req as any, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.message).toContain("Missing required fields");
      });
    });

    describe("updatePassPackage", () => {
      let updatePackageId: string;

      beforeAll(async () => {
        const pkg = await prisma.daycarePassPackage.create({
          data: {
            tenantId: testTenantId,
            name: "Update Test Package",
            passCount: 5,
            price: 100,
            regularPricePerDay: 25,
            discountPercent: 20,
            validityDays: 60,
            isActive: true,
          },
        });
        updatePackageId = pkg.id;
        testPackageIds.push(updatePackageId);
      });

      it("should update package fields", async () => {
        const req = {
          tenantId: testTenantId,
          params: { id: updatePackageId },
          query: {},
          body: {
            price: 120,
            discountPercent: 25,
          },
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await updatePassPackage(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseData.data.price).toBe(120);
        expect(responseData.data.discountPercent).toBe(25);
      });

      it("should return 404 for non-existent package", async () => {
        const req = {
          tenantId: testTenantId,
          params: { id: "00000000-0000-0000-0000-000000000000" },
          query: {},
          body: { price: 150 },
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await updatePassPackage(req as any, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.message).toBe("Pass package not found");
      });
    });

    describe("deletePassPackage", () => {
      let deletePackageId: string;

      beforeAll(async () => {
        const pkg = await prisma.daycarePassPackage.create({
          data: {
            tenantId: testTenantId,
            name: "Delete Test Package",
            passCount: 3,
            price: 60,
            regularPricePerDay: 25,
            discountPercent: 20,
            validityDays: 30,
            isActive: true,
          },
        });
        deletePackageId = pkg.id;
        testPackageIds.push(deletePackageId);
      });

      it("should soft delete (deactivate) package", async () => {
        const req = {
          tenantId: testTenantId,
          params: { id: deletePackageId },
          query: {},
          body: {},
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await deletePassPackage(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);

        // Verify it's deactivated
        const pkg = await prisma.daycarePassPackage.findUnique({
          where: { id: deletePackageId },
        });
        expect(pkg?.isActive).toBe(false);
      });

      it("should return 404 for non-existent package", async () => {
        const req = {
          tenantId: testTenantId,
          params: { id: "00000000-0000-0000-0000-000000000000" },
          query: {},
          body: {},
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await deletePassPackage(req as any, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.message).toBe("Pass package not found");
      });
    });
  });

  describe("Customer Pass Management", () => {
    let purchasePackageId: string;

    beforeAll(async () => {
      // Create a package for purchase tests
      const pkg = await prisma.daycarePassPackage.create({
        data: {
          tenantId: testTenantId,
          name: "Purchase Test Package",
          passCount: 5,
          price: 100,
          regularPricePerDay: 25,
          discountPercent: 20,
          validityDays: 90,
          isActive: true,
        },
      });
      purchasePackageId = pkg.id;
      testPackageIds.push(purchasePackageId);
    });

    describe("purchasePass", () => {
      it("should purchase a pass for customer", async () => {
        const req = {
          tenantId: testTenantId,
          params: {},
          query: {},
          body: {
            customerId: testCustomerId,
            packageId: purchasePackageId,
          },
          user: { id: "staff-1", email: "staff@test.com", role: "ADMIN" },
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await purchasePass(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseData = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseData.data.passesPurchased).toBe(5);
        expect(responseData.data.passesRemaining).toBe(5);
        expect(responseData.data.passesUsed).toBe(0);
        testPassIds.push(responseData.data.id);
      });

      it("should reject purchase with missing customerId", async () => {
        const req = {
          tenantId: testTenantId,
          params: {},
          query: {},
          body: {
            packageId: purchasePackageId,
          },
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await purchasePass(req as any, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.message).toContain("Customer ID");
      });

      it("should reject purchase with invalid packageId", async () => {
        const req = {
          tenantId: testTenantId,
          params: {},
          query: {},
          body: {
            customerId: testCustomerId,
            packageId: "00000000-0000-0000-0000-000000000000",
          },
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await purchasePass(req as any, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = (mockNext as jest.Mock).mock.calls[0][0];
        expect(error.message).toContain("not found");
      });
    });

    describe("getCustomerPasses", () => {
      beforeAll(async () => {
        // Create additional passes for the customer
        const pass = await prisma.customerDaycarePass.create({
          data: {
            tenantId: testTenantId,
            customerId: testCustomerId,
            packageId: purchasePackageId,
            passesPurchased: 10,
            passesRemaining: 7,
            passesUsed: 3,
            purchasePrice: 180,
            pricePerPass: 18,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: "ACTIVE",
          },
        });
        testPassIds.push(pass.id);
      });

      it("should return customer passes with summary", async () => {
        const req = {
          tenantId: testTenantId,
          params: { customerId: testCustomerId },
          query: {},
          body: {},
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await getCustomerPasses(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseData.summary).toBeDefined();
        expect(responseData.summary.totalPassesRemaining).toBeGreaterThan(0);
        expect(responseData.data.length).toBeGreaterThan(0);
      });

      it("should filter active passes only by default", async () => {
        const req = {
          tenantId: testTenantId,
          params: { customerId: testCustomerId },
          query: {},
          body: {},
        } as unknown as TenantRequest;
        const res = createMockResponse();

        await getCustomerPasses(req as any, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = (res.json as jest.Mock).mock.calls[0][0];
        responseData.data.forEach((pass: any) => {
          expect(pass.status).toBe("ACTIVE");
        });
      });
    });
  });
});
