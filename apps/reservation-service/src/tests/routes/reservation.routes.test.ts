// @ts-nocheck
/**
 * Tests for reservation.routes.ts
 *
 * Tests the reservation API routes configuration.
 */

import express from 'express';
import request from 'supertest';

const mockGetAllReservationsRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: [] })
);
const mockGetReservationByIdRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: {} })
);
const mockCreateReservationRouteHandler = jest.fn((req, res) =>
  res.status(201).json({ status: 'success', data: {} })
);
const mockUpdateReservationRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: {} })
);
const mockDeleteReservationRouteHandler = jest.fn((req, res) =>
  res.status(200).json({ status: 'success', data: null })
);
const mockGetCustomerReservationsRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: [] })
);
const mockGetTodayRevenueRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: { revenue: 0 } })
);
const mockAddAddOnsToReservationRouteHandler = jest.fn((req, res) =>
  res.json({ status: 'success', data: {} })
);

jest.mock('../../routes/reservation/get-all-reservations.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/', mockGetAllReservationsRouteHandler);
  return { route };
});

jest.mock('../../routes/reservation/get-reservation-by-id.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id', mockGetReservationByIdRouteHandler);
  return { route };
});

jest.mock('../../routes/reservation/create-reservation.route', () => {
  const express = require('express');
  const route = express.Router();

  route.use('/', mockCreateReservationRouteHandler);

  return { route };
});

jest.mock('../../routes/reservation/update-reservation.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id', mockUpdateReservationRouteHandler);
  return { route };
});

jest.mock('../../routes/reservation/delete-reservation.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id', mockDeleteReservationRouteHandler);
  return { route };
});

jest.mock('../../routes/reservation/get-customer-reservations.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/customer/:customerId', mockGetCustomerReservationsRouteHandler);
  return { route };
});

jest.mock('../../routes/reservation/get-today-revenue.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/revenue/today', mockGetTodayRevenueRouteHandler);
  return { route };
});

jest.mock('../../routes/reservation/add-add-ons-to-reservation.route', () => {
  const express = require('express');
  const route = express.Router();
  route.use('/:id/add-ons', mockAddAddOnsToReservationRouteHandler);
  return { route };
});

import reservationRoutes from '../../routes/reservation/router';

describe('Reservation Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/reservations', reservationRoutes);
  });

  describe('Health check', () => {
    it('GET /api/reservations/health should return OK', async () => {
      const response = await request(app).get('/api/reservations/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.message).toBe('Reservation routes healthy');
    });
  });

  describe('GET /api/reservations', () => {
    it('should call getAllReservations route module', async () => {
      await request(app).get('/api/reservations');

      expect(mockGetAllReservationsRouteHandler).toHaveBeenCalled();
    });

    it('should return success response', async () => {
      const response = await request(app).get('/api/reservations');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('GET /api/reservations/:id', () => {
    it('should call getReservationById route module', async () => {
      await request(app).get('/api/reservations/res-123');

      expect(mockGetReservationByIdRouteHandler).toHaveBeenCalled();
    });

    it('should pass reservation ID in params', async () => {
      await request(app).get('/api/reservations/res-456');

      expect(mockGetReservationByIdRouteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ id: 'res-456' }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('POST /api/reservations', () => {
    it('should call createReservation route module', async () => {
      await request(app)
        .post('/api/reservations')
        .send({ customerId: 'cust-1', petId: 'pet-1' });

      expect(mockCreateReservationRouteHandler).toHaveBeenCalled();
    });

    it('should return 201 on success', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .send({ customerId: 'cust-1', petId: 'pet-1' });

      expect(response.status).toBe(201);
    });
  });

  describe('PATCH /api/reservations/:id', () => {
    it('should call updateReservation route module', async () => {
      await request(app)
        .patch('/api/reservations/res-123')
        .send({ status: 'CONFIRMED' });

      expect(mockUpdateReservationRouteHandler).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/reservations/:id', () => {
    it('should call deleteReservation route module', async () => {
      await request(app).delete('/api/reservations/res-123');

      expect(mockDeleteReservationRouteHandler).toHaveBeenCalled();
    });

    it('should return 200 on success', async () => {
      const response = await request(app).delete('/api/reservations/res-123');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/reservations/customer/:customerId', () => {
    it('should call getCustomerReservations route module', async () => {
      await request(app).get('/api/reservations/customer/cust-123');

      expect(mockGetCustomerReservationsRouteHandler).toHaveBeenCalled();
    });

    it('should pass customer ID in params', async () => {
      await request(app).get('/api/reservations/customer/cust-456');

      expect(mockGetCustomerReservationsRouteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ customerId: 'cust-456' }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('GET /api/reservations/revenue/today', () => {
    it('should call getTodayRevenue route module', async () => {
      await request(app).get('/api/reservations/revenue/today');

      expect(mockGetTodayRevenueRouteHandler).toHaveBeenCalled();
    });
  });

  describe('POST /api/reservations/:id/add-ons', () => {
    it('should call addAddOnsToReservation route module', async () => {
      await request(app)
        .post('/api/reservations/res-123/add-ons')
        .send({ addOns: [{ serviceId: 'addon-1' }] });

      expect(mockAddAddOnsToReservationRouteHandler).toHaveBeenCalled();
    });
  });

  describe('Route ordering', () => {
    it('should route /customer/:customerId before /:id', async () => {
      await request(app).get('/api/reservations/customer/cust-123');

      expect(mockGetCustomerReservationsRouteHandler).toHaveBeenCalled();
      expect(mockGetReservationByIdRouteHandler).not.toHaveBeenCalled();
    });

    it('should route /revenue/today before /:id', async () => {
      await request(app).get('/api/reservations/revenue/today');

      expect(mockGetTodayRevenueRouteHandler).toHaveBeenCalled();
      expect(mockGetReservationByIdRouteHandler).not.toHaveBeenCalled();
    });

    it('should route /health before /:id', async () => {
      const response = await request(app).get('/api/reservations/health');

      expect(response.body.status).toBe('OK');
      expect(mockGetReservationByIdRouteHandler).not.toHaveBeenCalled();
    });
  });
});
