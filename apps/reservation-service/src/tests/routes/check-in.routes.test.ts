// @ts-nocheck
/**
 * Tests for check-in.routes.ts
 *
 * Tests the check-in API routes.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../../config/prisma', () => ({
  prisma: {
    checkIn: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    reservation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    checkInResponse: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    checkInMedication: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    checkInBelonging: {
      update: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
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
import checkInRoutes from '../../routes/check-in/router';

describe('Check-In Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.tenantId = 'test-tenant';
      next();
    });
    app.use('/api', checkInRoutes);
  });

  describe('Check-In Routes', () => {
    it('GET /api/check-ins should return check-ins from prisma', async () => {
      prisma.checkIn.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/check-ins');

      expect(prisma.checkIn.findMany).toHaveBeenCalledWith(
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

    it('GET /api/check-ins/:id should return a check-in by ID', async () => {
      prisma.checkIn.findFirst.mockResolvedValue({ id: 'checkin-123' });

      const response = await request(app).get('/api/check-ins/checkin-123');

      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'checkin-123', tenantId: 'test-tenant' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'checkin-123' },
      });
    });

    it('POST /api/check-ins should create a check-in', async () => {
      prisma.checkIn.create.mockResolvedValue({ id: 'checkin-123' });

      const response = await request(app)
        .post('/api/check-ins')
        .send({ petId: 'pet-123', reservationId: 'res-123' });

      expect(prisma.checkIn.create).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'checkin-123' },
      });
    });

    it('PUT /api/check-ins/:id should update a check-in', async () => {
      prisma.checkIn.findFirst.mockResolvedValue({ id: 'checkin-123' });
      prisma.checkIn.update.mockResolvedValue({ id: 'checkin-123' });

      const response = await request(app)
        .put('/api/check-ins/checkin-123')
        .send({ checkInNotes: 'Updated notes' });

      expect(prisma.checkIn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'checkin-123' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'checkin-123' },
      });
    });
  });

  describe('Medication Routes', () => {
    it('POST /api/check-ins/:id/medications should create a medication', async () => {
      prisma.checkIn.findFirst.mockResolvedValue({ id: 'checkin-123' });
      prisma.checkInMedication.create.mockResolvedValue({ id: 'med-456' });

      const response = await request(app)
        .post('/api/check-ins/checkin-123/medications')
        .send({ medicationName: 'Medication', dosage: '10mg' });

      expect(prisma.checkInMedication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checkInId: 'checkin-123',
          }),
        })
      );
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'med-456' },
      });
    });

    it('PUT /api/check-ins/:checkInId/medications/:medicationId should update a medication', async () => {
      prisma.checkIn.findFirst.mockResolvedValue({ id: 'checkin-123' });
      prisma.checkInMedication.update.mockResolvedValue({ id: 'med-456' });

      const response = await request(app)
        .put('/api/check-ins/checkin-123/medications/med-456')
        .send({ dosage: '20mg' });

      expect(prisma.checkInMedication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'med-456' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'med-456' },
      });
    });

    it('DELETE /api/check-ins/:checkInId/medications/:medicationId should delete a medication', async () => {
      prisma.checkInMedication.delete.mockResolvedValue({ id: 'med-456' });

      const response = await request(app).delete(
        '/api/check-ins/checkin-123/medications/med-456'
      );

      expect(prisma.checkInMedication.delete).toHaveBeenCalledWith({
        where: { id: 'med-456' },
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Medication deleted successfully',
      });
    });
  });

  describe('Belonging Routes', () => {
    it('PUT /api/check-ins/:checkInId/belongings/:belongingId/return should return a belonging', async () => {
      prisma.checkInBelonging.update.mockResolvedValue({ id: 'belong-456' });

      const response = await request(app)
        .put('/api/check-ins/checkin-123/belongings/belong-456/return')
        .send({ returnedBy: 'staff-123' });

      expect(prisma.checkInBelonging.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'belong-456' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'belong-456' },
      });
    });
  });

  describe('Multi-Pet Check-In Routes', () => {
    it('GET /api/check-ins/room-pets/:reservationId should return reservation data when no room is assigned', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'reservation-123',
        resourceId: null,
        startDate: '2026-03-31',
        endDate: '2026-04-02',
        petId: 'pet-123',
        customerId: 'customer-123',
        status: 'CONFIRMED',
      });

      const response = await request(app).get(
        '/api/check-ins/room-pets/reservation-123'
      );

      expect(prisma.reservation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reservation-123', tenantId: 'test-tenant' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          reservations: [
            {
              id: 'reservation-123',
              resourceId: null,
              startDate: '2026-03-31',
              endDate: '2026-04-02',
              petId: 'pet-123',
              customerId: 'customer-123',
              status: 'CONFIRMED',
            },
          ],
          totalPets: 1,
          resourceId: null,
        },
      });
    });

    it('POST /api/check-ins/batch should create batch check-ins', async () => {
      prisma.checkIn.create.mockResolvedValue({ id: 'checkin-123' });

      const response = await request(app)
        .post('/api/check-ins/batch')
        .send({
          checkIns: [
            {
              petId: 'pet-123',
              customerId: 'customer-123',
            },
          ],
        });

      expect(prisma.checkIn.create).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          successful: [
            {
              petId: 'pet-123',
              checkIn: { id: 'checkin-123' },
              success: true,
            },
          ],
          failed: [],
          totalProcessed: 1,
          successCount: 1,
          errorCount: 0,
        },
      });
    });
  });

  describe('Draft Routes', () => {
    it('GET /api/check-ins/draft/:reservationId should return a draft', async () => {
      prisma.checkIn.findFirst.mockResolvedValue({ id: 'draft-123' });

      const response = await request(app).get(
        '/api/check-ins/draft/reservation-123'
      );

      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'test-tenant',
            reservationId: 'reservation-123',
          }),
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'draft-123' },
      });
    });

    it('POST /api/check-ins/draft should create a draft', async () => {
      prisma.checkIn.create.mockResolvedValue({ id: 'draft-123' });
      prisma.checkIn.findUnique.mockResolvedValue({ id: 'draft-123' });

      const response = await request(app).post('/api/check-ins/draft').send({
        petId: 'pet-123',
        reservationId: 'reservation-123',
      });

      expect(prisma.checkIn.create).toHaveBeenCalled();
      expect(prisma.checkIn.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft-123' },
        })
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: { id: 'draft-123' },
      });
    });
  });
});
