import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

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
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Store in global to prevent hot-reload issues in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown: disconnect on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
