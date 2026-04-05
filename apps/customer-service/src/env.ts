import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createEnv } from '@t3-oss/env-core';
import { stringToNumberSchema, transformedBooleanSchema } from '@tailtown/shared';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

const envDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(envDir, '../../..', '.env');

dotenvConfig({ path: rootEnvPath });

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    ALLOWED_ORIGINS: z.string().optional(),
    DATABASE_URL: z.string().min(1),

    DISABLE_HTTPS_REDIRECT: transformedBooleanSchema.default(false),
    SERVICE_API_KEY: z.string().optional(),
    SUPER_ADMIN_API_KEY: z.string().optional(),

    JWT_SECRET: z.string().min(1).default('your-secret-key-change-in-production'),
    JWT_REFRESH_SECRET: z.string().min(1).default('your-refresh-secret-key-change-in-production'),
    SUPER_ADMIN_JWT_SECRET: z.string().min(1).default('super-admin-secret-key-change-in-production'),

    REDIS_URL: z.string().default('redis://localhost:6379'),
    REDIS_ENABLED: transformedBooleanSchema.default(true),
    REDIS_DEFAULT_TTL: stringToNumberSchema.default(300),

    SENTRY_DSN: z.string().optional(),
    SENTRY_ENABLED: transformedBooleanSchema.default(true),
    SENTRY_RELEASE: z.string().default('customer-service@1.0.0'),

    SENDGRID_API_KEY: z.string().optional(),
    SENDGRID_FROM_EMAIL: z.string().default('noreply@tailtown.com'),
    SENDGRID_FROM_NAME: z.string().default('Tailtown Pet Resort'),

    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_API_KEY_SID: z.string().optional(),
    TWILIO_API_KEY_SECRET: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),

    BUSINESS_NAME: z.string().default('Tailtown Pet Resort'),
    BUSINESS_PHONE: z.string().optional(),
    FRONTEND_URL: z.string().default('https://tailtown.canicloud.com'),

    RESERVATION_SERVICE_URL: z.string().url().default('http://localhost:4003'),
    PAYMENT_SERVICE_URL: z.string().url().default('http://localhost:4005'),

    DATA_DIR: z.string().optional(),
    DEBUG_PRISMA: transformedBooleanSchema.default(false),
    GINGR_SUBDOMAIN: z.string().optional(),
    GINGR_API_KEY: z.string().default('c84c09ecfacdf23a495505d2ae1df533'),
  },
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    DATABASE_URL: process.env.DATABASE_URL,
    DISABLE_HTTPS_REDIRECT: process.env.DISABLE_HTTPS_REDIRECT,
    SERVICE_API_KEY: process.env.SERVICE_API_KEY,
    SUPER_ADMIN_API_KEY: process.env.SUPER_ADMIN_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    SUPER_ADMIN_JWT_SECRET: process.env.SUPER_ADMIN_JWT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_ENABLED: process.env.REDIS_ENABLED,
    REDIS_DEFAULT_TTL: process.env.REDIS_DEFAULT_TTL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENABLED: process.env.SENTRY_ENABLED,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY_SID: process.env.TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET: process.env.TWILIO_API_KEY_SECRET,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    BUSINESS_NAME: process.env.BUSINESS_NAME,
    BUSINESS_PHONE: process.env.BUSINESS_PHONE,
    FRONTEND_URL: process.env.FRONTEND_URL,
    RESERVATION_SERVICE_URL: process.env.RESERVATION_SERVICE_URL,
    PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL,
    DATA_DIR: process.env.DATA_DIR,
    DEBUG_PRISMA: process.env.DEBUG_PRISMA,
    GINGR_SUBDOMAIN: process.env.GINGR_SUBDOMAIN,
    GINGR_API_KEY: process.env.GINGR_API_KEY,
  },
  clientPrefix: 'PUBLIC_',
  client: {},
  emptyStringAsUndefined: true,
  createFinalSchema: (shape) => z.object(shape),
});
