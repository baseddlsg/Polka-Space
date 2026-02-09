import { Request, Response, NextFunction } from 'express';

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly timestamp: number;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = Date.now();

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION_ERROR, 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorType.AUTHENTICATION_ERROR, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorType.AUTHORIZATION_ERROR, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, ErrorType.NOT_FOUND_ERROR, 404);
  }
}

export class BlockchainError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.BLOCKCHAIN_ERROR, 502, true, details);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.NETWORK_ERROR, 503, true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, ErrorType.RATE_LIMIT_ERROR, 429);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, ErrorType.EXTERNAL_SERVICE_ERROR, 502, true, details);
  }
}

/**
 * Logger service for structured logging
 */
export class Logger {
  private static instance: Logger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  private constructor() {
    this.logLevel = (process.env.LOG_LEVEL as any) || 'info';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseLog = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (meta) {
      return `${baseLog} | Meta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return baseLog;
  }

  public debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  public info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  public error(message: string, error?: Error | any, meta?: any): void {
    if (this.shouldLog('error')) {
      const errorMeta = {
        ...meta,
        ...(error && {
          error: {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name,
            ...(error instanceof AppError && {
              errorType: error.type,
              statusCode: error.statusCode,
              isOperational: error.isOperational,
              details: error.details
            })
          }
        })
      };
      
      console.error(this.formatMessage('error', message, errorMeta));
    }
  }

  public logRequest(req: Request, res: Response, duration: number): void {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    if (res.statusCode >= 400) {
      this.warn(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, meta);
    } else {
      this.info(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, meta);
    }
  }
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const logger = Logger.getInstance();

  // Log request start
  logger.debug(`Incoming request: ${req.method} ${req.url}`, {
    headers: req.headers,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Override res.end to log when response is sent
  const originalEnd = res.end.bind(res);
  (res as any).end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
    return originalEnd(chunk, encoding);
  };

  next();
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = Logger.getInstance();

  // Log the error
  logger.error('Unhandled error occurred', error, {
    url: req.url,
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // Handle known application errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        type: error.type,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.details,
          stack: error.stack
        })
      },
      timestamp: error.timestamp
    });
    return;
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack
        })
      },
      timestamp: Date.now()
    });
    return;
  }

  if (error.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Invalid data format',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          stack: error.stack
        })
      },
      timestamp: Date.now()
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      type: ErrorType.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    },
    timestamp: Date.now()
  });
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const logger = Logger.getInstance();
  
  logger.warn(`404 - Route not found: ${req.method} ${req.url}`, {
    headers: req.headers,
    query: req.query
  });

  res.status(404).json({
    success: false,
    error: {
      type: ErrorType.NOT_FOUND_ERROR,
      message: `Route ${req.method} ${req.url} not found`,
    },
    timestamp: Date.now()
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Process error handler for uncaught exceptions
 */
export const setupProcessErrorHandlers = (): void => {
  const logger = Logger.getInstance();

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception - shutting down gracefully', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection - shutting down gracefully', reason, {
      promise: promise.toString()
    });
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received - shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received - shutting down gracefully');
    process.exit(0);
  });
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BlockchainError,
  NetworkError,
  RateLimitError,
  ExternalServiceError,
  Logger,
  requestLogger,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupProcessErrorHandlers
};