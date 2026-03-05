/**
 * Staff Profile Controller
 *
 * Handles profile photo operations:
 * - uploadProfilePhoto
 * - deleteProfilePhoto
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
    }

    // Get the staff member
    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      // Delete the uploaded file if staff not found
      fs.unlinkSync(req.file.path);
      return next(new AppError("Staff member not found", 404));
    }

    // Delete old photo if exists
    if (staff.profilePhoto) {
      const oldPhotoPath = path.join(
        __dirname,
        "../../../uploads/profile-photos",
        path.basename(staff.profilePhoto)
      );
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Generate relative URL for the uploaded photo
    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;

    // Update staff with new photo URL
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: { profilePhoto: photoUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        profilePhoto: true,
        isActive: true,
        lastLogin: true,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Profile photo uploaded successfully",
      data: updatedStaff,
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Delete profile photo
 */
export const deleteProfilePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Get the staff member
    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      return next(new AppError("Staff member not found", 404));
    }

    // Delete photo file if exists
    if (staff.profilePhoto) {
      const photoPath = path.join(
        __dirname,
        "../../../uploads/profile-photos",
        path.basename(staff.profilePhoto)
      );
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // Update staff to remove photo URL
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: { profilePhoto: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        profilePhoto: true,
        isActive: true,
        lastLogin: true,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Profile photo deleted successfully",
      data: updatedStaff,
    });
  } catch (error) {
    next(error);
  }
};
