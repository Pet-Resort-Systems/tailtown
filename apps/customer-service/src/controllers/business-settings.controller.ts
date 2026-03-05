/**
 * Business Settings Controller
 * 
 * Handles business customization settings like logo upload
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import AppError from '../utils/appError';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const tenantId = (req as any).tenantId;
    const ext = path.extname(file.originalname);
    cb(null, `logo-${tenantId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const uploadMiddleware = upload.single('logo');

/**
 * Get business settings for the current tenant
 */
export const getBusinessSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return next(new AppError('Tenant ID not found', 400));
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        businessName: true,
        logoUrl: true
      }
    });

    if (!tenant) {
      return next(new AppError('Tenant not found', 404));
    }

    res.status(200).json({
      logoUrl: tenant.logoUrl
    });
  } catch (error) {
    console.error('Error getting business settings:', error);
    return next(new AppError('Error getting business settings', 500));
  }
};

/**
 * Upload business logo
 */
export const uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return next(new AppError('Tenant ID not found', 400));
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Get the old logo URL to delete it
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoUrl: true }
    });

    // Delete old logo file if it exists
    if (tenant?.logoUrl) {
      const oldFilePath = path.join(__dirname, '../../', tenant.logoUrl);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.error('Error deleting old logo:', error);
        // Continue even if deletion fails
      }
    }

    // Generate the URL path for the uploaded file
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update tenant with new logo URL
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl }
    });

    res.status(200).json({
      success: true,
      logoUrl
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return next(new AppError('Error uploading logo', 500));
  }
};

/**
 * Delete business logo
 */
export const deleteLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return next(new AppError('Tenant ID not found', 400));
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoUrl: true }
    });

    if (!tenant) {
      return next(new AppError('Tenant not found', 404));
    }

    // Delete the logo file if it exists
    if (tenant.logoUrl) {
      const filePath = path.join(__dirname, '../../', tenant.logoUrl);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error deleting logo file:', error);
        // Continue even if deletion fails
      }
    }

    // Remove logo URL from tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: null }
    });

    res.status(200).json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return next(new AppError('Error deleting logo', 500));
  }
};
