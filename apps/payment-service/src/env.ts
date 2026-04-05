import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createEnv } from '@t3-oss/env-core';
import {
  stringToNumberSchema,
  transformedBooleanSchema,
} from '@tailtown/shared';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

const envDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(envDir, '../../..', '.env');

dotenvConfig({ path: rootEnvPath });

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ALLOWED_ORIGINS: z
      .string()
      .transform((value) => value.split(','))
      .pipe(z.array(z.url()))
      .default(['http://localhost:3000']),
    RATE_LIMIT_WINDOW_MS: stringToNumberSchema.default(900000),
    RATE_LIMIT_MAX_REQUESTS: stringToNumberSchema.default(100),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    PORT: stringToNumberSchema.default(4005),

    CARDCONNECT_API_URL: z
      .url()
      .default('https://fts-uat.cardconnect.com/cardconnect/rest'),
    CARDCONNECT_USERNAME: z.string().min(1).default('testing'),
    CARDCONNECT_PASSWORD: z.string().min(1).default('testing123'),
    CARDCONNECT_MERCHANT_ID: z.string().min(1).default('496160873888'),
    CARDCONNECT_SITE: z.string().min(1).default('fts-uat'),
    CARDCONNECT_REQUEST_TIMEOUT_MS: stringToNumberSchema.default(30000),
    CARDCONNECT_CAPTURE_DEFAULT: transformedBooleanSchema.default(true),
  },

  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PORT: process.env.PORT,
    CARDCONNECT_API_URL: process.env.CARDCONNECT_API_URL,
    CARDCONNECT_USERNAME: process.env.CARDCONNECT_USERNAME,
    CARDCONNECT_PASSWORD: process.env.CARDCONNECT_PASSWORD,
    CARDCONNECT_MERCHANT_ID: process.env.CARDCONNECT_MERCHANT_ID,
    CARDCONNECT_SITE: process.env.CARDCONNECT_SITE,
    CARDCONNECT_REQUEST_TIMEOUT_MS: process.env.CARDCONNECT_REQUEST_TIMEOUT_MS,
    CARDCONNECT_CAPTURE_DEFAULT: process.env.CARDCONNECT_CAPTURE_DEFAULT,
  },

  clientPrefix: 'PUBLIC_',
  client: {},
  emptyStringAsUndefined: true,
  createFinalSchema: (shape) => z.object(shape),
});
