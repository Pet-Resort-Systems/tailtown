/**
 * Report Card Photos Controller
 *
 * Handles photo operations:
 * - uploadPhoto
 * - deletePhoto
 * - updatePhoto
 */

import { type Request, type Response, type NextFunction } from 'express';

import { assertStringRouteParam } from '@tailtown/shared';
import { AppError } from '../../middleware/error.middleware.js';
import { prisma } from '../../config/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'STAFF';
    tenantId?: string;
  };
  tenantId?: string;
}

/**
 * Upload photo to report card
 * POST /api/report-cards/:id/photos
 */
export const uploadPhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Report card ID is required'
    );
    const tenantId = req.tenantId;
    const staffId = req.user?.id;

    const {
      url,
      thumbnailUrl,
      caption,
      order,
      fileSize,
      width,
      height,
      mimeType,
    } = req.body;

    if (!url) {
      return next(new AppError('Photo URL is required', 400));
    }

    const reportCard = await prisma.reportCard.findFirst({
      where: { id, tenantId: tenantId! },
    });

    if (!reportCard) {
      return next(new AppError('Report card not found', 404));
    }

    const photo = await prisma.reportCardPhoto.create({
      data: {
        reportCardId: id,
        url,
        thumbnailUrl,
        caption,
        order: order || 0,
        uploadedByStaffId: staffId,
        fileSize,
        width,
        height,
        mimeType,
      },
      include: {
        uploadedByStaff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({ success: true, data: photo });
  } catch (error: any) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(error.message || 'Failed to upload photo', 500));
  }
};

/**
 * Delete photo from report card
 * DELETE /api/report-cards/:id/photos/:photoId
 */
export const deletePhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Report card ID is required'
    );
    const photoId = assertStringRouteParam(
      req.params.photoId,
      req.originalUrl,
      AppError.validationError,
      'Photo ID is required'
    );
    const tenantId = req.tenantId;

    const reportCard = await prisma.reportCard.findFirst({
      where: { id, tenantId: tenantId! },
    });

    if (!reportCard) {
      return next(new AppError('Report card not found', 404));
    }

    const photo = await prisma.reportCardPhoto.findFirst({
      where: { id: photoId, reportCardId: id },
    });

    if (!photo) {
      return next(new AppError('Photo not found', 404));
    }

    await prisma.reportCardPhoto.delete({ where: { id: photoId } });

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error: any) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(error.message || 'Failed to delete photo', 500));
  }
};

/**
 * Update photo (caption, order)
 * PATCH /api/report-cards/:id/photos/:photoId
 */
export const updatePhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Report card ID is required'
    );
    const photoId = assertStringRouteParam(
      req.params.photoId,
      req.originalUrl,
      AppError.validationError,
      'Photo ID is required'
    );
    const tenantId = req.tenantId;
    const { caption, order } = req.body;

    const reportCard = await prisma.reportCard.findFirst({
      where: { id, tenantId: tenantId! },
    });

    if (!reportCard) {
      return next(new AppError('Report card not found', 404));
    }

    const photo = await prisma.reportCardPhoto.update({
      where: { id: photoId },
      data: {
        ...(caption !== undefined && { caption }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ success: true, data: photo });
  } catch (error: any) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(error.message || 'Failed to update photo', 500));
  }
};
