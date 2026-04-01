import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/', async (req: TenantRequest, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        status: { in: ['CHECKED_IN', 'CONFIRMED'] },
        startDate: { lte: tomorrow },
        endDate: { gte: today },
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            breed: true,
            isPickyEater: true,
            foodNotes: true,
            profilePhoto: true,
            medications: {
              where: { isActive: true },
              select: {
                id: true,
                medicationName: true,
                dosage: true,
                frequency: true,
                timeOfDay: true,
                withFood: true,
                specialInstructions: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const petIds = reservations.map((reservation) => reservation.petId);
    const feedingLogs = await prisma.feedingLog.findMany({
      where: {
        tenantId,
        petId: { in: petIds },
        date: { gte: today, lt: tomorrow },
      },
      include: {
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const feedingLogsByPet = feedingLogs.reduce((acc: any, log) => {
      if (!acc[log.petId]) acc[log.petId] = [];
      acc[log.petId].push(log);
      return acc;
    }, {});

    const petsWithLogs = reservations.map((reservation) => ({
      reservationId: reservation.id,
      pet: reservation.pet,
      customer: reservation.customer,
      todaysFeedingLogs: feedingLogsByPet[reservation.petId] || [],
    }));

    res.status(200).json({
      status: 'success',
      results: petsWithLogs.length,
      data: petsWithLogs,
    });
  } catch (error) {
    next(error);
  }
});
