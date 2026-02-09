import { Request, Response, NextFunction } from 'express';
import { RateLimitError, Logger } from './errorHandler';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * In-memory rate limiter implementation
 * In production, consider using Redis for distributed rate limiting
 */
export class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;
  private logger: Logger;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: Request) => req.ip || 'unknown',
      ...config
    };
    
    this.logger = Logger.getInstance();
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Rate limiter cleaned up ${cleanedCount} expired entries`);
    }
  }

  private getKey(req: Request): string {
    return this.config.keyGenerator!(req);
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getKey(req);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Initialize or get existing record
      if (!this.store[key] || this.store[key].resetTime <= now) {
        this.store[key] = {
          count: 0,
          resetTime: now + this.config.windowMs
        };
      }

      const record = this.store[key];

      // Check if limit exceeded
      if (record.count >= this.config.maxRequests) {
        const resetTimeSeconds = Math.ceil((record.resetTime - now) / 1000);
        
        this.logger.warn(`Rate limit exceeded for key: ${key}`, {
          currentCount: record.count,
          maxRequests: this.config.maxRequests,
          resetInSeconds: resetTimeSeconds,
          userAgent: req.get('User-Agent'),
          url: req.url
        });

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString(),
          'Retry-After': resetTimeSeconds.toString()
        });

        throw new RateLimitError(this.config.message);
      }

      // Increment counter
      record.count++;

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.config.maxRequests - record.count).toString(),
        'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString()
      });

      // Override res.end to handle skipSuccessfulRequests and skipFailedRequests
      const originalEnd = res.end.bind(res);
      const config = this.config;
      (res as any).end = function(chunk?: any, encoding?: any) {
        const shouldSkip =
          (res.statusCode < 400 && config.skipSuccessfulRequests) ||
          (res.statusCode >= 400 && config.skipFailedRequests);

        if (shouldSkip) {
          record.count--;
        }

        return originalEnd(chunk, encoding);
      };

      next();
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  public getStats(): { totalKeys: number; store: RateLimitStore } {
    return {
      totalKeys: Object.keys(this.store).length,
      store: { ...this.store }
    };
  }

  public reset(key?: string): void {
    if (key) {
      delete this.store[key];
      this.logger.info(`Rate limit reset for key: ${key}`);
    } else {
      this.store = {};
      this.logger.info('All rate limits reset');
    }
  }
}

/**
 * Predefined rate limiters for different endpoints
 */
export const createRateLimiters = () => {
  // General API rate limiter
  const generalLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later'
  });

  // Strict rate limiter for minting endpoints
  const mintingLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: 'Too many minting requests, please wait before trying again',
    skipFailedRequests: true // Don't count failed attempts against limit
  });

  // Authentication rate limiter
  const authLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts, please try again later'
  });

  // Portfolio/query rate limiter
  const queryLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many queries, please slow down',
    skipSuccessfulRequests: false
  });

  // Per-wallet rate limiter for minting
  const walletMintingLimiter = new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3,
    message: 'Too many minting requests from this wallet, please wait',
    keyGenerator: (req: Request) => {
      // Extract wallet address from request body or headers
      const walletAddress = req.body?.ownerAddress || 
                           req.body?.walletAddress || 
                           req.headers['x-wallet-address'] ||
                           req.ip;
      return `wallet:${walletAddress}`;
    }
  });

  return {
    general: generalLimiter.middleware(),
    minting: mintingLimiter.middleware(),
    auth: authLimiter.middleware(),
    query: queryLimiter.middleware(),
    walletMinting: walletMintingLimiter.middleware(),
    
    // Utility functions
    resetLimits: (type: string, key?: string) => {
      switch (type) {
        case 'general':
          generalLimiter.reset(key);
          break;
        case 'minting':
          mintingLimiter.reset(key);
          break;
        case 'auth':
          authLimiter.reset(key);
          break;
        case 'query':
          queryLimiter.reset(key);
          break;
        case 'walletMinting':
          walletMintingLimiter.reset(key);
          break;
      }
    },
    
    getStats: () => ({
      general: generalLimiter.getStats(),
      minting: mintingLimiter.getStats(),
      auth: authLimiter.getStats(),
      query: queryLimiter.getStats(),
      walletMinting: walletMintingLimiter.getStats()
    }),

    destroy: () => {
      generalLimiter.destroy();
      mintingLimiter.destroy();
      authLimiter.destroy();
      queryLimiter.destroy();
      walletMintingLimiter.destroy();
    }
  };
};

export default RateLimiter;