/**
 * Redis Cache Client
 * 
 * Provides caching functionality to reduce database load and improve performance.
 * 
 * Usage:
 * - Cache frequently accessed data (products, services, etc.)
 * - Set TTL (time-to-live) for automatic expiration
 * - Invalidate cache when data changes
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'; // Enabled by default
const DEFAULT_TTL = parseInt(process.env.REDIS_DEFAULT_TTL || '300', 10); // 5 minutes

// Redis client instance
let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Initialize Redis client
 */
export async function initRedis(): Promise<void> {
  if (!REDIS_ENABLED) {
    logger.info('Redis caching is disabled');
    return;
  }

  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached', { retries });
            return new Error('Max reconnection attempts reached');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // Error handling
    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connecting');
    });

    redisClient.on('ready', () => {
      logger.info('Redis connected and ready');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting');
      isConnected = false;
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection closed');
      isConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();
  } catch (error: any) {
    logger.error('Failed to initialize Redis', { error: error.message });
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Get value from cache
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!REDIS_ENABLED || !redisClient || !isConnected) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (!value || typeof value !== 'string') {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error: any) {
    logger.error('Redis GET error', { key, error: error.message });
    return null;
  }
}

/**
 * Set value in cache
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds (default: 300s = 5min)
 */
export async function setCache(
  key: string,
  value: any,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  if (!REDIS_ENABLED || !redisClient || !isConnected) {
    return;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error: any) {
    logger.error('Redis SET error', { key, error: error.message });
  }
}

/**
 * Delete value from cache
 * @param key - Cache key or pattern
 */
export async function deleteCache(key: string): Promise<void> {
  if (!REDIS_ENABLED || !redisClient || !isConnected) {
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error: any) {
    logger.error('Redis DEL error', { key, error: error.message });
  }
}

/**
 * Delete multiple keys matching a pattern
 * @param pattern - Key pattern (e.g., "products:*")
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!REDIS_ENABLED || !redisClient || !isConnected) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error: any) {
    logger.error('Redis DEL pattern error', { pattern, error: error.message });
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return REDIS_ENABLED && isConnected;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && isConnected) {
    await redisClient.quit();
    logger.info('Redis connection closed gracefully');
  }
}

/**
 * Generate cache key for tenant-specific data
 * @param tenantId - Tenant ID
 * @param resource - Resource type (e.g., "products", "customers")
 * @param id - Optional resource ID
 */
export function getCacheKey(tenantId: string, resource: string, id?: string): string {
  if (id) {
    return `${tenantId}:${resource}:${id}`;
  }
  return `${tenantId}:${resource}`;
}

// Export Redis client for advanced usage
export { redisClient };
