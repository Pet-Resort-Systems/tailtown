// @ts-nocheck
/**
 * Tests for resourceRoutes.ts
 *
 * Tests the resource API routes configuration.
 */

import express from 'express';
import request from 'supertest';

const mockCheckResourceAvailabilityRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: { isAvailable: true } })
);
const mockBatchCheckResourceAvailabilityRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: { resources: [] } })
);
const mockGetAllResourcesRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: [] })
);
const mockGetResourceByIdRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: {} })
);
const mockCreateResourceRouteHandler = jest.fn((req, res) =>
  res.status(201).json({ status: 'success', data: {} })
);
const mockUpdateResourceRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: {} })
);
const mockDeleteResourceRouteHandler = jest.fn((req, res) =>
  res
    .status(200)
    .json({ status: 'success', message: 'Resource deleted successfully' })
);
const mockGetResourceAvailabilityRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: { isAvailable: true } })
);

jest.mock('../../routes/resource/check-resource-availability.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/availability', mockCheckResourceAvailabilityRouteHandler);
  return { route };
});

jest.mock(
  '../../routes/resource/batch-check-resource-availability.route',
  () => {
    const express = require('express');
    const route = express.Router();
    route.use(
      '/availability/batch',
      mockBatchCheckResourceAvailabilityRouteHandler
    );
    return { route };
  }
);

jest.mock('../../routes/resource/get-all-resources.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/', mockGetAllResourcesRouteHandler);
  return { route };
});

jest.mock('../../routes/resource/get-resource-by-id.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id', mockGetResourceByIdRouteHandler);
  return { route };
});

jest.mock('../../routes/resource/create-resource.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/', mockCreateResourceRouteHandler);
  return { route };
});

jest.mock('../../routes/resource/update-resource.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id', mockUpdateResourceRouteHandler);
  return { route };
});

jest.mock('../../routes/resource/delete-resource.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id', mockDeleteResourceRouteHandler);
  return { route };
});

jest.mock('../../routes/resource/get-resource-availability.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id/availability', mockGetResourceAvailabilityRouteHandler);
  return { route };
});

import resourceRoutes from '../../routes/resource/router';

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
    it('should call getAllResources route module', async () => {
      await request(app).get('/api/resources');

      expect(mockGetAllResourcesRouteHandler).toHaveBeenCalled();
    });

    it('should return success response', async () => {
      const response = await request(app).get('/api/resources');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should call getResourceById route module', async () => {
      await request(app).get('/api/resources/res-123');

      expect(mockGetResourceByIdRouteHandler).toHaveBeenCalled();
    });

    it('should pass resource ID in params', async () => {
      await request(app).get('/api/resources/res-456');

      expect(mockGetResourceByIdRouteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ id: 'res-456' }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('POST /api/resources', () => {
    it('should call createResource route module', async () => {
      await request(app)
        .post('/api/resources')
        .send({ name: 'Kennel 1', type: 'JUNIOR_KENNEL' });

      expect(mockCreateResourceRouteHandler).toHaveBeenCalled();
    });

    it('should return 201 on success', async () => {
      const response = await request(app)
        .post('/api/resources')
        .send({ name: 'Kennel 1', type: 'JUNIOR_KENNEL' });

      expect(response.status).toBe(201);
    });
  });

  describe('PATCH /api/resources/:id', () => {
    it('should call updateResource route module', async () => {
      await request(app)
        .patch('/api/resources/res-123')
        .send({ name: 'Updated Kennel' });

      expect(mockUpdateResourceRouteHandler).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/resources/:id', () => {
    it('should call deleteResource route module', async () => {
      await request(app).delete('/api/resources/res-123');

      expect(mockDeleteResourceRouteHandler).toHaveBeenCalled();
    });

    it('should return 200 on success', async () => {
      const response = await request(app).delete('/api/resources/res-123');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/resources/availability', () => {
    it('should call checkResourceAvailability route module', async () => {
      await request(app).get(
        '/api/resources/availability?resourceId=res-123&date=2024-06-15'
      );

      expect(mockCheckResourceAvailabilityRouteHandler).toHaveBeenCalled();
    });
  });

  describe('POST /api/resources/availability/batch', () => {
    it('should call batchCheckResourceAvailability route module', async () => {
      await request(app)
        .post('/api/resources/availability/batch')
        .send({ resources: ['res-1', 'res-2'], date: '2024-06-15' });

      expect(mockBatchCheckResourceAvailabilityRouteHandler).toHaveBeenCalled();
    });
  });

  describe('GET /api/resources/:id/availability', () => {
    it('should call getResourceAvailability route module', async () => {
      await request(app).get('/api/resources/res-123/availability');

      expect(mockGetResourceAvailabilityRouteHandler).toHaveBeenCalled();
    });
  });

  describe('Route ordering', () => {
    it('should route /availability before /:id', async () => {
      await request(app).get(
        '/api/resources/availability?resourceId=res-123&date=2024-06-15'
      );

      expect(mockCheckResourceAvailabilityRouteHandler).toHaveBeenCalled();
      expect(mockGetResourceByIdRouteHandler).not.toHaveBeenCalled();
    });

    it('should route /health before /:id', async () => {
      const response = await request(app).get('/api/resources/health');

      expect(response.body.status).toBe('OK');
      expect(mockGetResourceByIdRouteHandler).not.toHaveBeenCalled();
    });
  });
});
