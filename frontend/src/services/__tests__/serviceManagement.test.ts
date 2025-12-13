/**
 * Service Management Tests
 * Tests for service management API layer
 */

import { serviceManagement } from "../serviceManagement";
import api from "../api";

jest.mock("../api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("serviceManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllServices", () => {
    it("should fetch all services", async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: "s1",
              name: "Boarding",
              price: 45,
              serviceCategory: "BOARDING",
            },
            {
              id: "s2",
              name: "Daycare",
              price: 35,
              serviceCategory: "DAYCARE",
            },
          ],
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await serviceManagement.getAllServices();

      expect(mockApi.get).toHaveBeenCalledWith("/api/services");
      expect(result.data).toHaveLength(2);
    });

    it("should handle empty services", async () => {
      const mockResponse = { data: { data: [] } };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await serviceManagement.getAllServices();

      expect(result.data).toHaveLength(0);
    });

    it("should handle API errors", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      await expect(serviceManagement.getAllServices()).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getServiceById", () => {
    it("should fetch a service by ID", async () => {
      const mockService = {
        id: "s1",
        name: "Boarding",
        price: 45,
        serviceCategory: "BOARDING",
        description: "Overnight boarding",
      };

      mockApi.get.mockResolvedValue({ data: mockService });

      const result = await serviceManagement.getServiceById("s1");

      expect(mockApi.get).toHaveBeenCalledWith("/api/services/s1");
      expect(result.name).toBe("Boarding");
    });

    it("should handle not found", async () => {
      mockApi.get.mockRejectedValue(new Error("Service not found"));

      await expect(serviceManagement.getServiceById("invalid")).rejects.toThrow(
        "Service not found"
      );
    });
  });

  describe("createService", () => {
    it("should create a new service", async () => {
      const newService = {
        name: "Grooming",
        price: 65,
        serviceCategory: "GROOMING",
        description: "Full grooming service",
      };

      const mockResponse = {
        data: { id: "s3", ...newService },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await serviceManagement.createService(newService);

      expect(mockApi.post).toHaveBeenCalledWith("/api/services", newService);
      expect(result.id).toBe("s3");
      expect(result.name).toBe("Grooming");
    });
  });

  describe("updateService", () => {
    it("should update a service", async () => {
      const updates = {
        price: 50,
        description: "Updated description",
      };

      const mockResponse = {
        data: { id: "s1", name: "Boarding", ...updates },
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await serviceManagement.updateService("s1", updates);

      // updateService transforms the data before sending, so check it was called with transformed data
      expect(mockApi.put).toHaveBeenCalledWith(
        "/api/services/s1",
        expect.objectContaining({
          price: 50,
          description: "Updated description",
          isActive: true, // Default added by updateService
        })
      );
      expect(result.price).toBe(50);
    });
  });

  describe("deleteService", () => {
    it("should delete a service", async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } });

      await serviceManagement.deleteService("s1");

      expect(mockApi.delete).toHaveBeenCalledWith("/api/services/s1", {
        params: { force: false },
      });
    });
  });

  describe("getServicesByCategory", () => {
    it("should fetch services by category", async () => {
      const mockResponse = {
        data: {
          data: [
            { id: "s1", name: "Boarding", serviceCategory: "BOARDING" },
            { id: "s2", name: "Extended Stay", serviceCategory: "BOARDING" },
          ],
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await serviceManagement.getServicesByCategory("BOARDING");

      expect(mockApi.get).toHaveBeenCalledWith(
        "/api/services/category/BOARDING"
      );
      expect(result.data).toHaveLength(2);
      expect(result.data[0].serviceCategory).toBe("BOARDING");
    });
  });

  describe("getActiveServices", () => {
    it("should fetch only active services", async () => {
      const mockResponse = {
        data: {
          data: [
            { id: "s1", name: "Boarding", isActive: true },
            { id: "s2", name: "Daycare", isActive: true },
          ],
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await serviceManagement.getActiveServices();

      expect(mockApi.get).toHaveBeenCalledWith("/api/services/active");
      expect(result.data).toHaveLength(2);
    });
  });
});
