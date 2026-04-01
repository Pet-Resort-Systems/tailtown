import { MealTime } from '@prisma/client';
import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { TenantRequest } from './types.js';

export const route: Router = expressRouter();

route.use('/', async (req: TenantRequest, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const staffId = req.user?.id;
    const { petId, reservationId, date, mealTime, rating, notes, foodType } =
      req.body;

    if (!staffId) {
      return next(new AppError('Staff authentication required', 401));
    }

    if (!petId || !mealTime || rating === undefined) {
      return next(new AppError('Pet ID, meal time, and rating are required', 400));
    }

    if (rating < 0 || rating > 4) {
      return next(new AppError('Rating must be between 0 and 4', 400));
    }

    if (!['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].includes(mealTime)) {
      return next(new AppError('Invalid meal time', 400));
    }

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const existing = await prisma.feedingLog.findFirst({
      where: {
        petId,
        date: logDate,
        mealTime: mealTime as MealTime,
      },
    });

    let feedingLog;
    if (existing) {
      feedingLog = await prisma.feedingLog.update({
        where: { id: existing.id },
        data: {
          rating,
          notes,
          foodType,
          staffId,
        },
        include: {
          pet: { select: { id: true, name: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } else {
      feedingLog = await prisma.feedingLog.create({
        data: {
          tenantId,
          petId,
          reservationId,
          date: logDate,
          mealTime: mealTime as MealTime,
          rating,
          notes,
          foodType,
          staffId,
        },
        include: {
          pet: { select: { id: true, name: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    if (rating <= 1) {
      const recentLogs = await prisma.feedingLog.findMany({
        where: {
          petId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: 'desc' },
        take: 5,
      });

      const lowRatings = recentLogs.filter((log) => log.rating <= 1).length;
      if (lowRatings >= 3) {
        await prisma.pet.update({
          where: { id: petId },
          data: { isPickyEater: true },
        });
      }
    }

    res.status(201).json({
      status: 'success',
      data: feedingLog,
    });
  } catch (error) {
    next(error);
  }
});
