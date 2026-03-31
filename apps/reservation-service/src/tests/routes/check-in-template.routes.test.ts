// @ts-nocheck
/**
 * Tests for check-in-template.routes.ts
 *
 * Tests the check-in template API routes.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../../config/prisma', () => ({
  prisma: {
    checkInTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    checkInSection: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    checkInResponse: {
      deleteMany: jest.fn(),
    },
    checkIn: {
      count: jest.fn(),
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
import checkInTemplateRoutes from '../../routes/check-in-template/router';

describe('Check-In Template Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.tenantId = 'test-tenant';
      next();
    });
    app.use('/api', checkInTemplateRoutes);
  });

  it('GET /api/check-in-templates should return templates from prisma', async () => {
    prisma.checkInTemplate.findMany.mockResolvedValue([]);

    const response = await request(app).get('/api/check-in-templates');

    expect(prisma.checkInTemplate.findMany).toHaveBeenCalledWith(
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

  it('GET /api/check-in-templates/default should return the default template', async () => {
    prisma.checkInTemplate.findFirst.mockResolvedValue({ id: 'template-123' });

    const response = await request(app).get('/api/check-in-templates/default');

    expect(prisma.checkInTemplate.findFirst).toHaveBeenCalledWith(
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

  it('GET /api/check-in-templates/:id should return a template by ID', async () => {
    prisma.checkInTemplate.findFirst.mockResolvedValue({ id: 'template-123' });

    const response = await request(app).get(
      '/api/check-in-templates/template-123'
    );

    expect(prisma.checkInTemplate.findFirst).toHaveBeenCalledWith(
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

  it('POST /api/check-in-templates should create a template', async () => {
    prisma.checkInTemplate.create.mockResolvedValue({ id: 'template-123' });

    const response = await request(app)
      .post('/api/check-in-templates')
      .send({ name: 'New Template', sections: [] });

    expect(prisma.checkInTemplate.create).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: { id: 'template-123' },
    });
  });

  it('PUT /api/check-in-templates/:id should update a template', async () => {
    prisma.checkInTemplate.findFirst.mockResolvedValue({
      id: 'template-123',
      name: 'Existing Template',
      description: null,
      isActive: true,
      isDefault: false,
    });
    prisma.checkInTemplate.update.mockResolvedValue({ id: 'template-123' });
    prisma.checkInTemplate.findUnique.mockResolvedValue({
      id: 'template-123',
      name: 'Updated Template',
      sections: [],
    });

    const response = await request(app)
      .put('/api/check-in-templates/template-123')
      .send({ name: 'Updated Template' });

    expect(prisma.checkInTemplate.update).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        id: 'template-123',
        name: 'Updated Template',
        sections: [],
      },
    });
  });

  it('DELETE /api/check-in-templates/:id should delete a template', async () => {
    prisma.checkInTemplate.findFirst.mockResolvedValue({ id: 'template-123' });
    prisma.checkIn.count.mockResolvedValue(0);
    prisma.checkInTemplate.delete.mockResolvedValue({ id: 'template-123' });

    const response = await request(app).delete(
      '/api/check-in-templates/template-123'
    );

    expect(prisma.checkInTemplate.delete).toHaveBeenCalledWith({
      where: { id: 'template-123' },
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Template deleted successfully',
    });
  });

  it('POST /api/check-in-templates/:id/clone should clone a template', async () => {
    prisma.checkInTemplate.findFirst.mockResolvedValue({
      id: 'template-123',
      name: 'Template 123',
      description: null,
      sections: [],
    });
    prisma.checkInTemplate.create.mockResolvedValue({ id: 'template-456' });

    const response = await request(app).post(
      '/api/check-in-templates/template-123/clone'
    );

    expect(prisma.checkInTemplate.create).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: { id: 'template-456' },
    });
  });
});
