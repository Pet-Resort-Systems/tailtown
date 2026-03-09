/**
 * System Health Controller
 * 
 * Provides detailed system health metrics for monitoring and observability.
 * Used by super admin dashboard for real-time system status.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import os from 'os';

const prisma = new PrismaClient();

// Track service start time for uptime calculation
const SERVICE_START_TIME = Date.now();

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    customer: ServiceHealth;
    reservation: ServiceHealth;
    database: DatabaseHealth;
    cache: CacheHealth;
  };
  system: SystemHealth;
  metrics: PerformanceMetrics;
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  uptime: number;
  lastCheck: string;
}

interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'degraded';
  activeConnections?: number;
  responseTime?: number;
}

interface CacheHealth {
  status: 'connected' | 'disconnected' | 'not_configured';
  hitRate?: number;
  memoryUsage?: string;
}

interface SystemHealth {
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  uptime: number;
  platform: string;
}

interface PerformanceMetrics {
  activeTenants: number;
  totalRequests?: number;
  averageResponseTime?: number;
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;

    // Get active connection count (PostgreSQL specific)
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    const activeConnections = Number(result[0]?.count || 0);

    return {
      status: responseTime < 100 ? 'connected' : 'degraded',
      activeConnections,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'disconnected',
    };
  }
}

/**
 * Check Redis cache health
 */
async function checkCacheHealth(): Promise<CacheHealth> {
  try {
    // Try to import Redis client
    const { redisClient, isRedisConnected } = await import('../../utils/redis');

    if (!redisClient || !isRedisConnected()) {
      return { status: 'not_configured' };
    }

    // Test Redis connection
    await redisClient.ping();
    
    // Get cache stats if available
    const info = await redisClient.info('stats');
    const hitRate = parseCacheHitRate(info);

    return {
      status: 'connected',
      hitRate,
      memoryUsage: 'N/A', // Can be enhanced with Redis memory info
    };
  } catch (error) {
    return {
      status: 'not_configured',
    };
  }
}

/**
 * Parse cache hit rate from Redis info
 */
function parseCacheHitRate(info: string): number {
  try {
    const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
    const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  } catch {
    return 0;
  }
}

/**
 * Check reservation service health
 */
async function checkReservationService(): Promise<ServiceHealth> {
  try {
    const reservationUrl = process.env.RESERVATION_SERVICE_URL || 'http://localhost:4003';
    const start = Date.now();
    
    const response = await fetch(`${reservationUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    const responseTime = Date.now() - start;
    
    return {
      status: response.ok ? 'up' : 'degraded',
      responseTime,
      uptime: SERVICE_START_TIME,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      uptime: 0,
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Get system health metrics
 */
function collectSystemHealth(): SystemHealth {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercentage = Math.round((usedMem / totalMem) * 100);

  // Get CPU usage (simplified - average of all CPUs)
  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;

  const uptime = Date.now() - SERVICE_START_TIME;

  return {
    memory: {
      used: formatBytes(usedMem),
      total: formatBytes(totalMem),
      percentage: memPercentage,
    },
    cpu: {
      usage: Math.round(cpuUsage),
      cores: cpus.length,
    },
    uptime: Math.floor(uptime / 1000), // Convert to seconds
    platform: os.platform(),
  };
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  try {
    // Count active tenants
    const activeTenants = await prisma.tenant.count({
      where: {
        status: 'ACTIVE',
      },
    });

    return {
      activeTenants,
      // These can be enhanced with actual request tracking
      totalRequests: undefined,
      averageResponseTime: undefined,
    };
  } catch (error) {
    return {
      activeTenants: 0,
    };
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Determine overall system status
 */
function determineOverallStatus(
  database: DatabaseHealth,
  cache: CacheHealth,
  reservation: ServiceHealth
): 'healthy' | 'degraded' | 'unhealthy' {
  // Critical: Database must be connected
  if (database.status === 'disconnected') {
    return 'unhealthy';
  }

  // Degraded: Any service is down or degraded
  if (
    database.status === 'degraded' ||
    reservation.status === 'down' ||
    reservation.status === 'degraded'
  ) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * GET /api/system/health
 * 
 * Returns comprehensive system health metrics
 */
export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check all services in parallel
    const [database, cache, reservation, system, metrics] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
      checkReservationService(),
      Promise.resolve(collectSystemHealth()),
      getPerformanceMetrics(),
    ]);

    const customerService: ServiceHealth = {
      status: 'up',
      responseTime: 0,
      uptime: Math.floor((Date.now() - SERVICE_START_TIME) / 1000),
      lastCheck: new Date().toISOString(),
    };

    const overallStatus = determineOverallStatus(database, cache, reservation);

    const healthMetrics: HealthMetrics = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        customer: customerService,
        reservation,
        database,
        cache,
      },
      system,
      metrics,
    };

    res.status(200).json(healthMetrics);
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to retrieve system health',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * GET /api/system/health/simple
 * 
 * Returns simple health check (for load balancers)
 */
export const getSimpleHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'up',
      service: 'customer-service',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'down',
      service: 'customer-service',
      timestamp: new Date().toISOString(),
    });
  }
};
