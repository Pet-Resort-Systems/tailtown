/**
 * Customer Authentication Controller
 *
 * Handles customer portal authentication including:
 * - Login with email/password
 * - Password reset request (sends email)
 * - Password reset completion
 * - Password change for logged-in customers
 */

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { emailService } from "../services/email.service";

const prisma = new PrismaClient();

// Password reset token expiry (24 hours)
const RESET_TOKEN_EXPIRY_HOURS = 24;

/**
 * Customer login with email and password
 * POST /api/customers/auth/login
 */
export const customerLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const tenantId = req.tenantId;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Find customer by email
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        email: email.toLowerCase().trim(),
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        emergencyContact: true,
        emergencyPhone: true,
        portalEnabled: true,
        passwordHash: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    if (!customer.portalEnabled) {
      return res.status(403).json({
        status: "error",
        message: "Portal access is disabled for this account",
      });
    }

    // Check if customer has set a password
    if (!customer.passwordHash) {
      return res.status(401).json({
        status: "error",
        message: "PASSWORD_NOT_SET",
        detail: 'Please set up your password using the "Forgot Password" link',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      customer.passwordHash
    );
    if (!isValidPassword) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password",
      });
    }

    // Update last login time
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastPortalLogin: new Date() },
    });

    // Return customer data (without password hash)
    const { passwordHash: _, ...customerData } = customer;

    return res.status(200).json({
      status: "success",
      data: customerData,
    });
  } catch (error: any) {
    console.error("Customer login error:", error);
    return res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
};

/**
 * Request password reset - sends email with reset link
 * POST /api/customers/auth/forgot-password
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const tenantId = req.tenantId;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    // Find customer by email
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        email: email.toLowerCase().trim(),
        isActive: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!customer) {
      return res.status(200).json({
        status: "success",
        message:
          "If an account exists with this email, a password reset link will be sent",
      });
    }

    if (!customer.portalEnabled) {
      return res.status(200).json({
        status: "success",
        message:
          "If an account exists with this email, a password reset link will be sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // Save token to database
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email via SendGrid
    try {
      await emailService.sendPasswordResetEmail(
        customer.email,
        customer.firstName,
        resetToken,
        "Tailtown Pet Resort" // TODO: Get business name from tenant settings
      );
      console.log(`[CustomerAuth] Password reset email sent to ${email}`);
    } catch (emailError) {
      // Log but don't fail - user shouldn't know if email failed
      console.error(
        "[CustomerAuth] Failed to send password reset email:",
        emailError
      );
    }

    return res.status(200).json({
      status: "success",
      message:
        "If an account exists with this email, a password reset link will be sent",
      // Include token in dev mode for testing (remove in production)
      ...(process.env.NODE_ENV === "development" && { resetToken }),
    });
  } catch (error: any) {
    console.error("Password reset request error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to process password reset request",
    });
  }
};

/**
 * Reset password using token
 * POST /api/customers/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const tenantId = req.tenantId;

    if (!token || !password) {
      return res.status(400).json({
        status: "error",
        message: "Token and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
    }

    // Find customer with valid reset token
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isActive: true,
      },
    });

    if (!customer) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log(
      `[CustomerAuth] Password reset completed for ${customer.email}`
    );

    return res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (error: any) {
    console.error("Password reset error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to reset password",
    });
  }
};

/**
 * Verify reset token is valid (for UI validation)
 * GET /api/customers/auth/verify-token?token=xxx
 */
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    const tenantId = req.tenantId;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Token is required",
      });
    }

    // Find customer with valid reset token
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isActive: true,
      },
      select: {
        email: true,
        firstName: true,
      },
    });

    if (!customer) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired reset token",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        email: customer.email,
        firstName: customer.firstName,
      },
    });
  } catch (error: any) {
    console.error("Token verification error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify token",
    });
  }
};

/**
 * Check if customer has password set (for login flow)
 * GET /api/customers/auth/check-password?email=xxx
 */
export const checkPasswordStatus = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    const tenantId = req.tenantId;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        email: email.toLowerCase().trim(),
        isActive: true,
      },
      select: {
        id: true,
        portalEnabled: true,
        passwordHash: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        hasPassword: !!customer.passwordHash,
        portalEnabled: customer.portalEnabled,
      },
    });
  } catch (error: any) {
    console.error("Check password status error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to check password status",
    });
  }
};
