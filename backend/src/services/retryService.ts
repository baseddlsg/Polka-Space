import { Logger } from './errorHandler';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalDuration: number;
}

/**
 * Retry service with exponential backoff for blockchain operations
 */
export class RetryService {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Executing ${operationName} - attempt ${attempt}/${config.maxAttempts}`);
        
        const result = await operation();
        
        const duration = Date.now() - startTime;
        this.logger.info(`${operationName} succeeded on attempt ${attempt}`, {
          attempts: attempt,
          duration: `${duration}ms`
        });

        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: duration
        };

      } catch (error) {
        lastError = error;
        
        this.logger.warn(`${operationName} failed on attempt ${attempt}`, {
          error: error.message,
          attempt,
          maxAttempts: config.maxAttempts
        });

        // Check if we should retry this error
        if (config.retryCondition && !config.retryCondition(error)) {
          this.logger.info(`${operationName} - retry condition not met, stopping retries`);
          break;
        }

        // Don't wait after the last attempt
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          
          this.logger.debug(`${operationName} - waiting ${delay}ms before retry`);
          
          // Call onRetry callback if provided
          if (config.onRetry) {
            config.onRetry(attempt, error);
          }
          
          await this.sleep(delay);
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.error(`${operationName} failed after ${config.maxAttempts} attempts`, lastError, {
      totalDuration: `${totalDuration}ms`
    });

    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDuration
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * cappedDelay;
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry configuration for blockchain operations
   */
  static createBlockchainRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffMultiplier: 2,
      retryCondition: (error: any) => {
        // Retry on network errors, timeouts, and temporary blockchain issues
        const retryableErrors = [
          'network',
          'timeout',
          'connection',
          'temporary',
          'rate limit',
          'busy',
          'unavailable'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        return retryableErrors.some(keyword => errorMessage.includes(keyword));
      },
      onRetry: (attempt: number, error: any) => {
        Logger.getInstance().info(`Blockchain operation retry ${attempt}`, {
          error: error.message,
          type: error.constructor.name
        });
      }
    };
  }

  /**
   * Create a retry configuration for IPFS operations
   */
  static createIPFSRetryConfig(): RetryConfig {
    return {
      maxAttempts: 5,
      baseDelay: 500, // 0.5 seconds
      maxDelay: 5000, // 5 seconds
      backoffMultiplier: 1.5,
      retryCondition: (error: any) => {
        const errorMessage = error.message?.toLowerCase() || '';
        return errorMessage.includes('network') || 
               errorMessage.includes('timeout') ||
               errorMessage.includes('connection') ||
               error.code === 'ECONNRESET' ||
               error.code === 'ETIMEDOUT';
      }
    };
  }

  /**
   * Create a retry configuration for external API calls
   */
  static createAPIRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      retryCondition: (error: any) => {
        // Retry on 5xx errors and network issues
        if (error.response) {
          const status = error.response.status;
          return status >= 500 || status === 429; // Server errors or rate limiting
        }
        
        // Retry on network errors
        return error.code === 'ECONNRESET' || 
               error.code === 'ETIMEDOUT' ||
               error.code === 'ENOTFOUND';
      }
    };
  }
}

/**
 * Utility functions for common retry patterns
 */
export const retryUtils = {
  /**
   * Retry a blockchain transaction with standard config
   */
  async retryBlockchainOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'blockchain operation'
  ): Promise<T> {
    const retryService = new RetryService();
    const config = RetryService.createBlockchainRetryConfig();
    
    const result = await retryService.executeWithRetry(operation, config, operationName);
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.result!;
  },

  /**
   * Retry an IPFS operation with standard config
   */
  async retryIPFSOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'IPFS operation'
  ): Promise<T> {
    const retryService = new RetryService();
    const config = RetryService.createIPFSRetryConfig();
    
    const result = await retryService.executeWithRetry(operation, config, operationName);
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.result!;
  },

  /**
   * Retry an API call with standard config
   */
  async retryAPICall<T>(
    operation: () => Promise<T>,
    operationName: string = 'API call'
  ): Promise<T> {
    const retryService = new RetryService();
    const config = RetryService.createAPIRetryConfig();
    
    const result = await retryService.executeWithRetry(operation, config, operationName);
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.result!;
  }
};

export default RetryService;