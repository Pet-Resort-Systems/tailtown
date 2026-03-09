/**
 * Checklist Controller Integration Tests
 */

import { Response, NextFunction } from "express";
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from "../../test/setup-test-db";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getChecklistStats,
} from "../checklist.controller";
import { TenantRequest } from "../../middleware/tenant.middleware";

describe("Checklist Controller Integration Tests", () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testTemplateIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`checklist-test-${Date.now()}`);

    // Create test templates
    const template1 = await prisma.checklistTemplate.create({
      data: {
        tenantId: testTenantId,
        name: "Kennel Check-in",
        description: "Standard kennel check-in checklist",
        area: "KENNEL_CHECKIN",
        items: JSON.stringify([
          { id: "1", label: "Verify pet info", required: true },
          { id: "2", label: "Check vaccination", required: true },
        ]),
        estimatedMinutes: 10,
        isActive: true,
      },
    });
    testTemplateIds.push(template1.id);

    const template2 = await prisma.checklistTemplate.create({
      data: {
        tenantId: testTenantId,
        name: "Grooming Prep",
        description: "Pre-grooming checklist",
        area: "GROOMING",
        items: JSON.stringify([
          { id: "1", label: "Check coat condition", required: true },
        ]),
        estimatedMinutes: 5,
        isActive: true,
      },
    });
    testTemplateIds.push(template2.id);
  });

  afterAll(async () => {
    for (const templateId of testTemplateIds) {
      await prisma.checklistTemplate
        .delete({ where: { id: templateId } })
        .catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllTemplates", () => {
    it("should return all templates for tenant", async () => {
      const req = {
        tenantId: testTenantId,
        query: {},
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllTemplates(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by area", async () => {
      const req = {
        tenantId: testTenantId,
        query: { area: "GROOMING" },
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getAllTemplates(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getTemplateById", () => {
    it("should return template by ID", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: testTemplateIds[0] },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getTemplateById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.id).toBe(testTemplateIds[0]);
    });

    it("should return 404 for non-existent template", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getTemplateById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("createTemplate", () => {
    it("should create a new template", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          name: `New Template ${Date.now()}`,
          description: "Test template",
          area: "CHECKOUT",
          items: [{ id: "1", label: "Final check", required: true }],
          estimatedMinutes: 15,
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createTemplate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.area).toBe("CHECKOUT");
      testTemplateIds.push(responseData.data.id);
    });

    it("should reject template without name", async () => {
      const req = {
        tenantId: testTenantId,
        params: {},
        query: {},
        body: {
          description: "Test",
          area: "CHECKOUT",
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await createTemplate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("updateTemplate", () => {
    let updateTemplateId: string;

    beforeAll(async () => {
      const template = await prisma.checklistTemplate.create({
        data: {
          tenantId: testTenantId,
          name: "Update Test Template",
          description: "Original description",
          area: "DAILY",
          items: JSON.stringify([]),
          estimatedMinutes: 20,
          isActive: true,
        },
      });
      updateTemplateId = template.id;
      testTemplateIds.push(updateTemplateId);
    });

    it("should update template fields", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: updateTemplateId },
        query: {},
        body: {
          name: "Updated Template Name",
          estimatedMinutes: 30,
        },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateTemplate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.name).toBe("Updated Template Name");
    });

    it("should return 404 for non-existent template", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: "00000000-0000-0000-0000-000000000000" },
        query: {},
        body: { name: "Test" },
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await updateTemplate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("deleteTemplate", () => {
    let deleteTemplateId: string;

    beforeAll(async () => {
      const template = await prisma.checklistTemplate.create({
        data: {
          tenantId: testTenantId,
          name: "Delete Test Template",
          description: "To be deleted",
          area: "CLEANUP",
          items: JSON.stringify([]),
          estimatedMinutes: 10,
          isActive: true,
        },
      });
      deleteTemplateId = template.id;
      testTemplateIds.push(deleteTemplateId);
    });

    it("should delete template", async () => {
      const req = {
        tenantId: testTenantId,
        params: { id: deleteTemplateId },
        query: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await deleteTemplate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe("getChecklistStats", () => {
    it("should return checklist stats", async () => {
      const req = {
        tenantId: testTenantId,
        query: {},
        params: {},
        body: {},
      } as unknown as TenantRequest;
      const res = createMockResponse();

      await getChecklistStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
