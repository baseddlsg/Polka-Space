/**
 * Frontend caching service for NFT data and 3D models
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 1000;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.maxSize = options.maxSize || this.maxSize;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
      
      // If still full, remove oldest entry
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2;
      size += 24; // Overhead for entry object
    }
    return size;
  }
}

// Create cache instances for different data types
export const nftCache = new CacheService({
  ttl: 10 * 60 * 1000, // 10 minutes for NFT data
  maxSize: 500
});

export const portfolioCache = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes for portfolio data
  maxSize: 100
});

export const communityCache = new CacheService({
  ttl: 2 * 60 * 1000, // 2 minutes for community feed
  maxSize: 50
});

export const modelCache = new CacheService({
  ttl: 30 * 60 * 1000, // 30 minutes for 3D models
  maxSize: 200
});

/**
 * Cache key generators
 */
export const cacheKeys = {
  nft: (collectionId: number, itemId: n
umber) => `nft:${collectionId}:${itemId}`,
  portfolio: (address: string) => `portfolio:${address}`,
  communityFeed: (limit: number, offset: number) => `community:${limit}:${offset}`,
  transaction: (txId: string) => `transaction:${txId}`,
  model: (url: string) => `model:${url}`,
  metadata: (url: string) => `metadata:${url}`
};

/**
 * Cached fetch wrapper
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cache: CacheService = nftCache,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  cache.set(key, data, ttl);
  
  return data;
}

/**
 * Preload and cache 3D models
 */
export async function preloadModel(url: string): Promise<void> {
  const key = cacheKeys.model(url);
  
  if (modelCache.has(key)) {
    return; // Already cached
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.status}`);
    }
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    modelCache.set(key, objectUrl, 30 * 60 * 1000); // 30 minutes
  } catch (error) {
    console.error('Failed to preload model:', url, error);
  }
}

/**
 * Get cached model URL or original URL
 */
export function getCachedModelUrl(url: string): string {
  const key = cacheKeys.model(url);
  const cached = modelCache.get<string>(key);
  return cached || url;
}

/**
 * Cleanup expired cache entries periodically
 */
setInterval(() => {
  nftCache.cleanup();
  portfolioCache.cleanup();
  communityCache.cleanup();
  modelCache.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes

export default CacheService;