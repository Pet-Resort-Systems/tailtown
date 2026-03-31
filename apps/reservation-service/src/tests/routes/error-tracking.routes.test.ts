// @ts-nocheck
/**
 * Tests for error-tracking.routes.ts
 *
 * Tests the error tracking API routes.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../../utils/reservation-error-tracker', () => ({
  reservationErrorTracker: {
    getErrors: jest.fn(),
    getErrorAnalyticsObject: jest.fn(),
    getError: jest.fn(),
    resolveError: jest.fn(),
  },
  ReservationErrorCategory: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

import errorTrackingRoutes from '../../routes/error-tracking/router';
import { reservationErrorTracker } from '../../utils/reservation-error-tracker';

describe('Error Tracking Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    reservationErrorTracker.getErrors.mockResolvedValue([]);
    reservationErrorTracker.getErrorAnalyticsObject.mockReturnValue({
      VALIDATION_ERROR: 2,
    });
    reservationErrorTracker.getError.mockImplementation((id) => ({
      id,
      isResolved: false,
    }));
    reservationErrorTracker.resolveError.mockReturnValue(true);

    app = express();
    app.use(express.json());
    app.use('/api/errors', errorTrackingRoutes);
  });

  describe('GET /api/errors', () => {
    it('should call getErrors on the tracker', async () => {
      await request(app).get('/api/errors');

      expect(reservationErrorTracker.getErrors).toHaveBeenCalledWith({}, 100);
    });

    it('should return success response', async () => {
      const response = await request(app).get('/api/errors');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should pass query parameters', async () => {
      await request(app).get(
        '/api/errors?category=VALIDATION_ERROR&isResolved=false&limit=25'
      );

      expect(reservationErrorTracker.getErrors).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'VALIDATION_ERROR',
          isResolved: false,
        }),
        25
      );
    });
  });

  describe('GET /api/errors/analytics', () => {
    it('should call getErrorAnalyticsObject on the tracker', async () => {
      await request(app).get('/api/errors/analytics');

      expect(
        reservationErrorTracker.getErrorAnalyticsObject
      ).toHaveBeenCalled();
    });

    it('should return success response', async () => {
      const response = await request(app).get('/api/errors/analytics');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('GET /api/errors/:id', () => {
    it('should call getError on the tracker', async () => {
      await request(app).get('/api/errors/err-123');

      expect(reservationErrorTracker.getError).toHaveBeenCalledWith('err-123');
    });

    it('should pass error ID in params', async () => {
      await request(app).get('/api/errors/err-456');

      expect(reservationErrorTracker.getError).toHaveBeenCalledWith('err-456');
    });
  });

  describe('PATCH /api/errors/:id/resolve', () => {
    it('should call resolveError on the tracker', async () => {
      await request(app)
        .patch('/api/errors/err-123/resolve')
        .send({ resolution: 'Fixed the issue' });

      expect(reservationErrorTracker.resolveError).toHaveBeenCalledWith(
        'err-123',
        undefined,
        'Fixed the issue'
      );
    });

    it('should pass error ID in params', async () => {
      await request(app)
        .patch('/api/errors/err-789/resolve')
        .send({ resolution: 'Resolved' });

      expect(reservationErrorTracker.resolveError).toHaveBeenCalledWith(
        'err-789',
        undefined,
        'Resolved'
      );
    });

    it('should pass resolution in body', async () => {
      await request(app)
        .patch('/api/errors/err-123/resolve')
        .send({ resolution: 'Bug fixed in commit abc123' });

      expect(reservationErrorTracker.resolveError).toHaveBeenCalledWith(
        'err-123',
        undefined,
        'Bug fixed in commit abc123'
      );
    });
  });

  describe('Route ordering', () => {
    it('should route /analytics before /:id', async () => {
      await request(app).get('/api/errors/analytics');

      expect(
        reservationErrorTracker.getErrorAnalyticsObject
      ).toHaveBeenCalled();
      expect(reservationErrorTracker.getError).not.toHaveBeenCalled();
    });
  });
});
