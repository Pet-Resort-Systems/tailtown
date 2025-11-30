/**
 * Staff CRUD Controller
 *
 * Handles basic CRUD operations for staff members:
 * - getAllStaff
 * - getStaffById
 * - createStaff
 * - updateStaff
 * - deleteStaff
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware";
import bcrypt from "bcrypt";
import { validatePasswordOrThrow } from "../../utils/passwordValidator";
import { logger } from "../../utils/logger";
import { TenantRequest } from "../../middleware/tenant.middleware";
import {
  tenantAuditLog,
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from "../../services/tenant-audit-log.service";

const prisma = new PrismaClient();

// Standard staff select fields (excludes sensitive data)
const staffSelectFields = {
  id: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  role: true,
  department: true,
  position: true,
  specialties: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as any;

/**
 * Get all staff members with pagination and filtering
 */
export const getAllStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;
    const role = req.query.role as string;
    const department = req.query.department as string;

    // Build where condition
    const where: any = {
      tenantId: (req as any).tenantId,
    };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (role) {
      where.role = role;
    }
    if (department) {
      (where as any).department = department;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
      ];
    }

    const staff = await prisma.staff.findMany({
      where,
      skip,
      take: limit,
      select: staffSelectFields,
      orderBy: { lastName: "asc" },
    });

    const total = await prisma.staff.count({ where });

    res.status(200).json({
      status: "success",
      results: staff.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single staff member by ID
 */
export const getStaffById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findFirst({
      where: {
        id,
        tenantId: (req as any).tenantId,
      },
      select: {
        ...staffSelectFields,
        profilePhoto: true,
      },
    });

    if (!staff) {
      return next(new AppError("Staff member not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new staff member
 */
export const createStaff = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const staffData = req.body;
    const tenantId = req.tenantId;

    // Check if email already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { tenantId_email: { tenantId, email: staffData.email } },
      select: { id: true },
    });

    if (existingStaff) {
      return next(new AppError("Email already in use", 400));
    }

    // Validate and hash the password
    if (!staffData.password) {
      return next(new AppError("Password is required", 400));
    }

    try {
      validatePasswordOrThrow(staffData.password);
    } catch (error: any) {
      return next(new AppError(error.message, 400));
    }

    const hashedPassword = await bcrypt.hash(staffData.password, 10);

    // Create staff member
    const newStaff = await prisma.staff.create({
      data: {
        ...staffData,
        tenantId,
        password: hashedPassword,
      },
      select: staffSelectFields,
    });

    // Audit log staff creation
    await tenantAuditLog.logStaff(
      req,
      AuditAction.CREATE,
      newStaff.id as string,
      `${newStaff.firstName} ${newStaff.lastName}`,
      { newValue: newStaff, metadata: { role: newStaff.role } }
    );

    res.status(201).json({
      status: "success",
      data: newStaff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a staff member
 */
export const updateStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const staffData = req.body;

    // Check if staff exists and get current state for audit
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      return next(new AppError("Staff member not found", 404));
    }

    // If updating email, check if it's already in use
    if (staffData.email) {
      const tenantId = (req as any).tenantId;
      const emailInUse = await prisma.staff.findFirst({
        where: {
          email: staffData.email,
          tenantId,
          id: { not: id },
        },
        select: { id: true },
      });

      if (emailInUse) {
        return next(
          new AppError("Email already in use by another staff member", 400)
        );
      }
    }

    // If updating password, validate and hash it
    if (staffData.password) {
      try {
        validatePasswordOrThrow(staffData.password);
      } catch (error: any) {
        return next(new AppError(error.message, 400));
      }
      staffData.password = await bcrypt.hash(staffData.password, 10);
    }

    // Update staff member
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: staffData,
      select: staffSelectFields,
    });

    // Audit log staff update
    const { password: _, ...sanitizedExisting } = existingStaff;
    await tenantAuditLog.logStaff(
      req,
      AuditAction.UPDATE,
      id,
      `${updatedStaff.firstName} ${updatedStaff.lastName}`,
      { previousValue: sanitizedExisting, newValue: updatedStaff }
    );

    res.status(200).json({
      status: "success",
      data: updatedStaff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a staff member
 */
export const deleteStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if staff exists and get full record for audit
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      return next(new AppError("Staff member not found", 404));
    }

    // Delete staff member
    await prisma.staff.delete({
      where: { id },
    });

    // Audit log staff deletion
    const { password: _, ...sanitizedStaff } = existingStaff;
    await tenantAuditLog.logFromRequest(
      req,
      AuditAction.DELETE,
      AuditCategory.STAFF,
      "staff",
      id,
      `${existingStaff.firstName} ${existingStaff.lastName}`,
      { previousValue: sanitizedStaff, severity: AuditSeverity.CRITICAL }
    );

    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
