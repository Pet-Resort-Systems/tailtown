import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../env.js';
/**
 * Prisma Client with Connection Pooling
 *
 * Connection pooling configuration:
 * - Reuses database connections instead of creating new ones
 * - Improves performance under load
 * - Prevents connection exhaustion
 * - Singleton pattern ensures one client instance
 */

// Global singleton to prevent multiple Prisma instances in development
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString: env.CUSTOMER_DATABASE_URL });
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Store in global to prevent hot-reload issues in development
if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown: disconnect on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
