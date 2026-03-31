// @ts-nocheck
/**
 * Tests for service-agreement.controller.ts
 *
 * Tests the service agreement controller endpoints for managing
 * service agreement templates and signed agreements.
 */

import express from 'express';
import request from 'supertest';

// Mock dependencies
jest.mock('../../config/prisma', () => ({
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
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    serviceAgreementVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    checkIn: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import serviceAgreementRoutes from '../../routes/service-agreement/router';

describe('Service Agreement Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.tenantId = 'test-tenant';
      next();
    });
    app.use('/api', serviceAgreementRoutes);
  });

  describe('getAllTemplates', () => {
    it('should return all templates for a tenant', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Standard Agreement',
          tenantId: 'test-tenant',
          isActive: true,
          isDefault: true,
        },
        {
          id: 'template-2',
          name: 'VIP Agreement',
          tenantId: 'test-tenant',
          isActive: true,
          isDefault: false,
        },
      ];

      (prisma.serviceAgreementTemplate.findMany as jest.Mock).mockResolvedValue(
        mockTemplates
      );

      const response = await request(app).get(
        '/api/service-agreement-templates'
      );

      expect(prisma.serviceAgreementTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'test-tenant' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        results: 2,
        data: mockTemplates,
      });
    });

    it('should filter by active status when query param provided', async () => {
      (prisma.serviceAgreementTemplate.findMany as jest.Mock).mockResolvedValue(
        []
      );

      const response = await request(app)
        .get('/api/service-agreement-templates')
        .query({ active: 'true' });

      expect(prisma.serviceAgreementTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'test-tenant',
            isActive: true,
          },
        })
      );
      expect(response.status).toBe(200);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.serviceAgreementTemplate.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get(
        '/api/service-agreement-templates'
      );

      expect(logger.error).toHaveBeenCalled();
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Failed to fetch service agreement templates',
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return a template by ID', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Standard Agreement',
        tenantId: 'test-tenant',
        content: 'Agreement content...',
      };

      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(mockTemplate);

      const response = await request(app).get(
        '/api/service-agreement-templates/template-1'
      );

      expect(prisma.serviceAgreementTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'template-1', tenantId: 'test-tenant' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: mockTemplate,
      });
    });

    it('should return 404 when template not found', async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(null);

      const response = await request(app).get(
        '/api/service-agreement-templates/nonexistent-id'
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Template not found',
      });
    });

    it('should handle database errors gracefully', async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockRejectedValue(new Error('Query failed'));

      const response = await request(app).get(
        '/api/service-agreement-templates/template-1'
      );

      expect(logger.error).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return the default active template', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Default Agreement',
        isDefault: true,
        isActive: true,
      };

      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(mockTemplate);

      const response = await request(app).get(
        '/api/service-agreement-templates/default'
      );

      expect(prisma.serviceAgreementTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'test-tenant',
            isDefault: true,
            isActive: true,
          },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: mockTemplate,
      });
    });

    it('should return 404 when no default template exists', async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (prisma.serviceAgreementTemplate.findMany as jest.Mock).mockResolvedValue(
        []
      );

      const response = await request(app).get(
        '/api/service-agreement-templates/default'
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'No default template found',
      });
    });

    it('should handle database errors gracefully', async () => {
      (
        prisma.serviceAgreementTemplate.findFirst as jest.Mock
      ).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get(
        '/api/service-agreement-templates/default'
      );

      expect(logger.error).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const mockTemplate = {
        id: 'new-template',
        name: 'New Agreement',
        content: 'Agreement content',
        isDefault: false,
        isActive: true,
        tenantId: 'test-tenant',
      };

      (prisma.serviceAgreementTemplate.create as jest.Mock).mockResolvedValue(
        mockTemplate
      );
      (prisma.serviceAgreementVersion.create as jest.Mock).mockResolvedValue({
        id: 'version-1',
      });

      const response = await request(app)
        .post('/api/service-agreement-templates')
        .send({
          name: 'New Agreement',
          content: 'Agreement content',
          isDefault: false,
        });

      expect(prisma.serviceAgreementTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'test-tenant',
            name: 'New Agreement',
            content: 'Agreement content',
          }),
        })
      );
      expect(response.status).toBe(201);
    });

    it('should unset other defaults when creating a default template', async () => {
      const mockTemplate = {
        id: 'new-template',
        name: 'New Default',
        isDefault: true,
        isActive: true,
      };

      (
        prisma.serviceAgreementTemplate.updateMany as jest.Mock
      ).mockResolvedValue({ count: 1 });
      (prisma.serviceAgreementTemplate.create as jest.Mock).mockResolvedValue(
        mockTemplate
      );
      (prisma.serviceAgreementVersion.create as jest.Mock).mockResolvedValue({
        id: 'version-1',
      });

      const response = await request(app)
        .post('/api/service-agreement-templates')
        .send({
          name: 'New Default',
          content: 'Content',
          isDefault: true,
        });

      expect(prisma.serviceAgreementTemplate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'test-tenant', isDefault: true },
        data: { isDefault: false },
      });
      expect(response.status).toBe(201);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.serviceAgreementTemplate.create as jest.Mock).mockRejectedValue(
        new Error('Create failed')
      );

      const response = await request(app)
        .post('/api/service-agreement-templates')
        .send({
          name: 'New Agreement',
          content: 'Content',
        });

      expect(logger.error).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });
});
