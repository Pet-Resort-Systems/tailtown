import { PrismaClient } from '@prisma/client';

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
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Store in global to prevent hot-reload issues in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown: disconnect on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
