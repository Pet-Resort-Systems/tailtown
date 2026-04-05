import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createEnv } from '@t3-oss/env-core';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

import {
  millisecondSchema,
  stringToNumberSchema,
  transformedBooleanSchema,
} from '@tailtown/shared';

const envDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(envDir, '../../..', '.env');

dotenvConfig({ path: rootEnvPath });

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    ALLOWED_ORIGINS: z
      .string()
      .transform((s) => s.split(','))
      .pipe(z.array(z.url())),
    RATE_LIMIT_WINDOW_MS: stringToNumberSchema,
    RATE_LIMIT_MAX_REQUESTS: stringToNumberSchema,
    DATABASE_SSL_ENABLED: transformedBooleanSchema,
    DATABASE_MAX_CONNECTIONS: stringToNumberSchema,
    DATABASE_IDLE_TIMEOUT: stringToNumberSchema,
    REDIS_URL: z.url(),
    PASSWORD_SALT_ROUNDS: stringToNumberSchema,
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),

    RESERVATION_SERVICE_PORT: stringToNumberSchema,
    RESERVATION_SERVICE_HOST: z.string().min(1),
    RESERVATION_SERVICE_TRUST_PROXY: transformedBooleanSchema,
    RESERVATION_DATABASE_URL: z.url(),
    RESERVATION_JWT_SECRET: z.string().min(1),
    RESERVATION_JWT_EXPIRES_IN: millisecondSchema,
    RESERVATION_JWT_REFRESH_TOKEN_EXPIRES_IN: millisecondSchema,
    RESERVATION_SESSION_SECRET: z.string().min(1),
    RESERVATION_SERVICE_TIMEOUT: stringToNumberSchema.default(5000),
    RESERVATION_SERVICE_MAX_RETRIES: stringToNumberSchema.default(3),
    RESERVATION_SERVICE_RETRY_DELAY_MS: stringToNumberSchema.default(1000),
    RESERVATION_REDIS_ENABLED: transformedBooleanSchema,
    RESERVATION_REDIS_DEFAULT_TTL: stringToNumberSchema,
    RESERVATION_LOG_FILE: z.string().min(1),
    RESERVATION_DISABLE_ERROR_TRACKING: transformedBooleanSchema,
    RESERVATION_DISABLE_ERROR_PERSISTENCE: transformedBooleanSchema,

    CUSTOMER_SERVICE_URL: z.url().default('http://localhost:4004'),
  },

  /**
   * Strict runtime environment variables validation
   */
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    DATABASE_SSL_ENABLED: process.env.DATABASE_SSL_ENABLED,
    DATABASE_MAX_CONNECTIONS: process.env.DATABASE_MAX_CONNECTIONS,
    DATABASE_IDLE_TIMEOUT: process.env.DATABASE_IDLE_TIMEOUT,
    REDIS_URL: process.env.REDIS_URL,
    PASSWORD_SALT_ROUNDS: process.env.PASSWORD_SALT_ROUNDS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    RESERVATION_SERVICE_PORT: process.env.RESERVATION_SERVICE_PORT,
    RESERVATION_SERVICE_HOST: process.env.RESERVATION_SERVICE_HOST,
    RESERVATION_SERVICE_TRUST_PROXY:
      process.env.RESERVATION_SERVICE_TRUST_PROXY,
    RESERVATION_DATABASE_URL: process.env.RESERVATION_DATABASE_URL,
    RESERVATION_JWT_SECRET: process.env.RESERVATION_JWT_SECRET,
    RESERVATION_JWT_EXPIRES_IN: process.env.RESERVATION_JWT_EXPIRES_IN,
    RESERVATION_JWT_REFRESH_TOKEN_EXPIRES_IN:
      process.env.RESERVATION_JWT_REFRESH_TOKEN_EXPIRES_IN,
    RESERVATION_SESSION_SECRET: process.env.RESERVATION_SESSION_SECRET,
    RESERVATION_SERVICE_TIMEOUT: process.env.RESERVATION_SERVICE_TIMEOUT,
    RESERVATION_SERVICE_MAX_RETRIES:
      process.env.RESERVATION_SERVICE_MAX_RETRIES,
    RESERVATION_SERVICE_RETRY_DELAY_MS:
      process.env.RESERVATION_SERVICE_RETRY_DELAY_MS,
    RESERVATION_REDIS_ENABLED: process.env.RESERVATION_REDIS_ENABLED,
    RESERVATION_REDIS_DEFAULT_TTL: process.env.RESERVATION_REDIS_DEFAULT_TTL,
    RESERVATION_LOG_FILE: process.env.RESERVATION_LOG_FILE,
    RESERVATION_DISABLE_ERROR_TRACKING:
      process.env.RESERVATION_DISABLE_ERROR_TRACKING,
    RESERVATION_DISABLE_ERROR_PERSISTENCE:
      process.env.RESERVATION_DISABLE_ERROR_PERSISTENCE,
    CUSTOMER_SERVICE_URL: process.env.CUSTOMER_SERVICE_URL,
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'PUBLIC_',

  client: {},

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,

  /**
   * Make final object shape with required keys
   */
  createFinalSchema: (shape) => z.object(shape),
});
