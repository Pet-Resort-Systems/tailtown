// @ts-nocheck
/**
 * Tests for resourceRoutes.ts
 *
 * Tests the resource API routes configuration.
 */

import express from 'express';
import request from 'supertest';

// Mock all controller functions
jest.mock('../../controllers/resource/availability.controller', () => ({
  checkResourceAvailability: jest.fn((req, res) =>
    res.json({ status: 'success', data: { isAvailable: true } })
  ),
}));

jest.mock('../../controllers/resource/batch-availability.controller', () => ({
  batchCheckResourceAvailability: jest.fn((req, res) =>
    res.json({ status: 'success', data: { resources: [] } })
  ),
}));

jest.mock('../../controllers/resource/resource.controller', () => ({
  getAllResources: jest.fn((req, res) =>
    res.json({ status: 'success', data: [] })
  ),
  getResourceById: jest.fn((req, res) =>
    res.json({ status: 'success', data: {} })
  ),
  createResource: jest.fn((req, res) =>
    res.status(201).json({ status: 'success', data: {} })
  ),
  updateResource: jest.fn((req, res) =>
    res.json({ status: 'success', data: {} })
  ),
  deleteResource: jest.fn((req, res) =>
    res
      .status(200)
      .json({ status: 'success', message: 'Resource deleted successfully' })
  ),
  getResourceAvailability: jest.fn((req, res) =>
    res.json({ status: 'success', data: { isAvailable: true } })
  ),
}));

import resourceRoutes from '../../routes/resourceRoutes';
import { checkResourceAvailability } from '../../controllers/resource/availability.controller';
import { batchCheckResourceAvailability } from '../../controllers/resource/batch-availability.controller';
import {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourceAvailability,
} from '../../controllers/resource/resource.controller';

describe('Resource Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/resources', resourceRoutes);
  });

  describe('Health check', () => {
    it('GET /api/resources/health should return OK', async () => {
      const response = await request(app).get('/api/resources/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.message).toBe('Resource routes healthy');
    });
  });

  describe('GET /api/resources', () => {
    it('should call getAllResources controller', async () => {
      await request(app).get('/api/resources');

      expect(getAllResources).toHaveBeenCalled();
    });

    it('should return success response', async () => {
      const response = await request(app).get('/api/resources');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should call getResourceById controller', async () => {
      await request(app).get('/api/resources/res-123');

      expect(getResourceById).toHaveBeenCalled();
    });

    it('should pass resource ID in params', async () => {
      await request(app).get('/api/resources/res-456');

      expect(getResourceById).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ id: 'res-456' }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('POST /api/resources', () => {
    it('should call createResource controller', async () => {
      await request(app)
        .post('/api/resources')
        .send({ name: 'Kennel 1', type: 'JUNIOR_KENNEL' });

      expect(createResource).toHaveBeenCalled();
    });

    it('should return 201 on success', async () => {
      const response = await request(app)
        .post('/api/resources')
        .send({ name: 'Kennel 1', type: 'JUNIOR_KENNEL' });

      expect(response.status).toBe(201);
    });
  });

  describe('PATCH /api/resources/:id', () => {
    it('should call updateResource controller', async () => {
      await request(app)
        .patch('/api/resources/res-123')
        .send({ name: 'Updated Kennel' });

      expect(updateResource).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/resources/:id', () => {
    it('should call deleteResource controller', async () => {
      await request(app).delete('/api/resources/res-123');

      expect(deleteResource).toHaveBeenCalled();
    });

    it('should return 200 on success', async () => {
      const response = await request(app).delete('/api/resources/res-123');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/resources/availability', () => {
    it('should call checkResourceAvailability controller', async () => {
      await request(app).get(
        '/api/resources/availability?resourceId=res-123&date=2024-06-15'
      );

      expect(checkResourceAvailability).toHaveBeenCalled();
    });
  });

  describe('POST /api/resources/availability/batch', () => {
    it('should call batchCheckResourceAvailability controller', async () => {
      await request(app)
        .post('/api/resources/availability/batch')
        .send({ resources: ['res-1', 'res-2'], date: '2024-06-15' });

      expect(batchCheckResourceAvailability).toHaveBeenCalled();
    });
  });

  describe('GET /api/resources/:id/availability', () => {
    it('should call getResourceAvailability controller', async () => {
      await request(app).get('/api/resources/res-123/availability');

      expect(getResourceAvailability).toHaveBeenCalled();
    });
  });

  describe('Route ordering', () => {
    it('should route /availability before /:id', async () => {
      await request(app).get(
        '/api/resources/availability?resourceId=res-123&date=2024-06-15'
      );

      expect(checkResourceAvailability).toHaveBeenCalled();
      expect(getResourceById).not.toHaveBeenCalled();
    });

    it('should route /health before /:id', async () => {
      const response = await request(app).get('/api/resources/health');

      expect(response.body.status).toBe('OK');
      expect(getResourceById).not.toHaveBeenCalled();
    });
  });
});
