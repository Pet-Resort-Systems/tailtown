import express from 'express';
import request from 'supertest';
import careTrackingRoutes from '../care-tracking/router';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).tenantId = 'test-tenant';
  (req as any).user = { id: 'staff-1', email: 'staff@test.com', role: 'STAFF' };
  next();
});
app.use('/api/care-tracking', careTrackingRoutes);

describe('Care tracking router registration', () => {
  const endpoints = [
    ['get', '/api/care-tracking/feeding/pets'],
    ['post', '/api/care-tracking/feeding'],
    ['get', '/api/care-tracking/feeding/pet/pet-1'],
    ['get', '/api/care-tracking/feeding/report'],
    ['patch', '/api/care-tracking/pets/pet-1/picky-eater'],
    ['get', '/api/care-tracking/medications/pets'],
    ['get', '/api/care-tracking/medications/pet/pet-1'],
    ['post', '/api/care-tracking/medications/pet/pet-1'],
    ['patch', '/api/care-tracking/medications/med-1'],
    ['delete', '/api/care-tracking/medications/med-1'],
    ['post', '/api/care-tracking/medications/log'],
    ['get', '/api/care-tracking/medications/log/pet/pet-1'],
    ['get', '/api/care-tracking/medications/report'],
  ] as const;

  it.each(endpoints)('registers %s %s', async (method, path) => {
    const response = await request(app)[method](path);
    expect(response.status).not.toBe(404);
  });
});
