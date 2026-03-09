// @ts-nocheck
/**
 * Tests for service-agreement.controller.ts
 *
 * Tests the service agreement controller endpoints for managing
 * service agreement templates and signed agreements.
 */

import { Request, Response } from "express";

// Mock dependencies
jest.mock("../../config/prisma", () => ({
  prisma: {
    serviceAgreementTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    serviceAgreement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { prisma } from "../../config/prisma";
import { logger } from "../../utils/logger";
import {
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
  createTemplate,
} from "../../controllers/service-agreement.controller";

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {
      "x-tenant-id": "test-tenant",
    },
    tenantId: "test-tenant",
    ...overrides,
  } as unknown as Request;
};

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe("Service Agreement Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllTemplates", () => {
    it("should return all templates for a tenant", async () => {
      const mockTemplates = [
        {
          id: "template-1",
          name: "Standard Agreement",
          tenantId: "test-tenant",
          isActive: true,
          isDefault: true,
        },
        {
          id: "template-2",
          name: "VIP Agreement",
          tenantId: "test-tenant",
          isActive: true,
          isDefault: false,
        },
      ];

      (prisma.serviceAgreementTemplate.findMany as jest.Mock).mockResolvedValue(
        mockTemplates
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllTemplates(req, res);

      expect(prisma.serviceAgreementTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: "test-tenant" },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        results: 2,
        data: mockTemplates,
      });
    });

    it("should filter by active status when query param provided", async () => {
      (prisma.serviceAgreementTemplate.findMany as jest.Mock).mockResolvedValue(
        []
      );

      const req = createMockRequest({
        query: { active: "true" },
      });
      const res = createMockResponse();

      await getAllTemplates(req, res);

      expect(prisma.serviceAgreementTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: "test-tenant",
            isActive: true,
          },
        })
      );
    });

    it("should handle database errors gracefully", async () => {
      (prisma.serviceAgreementTemplate.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllTemplates(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Failed to fetch service agreement templates",
      });
    });
  });

  describe("getTemplateById", () => {
    it("should return a template by ID", async () => {
      const mockTemplate = {
        id: "template-1",
        name: "Standard Agreement",
        tenantId: "test-tenant",
        content: "Agreement content...",
      };

      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(mockTemplate);

      const req = createMockRequest({
        params: { id: "template-1" },
      });
      const res = createMockResponse();

      await getTemplateById(req, res);

      expect(prisma.serviceAgreementTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "template-1", tenantId: "test-tenant" },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        data: mockTemplate,
      });
    });

    it("should return 404 when template not found", async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(null);

      const req = createMockRequest({
        params: { id: "nonexistent-id" },
      });
      const res = createMockResponse();

      await getTemplateById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Template not found",
      });
    });

    it("should handle database errors gracefully", async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockRejectedValue(new Error("Query failed"));

      const req = createMockRequest({
        params: { id: "template-1" },
      });
      const res = createMockResponse();

      await getTemplateById(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getDefaultTemplate", () => {
    it("should return the default active template", async () => {
      const mockTemplate = {
        id: "template-1",
        name: "Default Agreement",
        isDefault: true,
        isActive: true,
      };

      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(mockTemplate);

      const req = createMockRequest();
      const res = createMockResponse();

      await getDefaultTemplate(req, res);

      expect(prisma.serviceAgreementTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: "test-tenant",
            isDefault: true,
            isActive: true,
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        data: mockTemplate,
      });
    });

    it("should return 404 when no default template exists", async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(null);

      const req = createMockRequest();
      const res = createMockResponse();

      await getDefaultTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "No default template found",
      });
    });

    it("should handle database errors gracefully", async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockRejectedValue(new Error("Database error"));

      const req = createMockRequest();
      const res = createMockResponse();

      await getDefaultTemplate(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("createTemplate", () => {
    it("should create a new template", async () => {
      const mockTemplate = {
        id: "new-template",
        name: "New Agreement",
        content: "Agreement content",
        isDefault: false,
        isActive: true,
        tenantId: "test-tenant",
      };

      (prisma.serviceAgreementTemplate.create as jest.Mock).mockResolvedValue(
        mockTemplate
      );

      const req = createMockRequest({
        body: {
          name: "New Agreement",
          content: "Agreement content",
          isDefault: false,
        },
      });
      const res = createMockResponse();

      await createTemplate(req, res);

      expect(prisma.serviceAgreementTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "test-tenant",
            name: "New Agreement",
            content: "Agreement content",
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should unset other defaults when creating a default template", async () => {
      const mockTemplate = {
        id: "new-template",
        name: "New Default",
        isDefault: true,
        isActive: true,
      };

      (
        prisma.serviceAgreementTemplate.updateMany as jest.Mock
      ).mockResolvedValue({ count: 1 });
      (prisma.serviceAgreementTemplate.create as jest.Mock).mockResolvedValue(
        mockTemplate
      );

      const req = createMockRequest({
        body: {
          name: "New Default",
          content: "Content",
          isDefault: true,
        },
      });
      const res = createMockResponse();

      await createTemplate(req, res);

      expect(prisma.serviceAgreementTemplate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: "test-tenant", isDefault: true },
        data: { isDefault: false },
      });
    });

    it("should handle database errors gracefully", async () => {
      (prisma.serviceAgreementTemplate.create as jest.Mock).mockRejectedValue(
        new Error("Create failed")
      );

      const req = createMockRequest({
        body: {
          name: "New Agreement",
          content: "Content",
        },
      });
      const res = createMockResponse();

      await createTemplate(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
