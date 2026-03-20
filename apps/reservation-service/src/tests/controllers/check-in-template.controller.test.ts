// @ts-nocheck
/**
 * Tests for check-in-template.controller.ts
 *
 * Tests the check-in template controller endpoints for managing
 * customizable check-in questionnaire templates.
 */

import { Request, Response } from 'express';

// Mock dependencies
jest.mock('../../config/prisma', () => ({
  prisma: {
    checkInTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    checkInSection: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    checkInQuestion: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback()),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import {
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
} from '../../controllers/check-in-template.controller';

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {
      'x-tenant-id': 'test-tenant',
    },
    tenantId: 'test-tenant',
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

describe('Check-In Template Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTemplates', () => {
    it('should return all templates for a tenant', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Standard Check-In',
          tenantId: 'test-tenant',
          isActive: true,
          isDefault: true,
          sections: [],
        },
        {
          id: 'template-2',
          name: 'VIP Check-In',
          tenantId: 'test-tenant',
          isActive: true,
          isDefault: false,
          sections: [],
        },
      ];

      (prisma.checkInTemplate.findMany as jest.Mock).mockResolvedValue(
        mockTemplates
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllTemplates(req, res);

      expect(prisma.checkInTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'test-tenant' },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        data: mockTemplates,
      });
    });

    it('should filter by active status when query param provided', async () => {
      (prisma.checkInTemplate.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        query: { active: 'true' },
      });
      const res = createMockResponse();

      await getAllTemplates(req, res);

      expect(prisma.checkInTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'test-tenant',
            isActive: true,
          },
        })
      );
    });

    it('should include sections and questions in response', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Standard Check-In',
        sections: [
          {
            id: 'section-1',
            name: 'Pet Information',
            questions: [{ id: 'q-1', questionText: 'Any allergies?' }],
          },
        ],
      };

      (prisma.checkInTemplate.findMany as jest.Mock).mockResolvedValue([
        mockTemplate,
      ]);

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllTemplates(req, res);

      expect(prisma.checkInTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            sections: expect.objectContaining({
              include: expect.objectContaining({
                questions: expect.any(Object),
              }),
            }),
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      (prisma.checkInTemplate.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllTemplates(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to fetch check-in templates',
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return a template by ID', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Standard Check-In',
        tenantId: 'test-tenant',
        sections: [],
      };

      (prisma.checkInTemplate.findFirst as jest.Mock).mockResolvedValue(
        mockTemplate
      );

      const req = createMockRequest({
        params: { id: 'template-1' },
      });
      const res = createMockResponse();

      await getTemplateById(req, res);

      expect(prisma.checkInTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'template-1', tenantId: 'test-tenant' },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockTemplate,
      });
    });

    it('should return 404 when template not found', async () => {
      (prisma.checkInTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        params: { id: 'nonexistent-id' },
      });
      const res = createMockResponse();

      await getTemplateById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Template not found',
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.checkInTemplate.findFirst as jest.Mock).mockRejectedValue(
        new Error('Query failed')
      );

      const req = createMockRequest({
        params: { id: 'template-1' },
      });
      const res = createMockResponse();

      await getTemplateById(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return the default active template', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Default Check-In',
        isDefault: true,
        isActive: true,
        sections: [],
      };

      (prisma.checkInTemplate.findFirst as jest.Mock).mockResolvedValue(
        mockTemplate
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getDefaultTemplate(req, res);

      expect(prisma.checkInTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'test-tenant',
            isDefault: true,
            isActive: true,
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockTemplate,
      });
    });

    it('should return 404 when no default template exists', async () => {
      (prisma.checkInTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest();
      const res = createMockResponse();

      await getDefaultTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No default template found',
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.checkInTemplate.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getDefaultTemplate(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to fetch default template',
      });
    });
  });
});
