import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Get all pets sharing the same room/resource for a reservation
 * GET /api/check-ins/room-pets/:reservationId
 */
route.use('/check-ins/room-pets/:reservationId', async (req, res) => {
  const reservationId = req.params.reservationId;

  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);

    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
      select: {
        id: true,
        resourceId: true,
        startDate: true,
        endDate: true,
        petId: true,
        customerId: true,
        status: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservation not found',
      });
    }

    if (!reservation.resourceId) {
      return res.json({
        status: 'success',
        data: {
          reservations: [reservation],
          totalPets: 1,
          resourceId: null,
        },
      });
    }

    const roomReservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        resourceId: reservation.resourceId,
        status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
        AND: [
          { startDate: { lte: reservation.endDate } },
          { endDate: { gte: reservation.startDate } },
        ],
      },
      select: {
        id: true,
        petId: true,
        customerId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { startDate: 'asc' },
    });

    const checkInStatuses = await prisma.checkIn.findMany({
      where: {
        tenantId,
        reservationId: { in: roomReservations.map((r) => r.id) },
      },
      select: {
        reservationId: true,
        id: true,
        checkInTime: true,
      },
    });

    const checkInMap = new Map(
      checkInStatuses.map((checkIn) => [checkIn.reservationId, checkIn])
    );

    const enrichedReservations = roomReservations.map((roomReservation) => ({
      ...roomReservation,
      checkIn: checkInMap.get(roomReservation.id) || null,
      isCheckedIn: !!checkInMap.get(roomReservation.id),
    }));

    res.json({
      status: 'success',
      data: {
        reservations: enrichedReservations,
        totalPets: roomReservations.length,
        resourceId: reservation.resourceId,
        dateRange: {
          startDate: reservation.startDate,
          endDate: reservation.endDate,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching room pets', {
      reservationId,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch room pets',
    });
  }
});
