// @ts-nocheck
/**
 * Tests for service-agreement.routes.ts
 *
 * Tests the service agreement API routes.
 */

import express from 'express';
import request from 'supertest';

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
import serviceAgreementRoutes from '../../routes/service-agreement/router';

describe('Service Agreement Routes', () => {
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

  describe('Service Agreement Template Routes', () => {
    it('GET /api/service-agreement-templates should return templates', async () => {
      prisma.serviceAgreementTemplate.findMany.mockResolvedValue([]);

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
        results: 0,
        data: [],
      });
    });

    it('GET /api/service-agreement-templates/default should return the default template', async () => {
      prisma.serviceAgreementTemplate.findFirst.mockResolvedValue({
        id: 'template-123',
      });

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
        data: { id: 'template-123' },
      });
    });

    it('GET /api/service-agreement-templates/:id should return a template by ID', async () => {
      prisma.serviceAgreementTemplate.findFirst.mockResolvedValue({
        id: 'template-123',
      });

      const response = await request(app).get(
        '/api/service-agreement-templates/template-123'
      );

      expect(prisma.serviceAgreementTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'template-123', tenantId: 'test-tenant' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'template-123' },
      });
    });

    it('POST /api/service-agreement-templates should create a template', async () => {
      prisma.serviceAgreementTemplate.create.mockResolvedValue({
        id: 'template-123',
      });
      prisma.serviceAgreementVersion.create.mockResolvedValue({
        id: 'version-1',
      });

      const response = await request(app)
        .post('/api/service-agreement-templates')
        .send({ name: 'Agreement Template', content: 'Agreement content' });

      expect(prisma.serviceAgreementTemplate.create).toHaveBeenCalled();
      expect(prisma.serviceAgreementVersion.create).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'template-123' },
      });
    });

    it('PUT /api/service-agreement-templates/:id should update a template', async () => {
      prisma.serviceAgreementTemplate.findFirst.mockResolvedValue({
        id: 'template-123',
        content: 'Old content',
        version: 1,
        isDefault: false,
      });
      prisma.serviceAgreementTemplate.update.mockResolvedValue({
        id: 'template-123',
      });
      prisma.serviceAgreementVersion.create.mockResolvedValue({
        id: 'version-2',
      });

      const response = await request(app)
        .put('/api/service-agreement-templates/template-123')
        .send({ name: 'Updated Agreement', content: 'New content' });

      expect(prisma.serviceAgreementTemplate.update).toHaveBeenCalled();
      expect(prisma.serviceAgreementVersion.create).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'template-123' },
      });
    });

    it('DELETE /api/service-agreement-templates/:id should delete a template', async () => {
      prisma.serviceAgreementTemplate.findFirst.mockResolvedValue({
        id: 'template-123',
      });
      prisma.serviceAgreementTemplate.delete.mockResolvedValue({
        id: 'template-123',
      });

      const response = await request(app).delete(
        '/api/service-agreement-templates/template-123'
      );

      expect(prisma.serviceAgreementTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-123' },
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Template deleted successfully',
      });
    });

    it('GET /api/service-agreement-templates/:id/versions should return template versions', async () => {
      prisma.serviceAgreementTemplate.findFirst.mockResolvedValue({
        id: 'template-123',
      });
      prisma.serviceAgreementVersion.findMany.mockResolvedValue([
        { id: 'version-1' },
      ]);

      const response = await request(app).get(
        '/api/service-agreement-templates/template-123/versions'
      );

      expect(prisma.serviceAgreementVersion.findMany).toHaveBeenCalledWith({
        where: { templateId: 'template-123', tenantId: 'test-tenant' },
        orderBy: { version: 'desc' },
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        results: 1,
        data: [{ id: 'version-1' }],
      });
    });

    it('GET /api/service-agreement-templates/:id/versions/:version should return a specific version', async () => {
      prisma.serviceAgreementVersion.findFirst.mockResolvedValue({
        id: 'version-2',
      });

      const response = await request(app).get(
        '/api/service-agreement-templates/template-123/versions/2'
      );

      expect(prisma.serviceAgreementVersion.findFirst).toHaveBeenCalledWith({
        where: {
          templateId: 'template-123',
          version: 2,
          tenantId: 'test-tenant',
        },
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'version-2' },
      });
    });
  });

  describe('Service Agreement Routes', () => {
    it('POST /api/service-agreements should create an agreement', async () => {
      prisma.serviceAgreement.create.mockResolvedValue({ id: 'agreement-123' });

      const response = await request(app).post('/api/service-agreements').send({
        customerId: 'customer-123',
        agreementText: 'Agreement text',
        signature: 'data:image/png;base64,...',
        signedBy: 'Jane Doe',
      });

      expect(prisma.serviceAgreement.create).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'agreement-123' },
      });
    });

    it('GET /api/service-agreements should return agreements', async () => {
      prisma.serviceAgreement.findMany.mockResolvedValue([
        { id: 'agreement-123' },
      ]);
      prisma.serviceAgreement.count.mockResolvedValue(1);

      const response = await request(app).get('/api/service-agreements');

      expect(prisma.serviceAgreement.findMany).toHaveBeenCalled();
      expect(prisma.serviceAgreement.count).toHaveBeenCalledWith({
        where: { tenantId: 'test-tenant' },
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        results: 1,
        total: 1,
        data: [{ id: 'agreement-123' }],
      });
    });

    it('GET /api/service-agreements/check-in/:checkInId should return an agreement', async () => {
      prisma.serviceAgreement.findFirst.mockResolvedValue({
        id: 'agreement-123',
      });

      const response = await request(app).get(
        '/api/service-agreements/check-in/checkin-123'
      );

      expect(prisma.serviceAgreement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            checkInId: 'checkin-123',
            tenantId: 'test-tenant',
          },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'agreement-123' },
      });
    });

    it('GET /api/service-agreements/customer/:customerId should return customer agreements', async () => {
      prisma.serviceAgreement.findMany.mockResolvedValue([
        { id: 'agreement-123' },
      ]);
      prisma.serviceAgreement.count.mockResolvedValue(1);

      const response = await request(app).get(
        '/api/service-agreements/customer/customer-123'
      );

      expect(prisma.serviceAgreement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            customerId: 'customer-123',
            tenantId: 'test-tenant',
          },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        results: 1,
        total: 1,
        data: [{ id: 'agreement-123' }],
      });
    });

    it('GET /api/service-agreements/customer/:customerId/valid should return validity info', async () => {
      prisma.serviceAgreement.findFirst.mockResolvedValue({
        id: 'agreement-123',
      });

      const response = await request(app).get(
        '/api/service-agreements/customer/customer-123/valid'
      );

      expect(prisma.serviceAgreement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'customer-123',
            tenantId: 'test-tenant',
            isValid: true,
          }),
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          hasValidAgreement: true,
          agreement: { id: 'agreement-123' },
        },
      });
    });

    it('GET /api/service-agreements/:id should return an agreement by ID', async () => {
      prisma.serviceAgreement.findFirst.mockResolvedValue({
        id: 'agreement-123',
      });

      const response = await request(app).get(
        '/api/service-agreements/agreement-123'
      );

      expect(prisma.serviceAgreement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'agreement-123', tenantId: 'test-tenant' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'agreement-123' },
      });
    });

    it('PUT /api/service-agreements/:id/invalidate should invalidate an agreement', async () => {
      prisma.serviceAgreement.findFirst.mockResolvedValue({
        id: 'agreement-123',
        isValid: true,
      });
      prisma.serviceAgreement.update.mockResolvedValue({ id: 'agreement-123' });

      const response = await request(app)
        .put('/api/service-agreements/agreement-123/invalidate')
        .send({ reason: 'Superseded' });

      expect(prisma.serviceAgreement.update).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'agreement-123' },
      });
    });
  });
});
