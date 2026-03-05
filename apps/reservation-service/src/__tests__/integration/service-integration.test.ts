/**
 * Service Integration Tests
 *
 * Tests the CustomerServiceClient which handles communication
 * between reservation-service and customer-service.
 *
 * Uses Jest mocks to simulate API responses.
 */

import { CustomerServiceClient } from "../../clients/customer-service.client";

// Mock axios module
const mockGet = jest.fn();
const mockAxiosCreate = jest.fn(() => ({
  get: mockGet,
  interceptors: {
    response: { use: jest.fn() },
  },
}));

jest.mock("axios", () => ({
  create: () => mockAxiosCreate(),
  default: { create: () => mockAxiosCreate() },
}));

describe("Service Integration Tests", () => {
  const tenantId = "test-tenant-123";
  const customerId = "customer-uuid-456";
  const petId = "pet-uuid-789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Customer Verification", () => {
    it("should successfully verify a customer exists", async () => {
      const customerData = {
        id: customerId,
        tenantId: tenantId,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: customerData },
      });

      const client = new CustomerServiceClient();
      const result = await client.verifyCustomer(customerId, tenantId);
      expect(result).toBe(true);
    });

    it("should return full customer data", async () => {
      const customerData = {
        id: customerId,
        tenantId: tenantId,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "555-1234",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: customerData },
      });

      const client = new CustomerServiceClient();
      const result = await client.getCustomer(customerId, tenantId);
      expect(result).toEqual(customerData);
    });

    it("should reject customer from different tenant", async () => {
      const wrongTenantId = "wrong-tenant-999";
      const customerData = {
        id: customerId,
        tenantId: tenantId, // Customer belongs to different tenant
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: customerData },
      });

      const client = new CustomerServiceClient();
      await expect(
        client.getCustomer(customerId, wrongTenantId)
      ).rejects.toThrow(/does not belong to this tenant/i);
    });

    it("should pass tenant ID header on requests", async () => {
      const customerData = {
        id: customerId,
        tenantId: tenantId,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: customerData },
      });

      const client = new CustomerServiceClient();
      await client.getCustomer(customerId, tenantId);

      expect(mockGet).toHaveBeenCalledWith(
        `/api/customers/${customerId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-tenant-id": tenantId,
          }),
        })
      );
    });
  });

  describe("Pet Verification", () => {
    it("should successfully verify a pet exists", async () => {
      const petData = {
        id: petId,
        tenantId: tenantId,
        customerId: customerId,
        name: "Buddy",
        species: "DOG",
        breed: "Golden Retriever",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: petData },
      });

      const client = new CustomerServiceClient();
      const result = await client.verifyPet(petId, tenantId);
      expect(result).toBe(true);
    });

    it("should return full pet data", async () => {
      const petData = {
        id: petId,
        tenantId: tenantId,
        customerId: customerId,
        name: "Max",
        species: "DOG",
        breed: "Labrador",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: petData },
      });

      const client = new CustomerServiceClient();
      const result = await client.getPet(petId, tenantId);
      expect(result).toEqual(petData);
    });

    it("should reject pet from different tenant", async () => {
      const wrongTenantId = "wrong-tenant-999";
      const petData = {
        id: petId,
        tenantId: tenantId, // Pet belongs to different tenant
        customerId: customerId,
        name: "Buddy",
        species: "DOG",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: petData },
      });

      const client = new CustomerServiceClient();
      await expect(client.getPet(petId, wrongTenantId)).rejects.toThrow(
        /does not belong to this tenant/i
      );
    });
  });

  describe("Health Check", () => {
    it("should return true when customer service is healthy", async () => {
      mockGet.mockResolvedValueOnce({ status: 200 });

      const client = new CustomerServiceClient();
      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it("should return false when customer service is down", async () => {
      mockGet.mockRejectedValueOnce(new Error("Service unavailable"));

      const client = new CustomerServiceClient();
      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe("Tenant Isolation Across Services", () => {
    it("should prevent accessing resources from other tenants", async () => {
      const tenantA = "tenant-a";
      const tenantB = "tenant-b";

      // Customer belongs to tenant A but request is from tenant B
      mockGet.mockResolvedValueOnce({
        data: {
          status: "success",
          data: {
            id: customerId,
            tenantId: tenantA, // Different tenant!
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
            isActive: true,
          },
        },
      });

      const client = new CustomerServiceClient();
      await expect(client.getCustomer(customerId, tenantB)).rejects.toThrow(
        /does not belong to this tenant/i
      );
    });

    it("should allow access to own tenant resources", async () => {
      const customerData = {
        id: customerId,
        tenantId: tenantId,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        isActive: true,
      };

      mockGet.mockResolvedValueOnce({
        data: { status: "success", data: customerData },
      });

      const client = new CustomerServiceClient();
      const result = await client.getCustomer(customerId, tenantId);
      expect(result.tenantId).toBe(tenantId);
    });
  });
});
