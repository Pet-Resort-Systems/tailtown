/**
 * Customer CRUD Controller Integration Tests
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
  getAllCustomers,
  getCustomerById,
  getCustomerPets,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  lookupCustomerByEmail,
} from "../customer/customer-crud.controller";
import { TenantRequest } from "../../middleware/tenant.middleware";

describe("Customer CRUD Controller Integration Tests", () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`customer-crud-test-${Date.now()}`);

    // Create some test customers
    const customer1 = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: "John",
        lastName: "Doe",
        email: `john.doe-${Date.now()}@example.com`,
        phone: "555-123-4567",
        isActive: true,
      },
    });
    testCustomerIds.push(customer1.id);

    const customer2 = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: "Jane",
        lastName: "Smith",
        email: `jane.smith-${Date.now()}@example.com`,
        phone: "555-987-6543",
        isActive: true,
      },
    });
    testCustomerIds.push(customer2.id);

    const customer3 = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: "Bob",
        lastName: "Inactive",
        email: `bob.inactive-${Date.now()}@example.com`,
        phone: "555-000-0000",
        isActive: false,
      },
    });
    testCustomerIds.push(customer3.id);
  });

  afterAll(async () => {
    // Clean up customers and their related data
    for (const customerId of testCustomerIds) {
      await prisma.pet.deleteMany({ where: { customerId } }).catch(() => {});
      await prisma.customer
        .delete({ where: { id: customerId } })
        .catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllCustomers", () => {
    it("should return paginated customers", async () => {
      const req = {
        tenantId: testTenantId,
        query: { page: "1", limit: "10" },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllCustomers(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(3);
      expect(responseData.totalPages).toBeGreaterThanOrEqual(1);
      expect(responseData.currentPage).toBe(1);
    });

    it("should filter by isActive", async () => {
      const req = {
        tenantId: testTenantId,
        query: { isActive: "true" },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllCustomers(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      responseData.data.forEach((customer: any) => {
        expect(customer.isActive).toBe(true);
      });
    });

    it("should search by name", async () => {
      const req = {
        tenantId: testTenantId,
        query: { search: "John" },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllCustomers(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBeGreaterThanOrEqual(1);
    });

    it("should search by phone number", async () => {
      const req = {
        tenantId: testTenantId,
        query: { search: "5551234567" },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllCustomers(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getCustomerById", () => {
    it("should return customer by ID", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: testCustomerIds[0] },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getCustomerById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.id).toBe(testCustomerIds[0]);
      expect(responseData.data.firstName).toBe("John");
    });

    it("should return 404 for non-existent customer", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getCustomerById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe("Customer not found");
    });
  });

  describe("getCustomerPets", () => {
    let customerWithPetId: string;

    beforeAll(async () => {
      // Create customer with pet
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: "Pet",
          lastName: "Owner",
          email: `pet.owner-${Date.now()}@example.com`,
          phone: "555-111-2222",
        },
      });
      customerWithPetId = customer.id;
      testCustomerIds.push(customerWithPetId);

      // Create pet for customer
      await prisma.pet.create({
        data: {
          tenantId: testTenantId,
          customerId: customerWithPetId,
          name: "Buddy",
          type: "DOG",
          breed: "Golden Retriever",
        },
      });
    });

    it("should return customer pets", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: customerWithPetId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getCustomerPets(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.results).toBe(1);
      expect(responseData.data[0].name).toBe("Buddy");
    });

    it("should return 404 for non-existent customer", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getCustomerPets(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe("Customer not found");
    });
  });

  describe("createCustomer", () => {
    it("should create a new customer", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          firstName: "New",
          lastName: "Customer",
          email: `new.customer-${Date.now()}@example.com`,
          phone: "555-333-4444",
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createCustomer(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.firstName).toBe("New");
      expect(responseData.data.lastName).toBe("Customer");
      testCustomerIds.push(responseData.data.id);
    });

    it("should sanitize empty fields", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          firstName: "Sanitized",
          lastName: "Customer",
          email: `sanitized-${Date.now()}@example.com`,
          phone: "555-555-5555",
          notes: "", // Empty string should be removed
          tags: [], // Empty array should be removed
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createCustomer(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      testCustomerIds.push(responseData.data.id);
    });
  });

  describe("updateCustomer", () => {
    let updateCustomerId: string;

    beforeAll(async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: "Update",
          lastName: "Test",
          email: `update.test-${Date.now()}@example.com`,
          phone: "555-666-7777",
        },
      });
      updateCustomerId = customer.id;
      testCustomerIds.push(updateCustomerId);
    });

    it("should update customer fields", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: updateCustomerId },
        query: {},
        body: {
          firstName: "Updated",
          lastName: "Name",
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateCustomer(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.firstName).toBe("Updated");
      expect(responseData.data.lastName).toBe("Name");
    });

    it("should return 404 for non-existent customer", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: { firstName: "Test" },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateCustomer(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe("Customer not found");
    });
  });

  describe("deleteCustomer", () => {
    let deleteCustomerId: string;

    beforeAll(async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: "Delete",
          lastName: "Test",
          email: `delete.test-${Date.now()}@example.com`,
          phone: "555-888-9999",
        },
      });
      deleteCustomerId = customer.id;
      testCustomerIds.push(deleteCustomerId);
    });

    it("should soft delete customer", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: deleteCustomerId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deleteCustomer(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.message).toContain("deactivated");
    });

    it("should return 404 for non-existent customer", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deleteCustomer(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe("Customer not found");
    });
  });

  describe("lookupCustomerByEmail", () => {
    let lookupEmail: string;

    beforeAll(async () => {
      lookupEmail = `lookup-${Date.now()}@example.com`;
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: "Lookup",
          lastName: "Test",
          email: lookupEmail,
          phone: "555-000-1111",
        },
      });
      testCustomerIds.push(customer.id);
    });

    it("should find customer by email", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: { email: lookupEmail },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await lookupCustomerByEmail(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 for non-existent email", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: { email: "nonexistent@example.com" },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await lookupCustomerByEmail(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.error).toBe("Customer not found");
    });
  });
});
