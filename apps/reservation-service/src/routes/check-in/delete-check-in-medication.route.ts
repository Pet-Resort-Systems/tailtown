import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const route: Router = expressRouter();

route.use('/check-ins/:checkInId/medications/:medicationId', async (req, res) => {
  const medicationId = req.params.medicationId;

  try {
    await prisma.checkInMedication.delete({
      where: { id: medicationId },
    });

    res.json({
      status: 'success',
      message: 'Medication deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting medication', {
      medicationId,
      error: error.message,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete medication',
    });
  }
});
