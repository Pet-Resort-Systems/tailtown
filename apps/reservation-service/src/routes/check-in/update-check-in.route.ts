import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();
/**
 * Update a check-in
 * PUT /api/check-ins/:id
 */
route.use('/check-ins/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const tenantId =
      (req as any).tenantId || (req.headers['x-tenant-id'] as string);
    const {
      checkInNotes,
      checkOutNotes,
      checkOutBy,
      checkOutTime,
      foodProvided,
      medicationGiven,
      medicationNotes,
      behaviorDuringStay,
      photosTaken,
      photosShared,
    } = req.body;

    const existing = await prisma.checkIn.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Check-in not found',
      });
    }

    const checkIn = await prisma.checkIn.update({
      where: { id },
      data: {
        checkInNotes,
        checkOutNotes,
        checkOutBy,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        foodProvided,
        medicationGiven,
        medicationNotes,
        behaviorDuringStay,
        photosTaken,
        photosShared,
      },
      include: {
        responses: {
          include: {
            question: true,
          },
        },
        medications: true,
        belongings: true,
        agreement: true,
      },
    });

    res.json({
      status: 'success',
      data: checkIn,
    });
  } catch (error: any) {
    logger.error('Error updating check-in', {
      checkInId: id,
      tenantId: req.headers['x-tenant-id'],
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update check-in',
    });
  }
});
