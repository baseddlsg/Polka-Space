import Redis from 'ioredis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

/**
 * Redis-based caching service for backend
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes
  private keyPrefix: string = 'nft:';

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.keyPrefix = options.prefix || this.keyPrefix;

    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Set cache entry
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.getKey(key);
      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;

      await this.redis.setex(cacheKey, expiration, serializedValue);
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getKey(key);
      const value = await this.redis.get(cacheKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key);
      const exists = await this.redis.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key);
      const result = await this.redis.del(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple cache entries by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const searchPattern = this.getKey(pattern);
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Set cache entry with expiration time
   */
  async setWithExpiry(key: string, value: any, expiryTime: Date): Promise<void> {
    try {
      const cacheKey = this.getKey(key);
      const serializedValue = JSON.stringify(value);
      const ttl = Math.max(0, Math.floor((expiryTime.getTime() - Date.now()) / 1000));

      if (ttl > 0) {
        await this.redis.setex(cacheKey, ttl, serializedValue);
      }
    } catch (error) {
      console.error('Cache set with expiry error:', error);
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const cacheKey = this.getKey(key);
      return await this.redis.incrby(cacheKey, amount);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage: string;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      return {
        connected: this.redis.status === 'ready',
        keyCount,
        memoryUsage: this.extractMemoryUsage(info)
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        connected: false,
        keyCount: 0,
        memoryUsage: 'unknown'
      };
    }
  }

  /**
   * Extract memory usage from Redis info
   */
  private extractMemoryUsage(info: string): string {
    const match = info.match(/used_memory_human:(.+)/);
    return match ? match[1].trim() : 'unknown';
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Cache key generators
export const cacheKeys = {
  nft: (collectionId: number, itemId: number) => `nft:${collectionId}:${itemId}`,
  portfolio: (address: string) => `portfolio:${address}`,
  communityFeed: (limit: number, offset: number) => `community:${limit}:${offset}`,
  transaction: (txId: string) => `transaction:${txId}`,
  metadata: (url: string) => `metadata:${Buffer.from(url).toString('base64')}`,
  userNFTs: (address: string) => `user_nfts:${address}`,
  recentMints: () => 'recent_mints',
  totalNFTs: () => 'total_nfts'
};

// Create cache instances
export const nftCache = new CacheService({
  ttl: 600, // 10 minutes
  prefix: 'nft:'
});

export const portfolioCache = new CacheService({
  ttl: 300, // 5 minutes
  prefix: 'portfolio:'
});

export const communityCache = new CacheService({
  ttl: 120, // 2 minutes
  prefix: 'community:'
});

/**
 * Cached function wrapper
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cache: CacheService = nftCache,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  await cache.set(key, data, ttl);
  
  return data;
}

export default CacheService;