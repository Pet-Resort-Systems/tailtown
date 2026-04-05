import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createEnv } from '@t3-oss/env-core';
import { stringToNumberSchema, transformedBooleanSchema } from '@tailtown/shared';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

const envDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(envDir, '../../..', '.env');

dotenvConfig({ path: rootEnvPath });

const validatedEnv = createEnv({
  server: {
    SERVICES_NODE_ENV: z.enum(['development', 'production', 'test']),
    SERVICES_ALLOWED_ORIGINS: z.string().optional(),
    SERVICES_REDIS_URL: z.url().default('redis://localhost:6379'),

    CUSTOMER_DATABASE_URL: z.string().min(1),
    CUSTOMER_SERVICE_DISABLE_HTTPS_REDIRECT:
      transformedBooleanSchema.default(false),
    CUSTOMER_SERVICE_API_KEY: z.string().optional(),
    CUSTOMER_SUPER_ADMIN_API_KEY: z.string().optional(),

    CUSTOMER_JWT_SECRET: z
      .string()
      .min(1)
      .default('your-secret-key-change-in-production'),
    CUSTOMER_JWT_REFRESH_SECRET: z
      .string()
      .min(1)
      .default('your-refresh-secret-key-change-in-production'),
    CUSTOMER_SUPER_ADMIN_JWT_SECRET: z
      .string()
      .min(1)
      .default('super-admin-secret-key-change-in-production'),

    CUSTOMER_CACHE_TTL: stringToNumberSchema.default(300),

    CUSTOMER_SENTRY_DSN: z.string().optional(),
    CUSTOMER_SENDGRID_API_KEY: z.string().optional(),
    CUSTOMER_SENDGRID_FROM_EMAIL: z.string().default('noreply@tailtown.com'),
    CUSTOMER_SENDGRID_FROM_NAME: z.string().default('Tailtown Pet Resort'),

    CUSTOMER_SERVICE_DATA_DIR: z.string().optional(),

    CUSTOMER_BUSINESS_NAME: z.string().default('Tailtown Pet Resort'),
    CUSTOMER_BUSINESS_PHONE: z.string().optional(),
    CUSTOMER_FRONTEND_URL: z.string().default('https://tailtown.canicloud.com'),

    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_API_KEY_SID: z.string().optional(),
    TWILIO_API_KEY_SECRET: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),

    RESERVATION_SERVICE_HOST: z.string().default('localhost'),
    RESERVATION_SERVICE_PORT: stringToNumberSchema.default(4003),
    PAYMENT_SERVICE_PORT: stringToNumberSchema.default(4005),

    DEBUG_PRISMA: transformedBooleanSchema.default(false),
    GINGR_SUBDOMAIN: z.string().optional(),
    GINGR_API_KEY: z.string().default('c84c09ecfacdf23a495505d2ae1df533'),
  },
  runtimeEnvStrict: {
    SERVICES_NODE_ENV: process.env.SERVICES_NODE_ENV,
    SERVICES_ALLOWED_ORIGINS: process.env.SERVICES_ALLOWED_ORIGINS,
    SERVICES_REDIS_URL: process.env.SERVICES_REDIS_URL,

    CUSTOMER_DATABASE_URL: process.env.CUSTOMER_DATABASE_URL,
    CUSTOMER_SERVICE_DISABLE_HTTPS_REDIRECT:
      process.env.CUSTOMER_SERVICE_DISABLE_HTTPS_REDIRECT,
    CUSTOMER_SERVICE_API_KEY: process.env.CUSTOMER_SERVICE_API_KEY,
    CUSTOMER_SUPER_ADMIN_API_KEY: process.env.CUSTOMER_SUPER_ADMIN_API_KEY,

    CUSTOMER_JWT_SECRET: process.env.CUSTOMER_JWT_SECRET,
    CUSTOMER_JWT_REFRESH_SECRET: process.env.CUSTOMER_JWT_REFRESH_SECRET,
    CUSTOMER_SUPER_ADMIN_JWT_SECRET: process.env.CUSTOMER_SUPER_ADMIN_JWT_SECRET,

    CUSTOMER_CACHE_TTL: process.env.CUSTOMER_CACHE_TTL,

    CUSTOMER_SENTRY_DSN: process.env.CUSTOMER_SENTRY_DSN,
    CUSTOMER_SENDGRID_API_KEY: process.env.CUSTOMER_SENDGRID_API_KEY,
    CUSTOMER_SENDGRID_FROM_EMAIL: process.env.CUSTOMER_SENDGRID_FROM_EMAIL,
    CUSTOMER_SENDGRID_FROM_NAME: process.env.CUSTOMER_SENDGRID_FROM_NAME,

    CUSTOMER_SERVICE_DATA_DIR: process.env.CUSTOMER_SERVICE_DATA_DIR,

    CUSTOMER_BUSINESS_NAME: process.env.CUSTOMER_BUSINESS_NAME,
    CUSTOMER_BUSINESS_PHONE: process.env.CUSTOMER_BUSINESS_PHONE,
    CUSTOMER_FRONTEND_URL: process.env.CUSTOMER_FRONTEND_URL,

    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY_SID: process.env.TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET: process.env.TWILIO_API_KEY_SECRET,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

    RESERVATION_SERVICE_HOST: process.env.RESERVATION_SERVICE_HOST,
    RESERVATION_SERVICE_PORT: process.env.RESERVATION_SERVICE_PORT,
    PAYMENT_SERVICE_PORT: process.env.PAYMENT_SERVICE_PORT,

    DEBUG_PRISMA: process.env.DEBUG_PRISMA,
    GINGR_SUBDOMAIN: process.env.GINGR_SUBDOMAIN,
    GINGR_API_KEY: process.env.GINGR_API_KEY,
  },
  clientPrefix: 'PUBLIC_',
  client: {},
  emptyStringAsUndefined: true,
  createFinalSchema: (shape) => z.object(shape),
});

export const env = {
  NODE_ENV: validatedEnv.SERVICES_NODE_ENV,
  ALLOWED_ORIGINS: validatedEnv.SERVICES_ALLOWED_ORIGINS,
  DATABASE_URL: validatedEnv.CUSTOMER_DATABASE_URL,
  DISABLE_HTTPS_REDIRECT: validatedEnv.CUSTOMER_SERVICE_DISABLE_HTTPS_REDIRECT,
  SERVICE_API_KEY: validatedEnv.CUSTOMER_SERVICE_API_KEY,
  SUPER_ADMIN_API_KEY: validatedEnv.CUSTOMER_SUPER_ADMIN_API_KEY,
  JWT_SECRET: validatedEnv.CUSTOMER_JWT_SECRET,
  JWT_REFRESH_SECRET: validatedEnv.CUSTOMER_JWT_REFRESH_SECRET,
  SUPER_ADMIN_JWT_SECRET: validatedEnv.CUSTOMER_SUPER_ADMIN_JWT_SECRET,
  REDIS_URL: validatedEnv.SERVICES_REDIS_URL,
  REDIS_ENABLED: true,
  REDIS_DEFAULT_TTL: validatedEnv.CUSTOMER_CACHE_TTL,
  SENTRY_DSN: validatedEnv.CUSTOMER_SENTRY_DSN,
  SENTRY_ENABLED: validatedEnv.SERVICES_NODE_ENV === 'production',
  SENTRY_RELEASE: 'customer-service@1.0.0',
  SENDGRID_API_KEY: validatedEnv.CUSTOMER_SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: validatedEnv.CUSTOMER_SENDGRID_FROM_EMAIL,
  SENDGRID_FROM_NAME: validatedEnv.CUSTOMER_SENDGRID_FROM_NAME,
  TWILIO_ACCOUNT_SID: validatedEnv.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: validatedEnv.TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY_SID: validatedEnv.TWILIO_API_KEY_SID,
  TWILIO_API_KEY_SECRET: validatedEnv.TWILIO_API_KEY_SECRET,
  TWILIO_PHONE_NUMBER: validatedEnv.TWILIO_PHONE_NUMBER,
  BUSINESS_NAME: validatedEnv.CUSTOMER_BUSINESS_NAME,
  BUSINESS_PHONE: validatedEnv.CUSTOMER_BUSINESS_PHONE,
  FRONTEND_URL: validatedEnv.CUSTOMER_FRONTEND_URL,
  RESERVATION_SERVICE_URL: `http://${validatedEnv.RESERVATION_SERVICE_HOST}:${validatedEnv.RESERVATION_SERVICE_PORT}`,
  PAYMENT_SERVICE_URL: `http://localhost:${validatedEnv.PAYMENT_SERVICE_PORT}`,
  DATA_DIR: validatedEnv.CUSTOMER_SERVICE_DATA_DIR,
  DEBUG_PRISMA: validatedEnv.DEBUG_PRISMA,
  GINGR_SUBDOMAIN: validatedEnv.GINGR_SUBDOMAIN,
  GINGR_API_KEY: validatedEnv.GINGR_API_KEY,
} as const;
