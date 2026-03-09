/**
 * Staff Validation Schemas
 * 
 * Validation schemas for staff-related endpoints
 */

import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema, nameSchema, uuidSchema } from './common.validators';

/**
 * Staff login schema
 */
export const staffLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

/**
 * Staff registration/creation schema
 */
export const createStaffSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema.optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'GROOMER', 'TRAINER'], {
    message: 'Invalid role'
  }),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  specialties: z.array(z.string().max(50)).max(20).default([])
});

/**
 * Staff update schema (all fields optional)
 */
export const updateStaffSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'GROOMER', 'TRAINER']).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
  isActive: z.boolean().optional()
});

/**
 * Password reset request schema
 */
export const requestPasswordResetSchema = z.object({
  email: emailSchema
});

/**
 * Password reset schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema
});

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

/**
 * Staff ID param schema
 */
export const staffIdParamSchema = z.object({
  id: uuidSchema
});
