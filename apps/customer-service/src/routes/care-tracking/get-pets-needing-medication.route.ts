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
            profilePhoto: true,
            medications: {
              where: { isActive: true },
              include: {
                logs: {
                  where: {
                    scheduledTime: { gte: today, lt: tomorrow },
                  },
                  include: {
                    staff: {
                      select: { id: true, firstName: true, lastName: true },
                    },
                  },
                },
              },
            },
          },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const petsWithMeds = reservations
      .filter((reservation) => reservation.pet.medications.length > 0)
      .map((reservation) => ({
        reservationId: reservation.id,
        pet: reservation.pet,
        customer: reservation.customer,
      }));

    res.status(200).json({
      status: 'success',
      results: petsWithMeds.length,
      data: petsWithMeds,
    });
  } catch (error) {
    next(error);
  }
});
