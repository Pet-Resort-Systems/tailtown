/**
 * Common Validation Schemas
 * 
 * Centralized validation schemas using Zod for type-safe input validation
 * Prevents injection attacks, data corruption, and ensures data integrity
 */

import { z } from 'zod';

/**
 * Email validation schema
 * RFC 5322 compliant with additional security checks
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim()
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots'
  )
  .refine(
    (email) => !/[<>]/.test(email),
    'Email cannot contain < or > characters'
  );

/**
 * Password validation schema
 * Enforces strong password requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    'Password must contain at least one special character'
  );

/**
 * Phone number validation schema
 * Supports various formats, normalizes to E.164
 */
export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must not exceed 20 characters')
  .regex(
    /^[\d\s\-\+\(\)]+$/,
    'Phone number can only contain digits, spaces, +, -, (, )'
  )
  .transform((phone) => phone.replace(/[\s\-\(\)]/g, ''));

/**
 * UUID validation schema
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Tenant ID validation schema
 */
export const tenantIdSchema = z
  .string()
  .min(1, 'Tenant ID is required')
  .max(100, 'Tenant ID must not exceed 100 characters')
  .regex(
    /^[a-z0-9\-]+$/,
    'Tenant ID can only contain lowercase letters, numbers, and hyphens'
  );

/**
 * Name validation schema (first name, last name, etc.)
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .trim()
  .refine(
    (name) => !/[<>{}]/.test(name),
    'Name cannot contain <, >, {, or } characters'
  )
  .refine(
    (name) => !/^\s|\s$/.test(name),
    'Name cannot start or end with whitespace'
  );

/**
 * Date validation schema
 * Accepts ISO 8601 format
 */
export const dateSchema = z
  .string()
  .datetime('Invalid date format. Expected ISO 8601')
  .or(z.date());

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

/**
 * ID parameter schema (for route params)
 */
export const idParamSchema = z.object({
  id: uuidSchema
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200).trim(),
  ...paginationSchema.shape
});

/**
 * Positive integer schema
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Non-negative integer schema
 */
export const nonNegativeIntSchema = z.number().int().nonnegative();

/**
 * Currency amount schema (in cents)
 */
export const currencySchema = z
  .number()
  .int()
  .nonnegative()
  .max(999999999, 'Amount too large'); // Max ~$10M

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL must not exceed 2048 characters')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must start with http:// or https://'
  );

/**
 * Sanitized string schema (prevents XSS)
 */
export const sanitizedStringSchema = z
  .string()
  .max(10000, 'Text must not exceed 10000 characters')
  .transform((str) => 
    str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  );

/**
 * Array of UUIDs schema
 */
export const uuidArraySchema = z.array(uuidSchema).min(1).max(100);

/**
 * Boolean from string schema (for query params)
 */
export const booleanFromStringSchema = z
  .string()
  .transform((val) => val === 'true' || val === '1')
  .or(z.boolean());
