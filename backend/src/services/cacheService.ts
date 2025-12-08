import IORedis from 'ioredis';
import { logger } from '../lib/logger';

/**
 * Redis Cache Service
 * Provides caching functionality for API responses to improve performance
 */
class CacheService {
  private redis: IORedis;
  private defaultTTL: number = 300; // 5 minutes

  constructor() {
    this.redis = new IORedis(
      process.env.REDIS_URL || 'redis://localhost:6379',
      {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      }
    );

    this.redis.on('error', (err) => {
      logger.error('[Cache] Redis connection error:', err.message);
    });

    this.redis.on('connect', () => {
      logger.info('[Cache] Redis connected successfully');
    });
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('[Cache] Get error:', error);
      return null;
    }
  }

  /**
   * Set cache value with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      
      await this.redis.setex(key, expiry, serialized);
    } catch (error) {
      logger.error('[Cache] Set error:', error);
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('[Cache] Delete error:', error);
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('[Cache] Delete pattern error:', error);
    }
  }

  /**
   * Invalidate cache for a workflow
   */
  async invalidateWorkflow(workflowId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`workflow:${workflowId}:*`),
      this.delPattern(`workflows:*`), // Invalidate list caches
      this.delPattern(`collaborators:${workflowId}:*`),
      this.delPattern(`comments:${workflowId}:*`),
      this.delPattern(`activity:${workflowId}:*`),
    ]);
  }

  /**
   * Invalidate cache for a user's notifications
   */
  async invalidateUserNotifications(userId: string): Promise<void> {
    await this.delPattern(`notifications:${userId}:*`);
  }

  /**
   * Invalidate cache for an organization
   */
  async invalidateOrganization(organizationId: string): Promise<void> {
    await this.delPattern(`org:${organizationId}:*`);
  }

  /**
   * Cache wrapper function
   */
  async wrap<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    await this.set(key, data, ttl);

    return data;
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.redis.status === 'ready';
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const cacheService = new CacheService();
