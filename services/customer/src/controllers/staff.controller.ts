import { TenantRequest } from "../middleware/tenant.middleware";
import { Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import bcrypt from "bcrypt";
import { validatePasswordOrThrow } from "../utils/passwordValidator";
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { logger } from "../utils/logger";
import {
  tenantAuditLog,
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from "../services/tenant-audit-log.service";
import fs from "fs";
import path from "path";

// Extend the Express Request type to include user information and tenant context
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
  tenantId?: string;
}

const prisma = new PrismaClient();

// Get all staff members
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
      tenantId: (req as any).tenantId, // Filter by tenant
    };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (role) {
      where.role = role;
    }
    if (department) {
      // Add department to where clause using Prisma.sql for raw query
      // This is a workaround since the field isn't recognized by TypeScript yet
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
      select: {
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
        specialties: true, // Include specialties for grooming/training staff
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Exclude password and other sensitive fields
      } as any,
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

// Get a single staff member by ID
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
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profilePhoto: true,
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
        // Exclude password and other sensitive fields
      } as any,
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

// Create a new staff member
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

    // Validate password strength
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
      select: {
        id: true,
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
        // Exclude password and other sensitive fields
      } as any,
    });

    // Audit log staff creation (WARNING severity - sensitive operation)
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

// Update a staff member
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

    // If updating email, check if it's already in use by another staff in the same tenant
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
      // Validate password strength
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
      select: {
        id: true,
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
        // Exclude password and other sensitive fields
      } as any,
    });

    // Audit log staff update (WARNING severity - sensitive operation)
    // Sanitize existing staff to remove password before logging
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

// Delete a staff member
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

    // Audit log staff deletion (CRITICAL severity)
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

// Authenticate staff member (login)
export const loginStaff = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const tenantId = req.tenantId;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // Find staff by email
    const staff = await prisma.staff.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!staff || !staff.isActive) {
      // Audit log failed login attempt
      await tenantAuditLog.logAuth(
        req,
        AuditAction.LOGIN_FAILED,
        undefined,
        email,
        {
          metadata: { reason: !staff ? "user_not_found" : "inactive_account" },
          success: false,
        }
      );
      return next(new AppError("Invalid credentials or inactive account", 401));
    }

    // Check if account is locked
    if (
      (staff as any).lockedUntil &&
      new Date((staff as any).lockedUntil) > new Date()
    ) {
      return res.status(423).json({
        status: "error",
        message:
          "Account is locked due to too many failed login attempts. Please try again later.",
        code: "ACCOUNT_LOCKED",
        lockedUntil: (staff as any).lockedUntil,
      });
    }

    // DEVELOPMENT MODE: Bypass password verification for testing
    const isDev = process.env.NODE_ENV !== "production";
    const isPasswordCorrect = isDev
      ? true
      : await bcrypt.compare(password, (staff as any).password);

    if (!isPasswordCorrect) {
      // Increment failed login attempts
      const failedAttempts = ((staff as any).failedLoginAttempts || 0) + 1;
      const updates: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: new Date(),
      };

      // Lock account after 5 failed attempts (15 minutes lockout)
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }

      await prisma.staff.update({
        where: { id: staff.id },
        data: updates,
      });

      // Audit log failed login (wrong password)
      await tenantAuditLog.logAuth(
        req,
        AuditAction.LOGIN_FAILED,
        staff.id,
        email,
        {
          metadata: { reason: "invalid_password", failedAttempts },
          success: false,
        }
      );

      return next(new AppError("Invalid credentials", 401));
    }

    // Update last login time and reset failed attempts on successful login
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null,
      } as any,
    });

    // Generate JWT access token
    const accessToken = generateToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      tenantId,
    });

    // Generate refresh token
    const refreshToken = generateRefreshToken({ id: staff.id });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        staffId: staff.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create a new object without sensitive fields
    const staffData = {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      specialties: staff.specialties,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      // Cast to any to access fields not recognized by TypeScript yet
      position: (staff as any).position,
      department: (staff as any).department,
      hireDate: (staff as any).hireDate,
    };

    // Audit log successful login
    await tenantAuditLog.logAuth(req, AuditAction.LOGIN, staff.id, email, {
      success: true,
    });

    res.status(200).json({
      status: "success",
      data: staffData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// Request password reset
export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Please provide email", 400));
    }

    // Find staff by email
    const staff = await prisma.staff.findFirst({
      where: { email },
    });

    if (!staff || !staff.isActive) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({
        status: "success",
        message:
          "If your email is registered, you will receive a password reset link",
      });
    }

    // Generate reset token (random string)
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Set token expiry to 1 hour from now
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        // Explicitly cast the data object to any to bypass type checking
        // since we've added fields to the schema that aren't yet recognized by the Prisma client
        resetToken,
        resetTokenExpiry,
      } as any,
    });

    // TODO: Send email with reset link
    // Reset link format: https://app.tailtown.com/reset-password?token={resetToken}
    if (process.env.NODE_ENV === "development") {
      logger.debug("Password reset token generated", {
        email: staff.email,
        resetLink: `http://localhost:3000/reset-password?token=${resetToken}`,
      });
    }

    res.status(200).json({
      status: "success",
      message:
        "If your email is registered, you will receive a password reset link",
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return next(new AppError("Please provide token and new password", 400));
    }

    // Find staff by reset token and check if token is still valid
    const staff = await prisma.staff.findFirst({
      where: {
        // Explicitly cast the where object to any to bypass type checking
        // since we've added fields to the schema that aren't yet recognized by the Prisma client
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      } as any,
    });

    if (!staff) {
      return next(new AppError("Invalid or expired token", 400));
    }

    // Validate password strength
    try {
      validatePasswordOrThrow(password);
    } catch (error: any) {
      return next(new AppError(error.message, 400));
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        // Explicitly cast the data object to any to bypass type checking
        // since we've added fields to the schema that aren't yet recognized by the Prisma client
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      } as any,
    });

    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Staff Availability Management

// Get availability for a staff member
export const getStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;

    const availability = await prisma.staffAvailability.findMany({
      where: { staffId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    res.status(200).json({
      status: "success",
      results: availability.length,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

// Create availability for a staff member
export const createStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const availabilityData = req.body;

    // Validate required fields
    if (
      availabilityData.dayOfWeek === undefined ||
      !availabilityData.startTime ||
      !availabilityData.endTime
    ) {
      return next(
        new AppError("Day of week, start time, and end time are required", 400)
      );
    }

    // Prepare data for creation
    const createData: any = {
      staffId,
      dayOfWeek: Number(availabilityData.dayOfWeek),
      startTime: availabilityData.startTime,
      endTime: availabilityData.endTime,
      isAvailable:
        availabilityData.isAvailable !== undefined
          ? Boolean(availabilityData.isAvailable)
          : true,
      isRecurring:
        availabilityData.isRecurring !== undefined
          ? Boolean(availabilityData.isRecurring)
          : true,
      // Note: 'notes' field is not in the Prisma schema
    };

    // Handle date fields if present
    if (availabilityData.effectiveFrom) {
      createData.effectiveFrom = new Date(availabilityData.effectiveFrom);
    }

    if (availabilityData.effectiveUntil) {
      createData.effectiveUntil = new Date(availabilityData.effectiveUntil);
    }

    logger.debug("Creating staff availability", {
      tenantId: (req as any).tenantId,
      staffId,
      dayOfWeek: availabilityData.dayOfWeek,
    });

    // Create availability record
    const newAvailability = await prisma.staffAvailability.create({
      data: createData,
    });

    res.status(201).json({
      status: "success",
      data: newAvailability,
    });
  } catch (error) {
    console.error("Error creating staff availability:", error);
    next(error);
  }
};

// Update staff availability
export const updateStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const availabilityData = req.body;

    // Check if availability exists
    const existingAvailability = await prisma.staffAvailability.findUnique({
      where: { id },
    });

    if (!existingAvailability) {
      return next(new AppError("Availability record not found", 404));
    }

    // Prepare data for update
    const updateData: any = {};

    // Handle basic fields
    if (availabilityData.dayOfWeek !== undefined) {
      updateData.dayOfWeek = Number(availabilityData.dayOfWeek);
    }

    if (availabilityData.startTime) {
      updateData.startTime = availabilityData.startTime;
    }

    if (availabilityData.endTime) {
      updateData.endTime = availabilityData.endTime;
    }

    if (availabilityData.isAvailable !== undefined) {
      updateData.isAvailable = Boolean(availabilityData.isAvailable);
    }

    if (availabilityData.isRecurring !== undefined) {
      updateData.isRecurring = Boolean(availabilityData.isRecurring);
    }

    // Note: 'notes' field is not in the Prisma schema
    // Removed notes field handling

    // Handle date fields
    if (availabilityData.effectiveFrom !== undefined) {
      updateData.effectiveFrom = availabilityData.effectiveFrom
        ? new Date(availabilityData.effectiveFrom)
        : null;
    }

    if (availabilityData.effectiveUntil !== undefined) {
      updateData.effectiveUntil = availabilityData.effectiveUntil
        ? new Date(availabilityData.effectiveUntil)
        : null;
    }

    logger.debug("Updating staff availability", {
      availabilityId: id,
      tenantId: (req as any).tenantId,
    });

    // Update availability
    const updatedAvailability = await prisma.staffAvailability.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: "success",
      data: updatedAvailability,
    });
  } catch (error: any) {
    logger.error("Error updating staff availability", {
      availabilityId: req.params.id,
      error: error.message,
    });
    next(error);
  }
};

// Delete staff availability
export const deleteStaffAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if availability exists
    const existingAvailability = await prisma.staffAvailability.findUnique({
      where: { id },
    });

    if (!existingAvailability) {
      return next(new AppError("Availability record not found", 404));
    }

    // Delete availability
    await prisma.staffAvailability.delete({
      where: { id },
    });

    res.status(200).json({
      status: "success",
      message: "Availability record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Staff Time Off Management

// Get time off for a staff member
export const getStaffTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const status = req.query.status as string;

    // Build where condition
    const where: any = { staffId };
    if (status) {
      where.status = status;
    }

    const timeOff = await prisma.staffTimeOff.findMany({
      where,
      orderBy: { startDate: "asc" },
    });

    res.status(200).json({
      status: "success",
      results: timeOff.length,
      data: timeOff,
    });
  } catch (error) {
    next(error);
  }
};

// Create time off for a staff member
export const createStaffTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const timeOffData = req.body;

    // Validate required fields
    if (!timeOffData.startDate || !timeOffData.endDate || !timeOffData.type) {
      return next(
        new AppError("Start date, end date, and type are required", 400)
      );
    }

    // Prepare data for creation
    const createData: any = {
      staffId,
      startDate: new Date(timeOffData.startDate),
      endDate: new Date(timeOffData.endDate),
      type: timeOffData.type,
      status: timeOffData.status || "PENDING",
      reason: timeOffData.reason || null,
    };

    // Handle optional fields
    if (timeOffData.notes) {
      createData.notes = timeOffData.notes;
    }

    if (timeOffData.approvedById) {
      createData.approvedById = timeOffData.approvedById;
    }

    if (timeOffData.approvedDate) {
      createData.approvedDate = new Date(timeOffData.approvedDate);
    }

    logger.debug("Creating staff time off", {
      tenantId: (req as any).tenantId,
      staffId,
      type: timeOffData.type,
    });

    // Create time off record
    const newTimeOff = await prisma.staffTimeOff.create({
      data: createData,
    });

    res.status(201).json({
      status: "success",
      data: newTimeOff,
    });
  } catch (error: any) {
    logger.error("Error creating staff time off", {
      staffId: req.params.staffId,
      error: error.message,
    });
    next(error);
  }
};

// Update staff time off
export const updateStaffTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const timeOffData = req.body;

    // Check if time off exists
    const existingTimeOff = await prisma.staffTimeOff.findUnique({
      where: { id },
    });

    if (!existingTimeOff) {
      return next(new AppError("Time off record not found", 404));
    }

    // Prepare data for update
    const updateData: any = {};

    // Handle basic fields
    if (timeOffData.type !== undefined) {
      updateData.type = timeOffData.type;
    }

    if (timeOffData.status !== undefined) {
      updateData.status = timeOffData.status;
    }

    if (timeOffData.reason !== undefined) {
      updateData.reason = timeOffData.reason;
    }

    if (timeOffData.notes !== undefined) {
      updateData.notes = timeOffData.notes;
    }

    // Handle date fields
    if (timeOffData.startDate) {
      updateData.startDate = new Date(timeOffData.startDate);
    }

    if (timeOffData.endDate) {
      updateData.endDate = new Date(timeOffData.endDate);
    }

    // Handle approval fields
    if (timeOffData.approvedById !== undefined) {
      updateData.approvedById = timeOffData.approvedById;
    }

    if (timeOffData.approvedDate !== undefined) {
      updateData.approvedDate = timeOffData.approvedDate
        ? new Date(timeOffData.approvedDate)
        : null;
    }

    logger.debug("Updating staff time off", {
      timeOffId: id,
      tenantId: (req as any).tenantId,
    });

    // Update time off
    const updatedTimeOff = await prisma.staffTimeOff.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: "success",
      data: updatedTimeOff,
    });
  } catch (error: any) {
    logger.error("Error updating staff time off", {
      timeOffId: req.params.id,
      error: error.message,
    });
    next(error);
  }
};

// Delete staff time off
export const deleteStaffTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if time off exists
    const existingTimeOff = await prisma.staffTimeOff.findUnique({
      where: { id },
    });

    if (!existingTimeOff) {
      return next(new AppError("Time off record not found", 404));
    }

    // Delete time off
    await prisma.staffTimeOff.delete({
      where: { id },
    });

    res.status(200).json({
      status: "success",
      message: "Time off record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get available staff for scheduling
export const getAvailableStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date, startTime, endTime, specialties } = req.query;

    if (!date || !startTime || !endTime) {
      return next(
        new AppError("Date, start time, and end time are required", 400)
      );
    }

    const searchDate = new Date(date as string);
    const dayOfWeek = searchDate.getDay(); // 0-6 for Sunday-Saturday

    // Process specialties parameter
    let specialtiesArray: string[] = [];
    if (specialties) {
      if (Array.isArray(specialties)) {
        specialtiesArray = specialties.map((s) => String(s));
      } else {
        specialtiesArray = [String(specialties)];
      }
    }

    // Find staff who are available on this day and time
    const availableStaff = await prisma.staff.findMany({
      where: {
        isActive: true,
        // Include staff with matching specialties if provided
        ...(specialtiesArray.length > 0
          ? {
              specialties: {
                hasSome: specialtiesArray,
              },
            }
          : {}),
        // Include staff who have availability for this day and time
        availability: {
          some: {
            dayOfWeek,
            isAvailable: true,
            startTime: {
              lte: startTime as string,
            },
            endTime: {
              gte: endTime as string,
            },
            // Use AND condition with nested OR conditions for date ranges
            AND: [
              {
                OR: [
                  { effectiveFrom: null },
                  { effectiveFrom: { lte: searchDate } },
                ],
              },
              {
                OR: [
                  { effectiveUntil: null },
                  { effectiveUntil: { gte: searchDate } },
                ],
              },
            ],
          },
        },
        // Exclude staff who have time off on this day
        NOT: {
          timeOff: {
            some: {
              status: "APPROVED",
              startDate: { lte: searchDate },
              endDate: { gte: searchDate },
            },
          },
        },
      },
      include: {
        availability: true,
      },
    });

    res.status(200).json({
      status: "success",
      results: availableStaff.length,
      data: availableStaff,
    });
  } catch (error) {
    next(error);
  }
};

// Staff Schedule Management

// Helper to detect overlapping schedules for a staff member on a given day
const hasScheduleConflict = async (
  tenantId: string | undefined,
  staffId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<boolean> => {
  // Normalize to the calendar day for date-based filtering
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const where: any = {
    staffId,
    date: {
      gte: startOfDay,
      lte: endOfDay,
    },
    // Time overlap: existing.endTime > new.startTime AND existing.startTime < new.endTime
    endTime: {
      gt: startTime,
    },
    startTime: {
      lt: endTime,
    },
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  if (excludeScheduleId) {
    where.id = { not: excludeScheduleId };
  }

  const conflict = await prisma.staffSchedule.findFirst({ where });
  return !!conflict;
};

// Get all schedules for a specific staff member
export const getStaffSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    let whereClause: any = { staffId };

    if (startDate && endDate) {
      // Convert string dates to DateTime objects
      const startDateTime = new Date(startDate as string);
      const endDateTime = new Date(endDate as string);

      // Set the time to the beginning and end of the day to include all schedules
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    const schedules = await prisma.staffSchedule.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    res.status(200).json({
      status: "success",
      results: schedules.length,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching staff schedules:", error);
    next(error);
  }
};

// Simple test endpoint to diagnose routing issues
export const testSchedulesEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({
    status: "success",
    message: "Test endpoint working",
    query: req.query,
    params: req.params,
  });
};

// Get all schedules across all staff members
export const getAllSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.debug("getAllSchedules called", {
      tenantId: (req as any).tenantId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    const { startDate, endDate } = req.query;

    let whereClause: any = {};

    if (startDate && endDate) {
      // Convert string dates to DateTime objects
      const startDateTime = new Date(startDate as string);
      const endDateTime = new Date(endDate as string);

      // Set the time to the beginning and end of the day to include all schedules
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    const schedules = await prisma.staffSchedule.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    res.status(200).json({
      status: "success",
      results: schedules.length,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching all schedules:", error);
    next(error);
  }
};

// Create a new schedule for a staff member
export const createStaffSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const { date, startTime, endTime, status, notes, location, role } =
      req.body;

    // Validate required fields
    if (!date || !startTime || !endTime) {
      return next(
        new AppError("Date, start time, and end time are required", 400)
      );
    }

    // Check if staff exists
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return next(new AppError("Staff not found", 404));
    }

    const scheduleDate = new Date(date);

    // Prevent overlapping schedules for the same staff member on the same day
    const conflict = await hasScheduleConflict(
      req.tenantId,
      staffId,
      scheduleDate,
      startTime,
      endTime
    );

    if (conflict) {
      return next(
        new AppError(
          "This staff member already has a shift during this time",
          400
        )
      );
    }

    // Create the schedule
    const newSchedule = await prisma.staffSchedule.create({
      data: {
        staffId,
        date: scheduleDate,
        startTime,
        endTime,
        status: status || "SCHEDULED",
        notes,
        location,
        role,
        createdById: req.user?.id,
      },
    });

    res.status(201).json({
      status: "success",
      data: newSchedule,
    });
  } catch (error: any) {
    logger.error("Error creating staff schedule", {
      staffId: req.params.staffId,
      error: error.message,
    });
    next(error);
  }
};

// Update an existing staff schedule
export const updateStaffSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, status, notes, location, role } =
      req.body;

    // Check if schedule exists
    const schedule = await prisma.staffSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return next(new AppError("Schedule not found", 404));
    }

    const newDate = date ? new Date(date) : schedule.date;
    const newStartTime = startTime || schedule.startTime;
    const newEndTime = endTime || schedule.endTime;

    // Prevent overlapping schedules for the same staff member on the same day (excluding this schedule itself)
    const conflict = await hasScheduleConflict(
      req.tenantId,
      schedule.staffId,
      newDate,
      newStartTime,
      newEndTime,
      schedule.id
    );

    if (conflict) {
      return next(
        new AppError(
          "This staff member already has a shift during this time",
          400
        )
      );
    }

    // Update the schedule
    const updatedSchedule = await prisma.staffSchedule.update({
      where: { id: scheduleId },
      data: {
        date: date ? newDate : undefined,
        startTime,
        endTime,
        status,
        notes,
        location,
        role,
        updatedById: req.user?.id,
      },
    });

    res.status(200).json({
      status: "success",
      data: updatedSchedule,
    });
  } catch (error: any) {
    logger.error("Error updating staff schedule", {
      scheduleId: req.params.scheduleId,
      error: error.message,
    });
    next(error);
  }
};

// Delete a staff schedule
export const deleteStaffSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scheduleId } = req.params;

    // Check if schedule exists
    const schedule = await prisma.staffSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      return next(new AppError("Schedule not found", 404));
    }

    // Delete the schedule
    await prisma.staffSchedule.delete({ where: { id: scheduleId } });

    res.status(200).json({
      status: "success",
      message: "Schedule deleted successfully",
    });
  } catch (error: any) {
    logger.error("Error deleting staff schedule", {
      scheduleId: req.params.scheduleId,
      error: error.message,
    });
    next(error);
  }
};

// Create multiple staff schedules in bulk
export const bulkCreateSchedules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return next(new AppError("Valid schedules array is required", 400));
    }

    // Process each schedule
    const createdSchedules = await prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const schedule of schedules) {
        const {
          staffId,
          date,
          startTime,
          endTime,
          status,
          notes,
          location,
          role,
        } = schedule;

        if (!staffId || !date || !startTime || !endTime) {
          throw new AppError(
            "Each schedule must include staffId, date, startTime, and endTime",
            400
          );
        }

        const scheduleDate = new Date(date);

        // Check for schedule conflicts before inserting
        const conflict = await hasScheduleConflict(
          req.tenantId,
          staffId,
          scheduleDate,
          startTime,
          endTime
        );

        if (conflict) {
          throw new AppError(
            `Staff member already has a shift during ${startTime}–${endTime} on this date`,
            400
          );
        }

        const newSchedule = await tx.staffSchedule.create({
          data: {
            staffId,
            date: scheduleDate,
            startTime,
            endTime,
            status: status || "SCHEDULED",
            notes,
            location,
            role,
            createdById: req.user?.id,
          },
        });

        results.push(newSchedule);
      }

      return results;
    });

    res.status(201).json({
      status: "success",
      results: createdSchedules.length,
      data: createdSchedules,
    });
  } catch (error: any) {
    logger.error("Error creating bulk schedules", {
      count: req.body.schedules?.length,
      error: error.message,
    });
    next(error);
  }
};

// Upload profile photo
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
        "../../uploads/profile-photos",
        path.basename(staff.profilePhoto)
      );
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Generate relative URL for the uploaded photo
    // Frontend will use current origin to load it
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

// Delete profile photo
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
        "../../uploads/profile-photos",
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

// Refresh access token using refresh token
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 400));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return next(new AppError("Invalid or expired refresh token", 401));
    }

    // Check if refresh token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { staff: true },
    });

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresAt < new Date()
    ) {
      return next(new AppError("Invalid or expired refresh token", 401));
    }

    // Check if staff is still active
    if (!storedToken.staff.isActive) {
      return next(new AppError("Account is inactive", 401));
    }

    // Revoke old refresh token (token rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new access token
    const newAccessToken = generateToken({
      id: storedToken.staff.id,
      email: storedToken.staff.email,
      role: storedToken.staff.role,
      tenantId: storedToken.staff.tenantId,
    });

    // Generate new refresh token
    const newRefreshToken = generateRefreshToken({ id: storedToken.staff.id });

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        staffId: storedToken.staff.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(200).json({
      status: "success",
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};
