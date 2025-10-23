// Error tracking and alerting system

export interface ErrorReport {
  id: string;
  type: 'javascript' | 'network' | 'blockchain' | 'validation' | 'rendering';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: {
    url: string;
    userAgent: string;
    timestamp: number;
    userId?: string;
    sessionId: string;
    component?: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ErrorAlert {
  id: string;
  errorId: string;
  type: 'threshold' | 'new_error' | 'spike';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private errors: Map<string, ErrorReport> = new Map();
  private alerts: ErrorAlert[] = [];
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean = true;
  private thresholds = {
    errorRate: 0.05, // 5% error rate
    spikeMultiplier: 3, // 3x normal rate
    criticalErrorCount: 10,
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `error_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  // Error reporting
  reportError(
    error: Error | string,
    type: ErrorReport['type'] = 'javascript',
    severity: ErrorReport['severity'] = 'medium',
    context?: {
      component?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ): string {
    if (!this.isEnabled) return '';

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    
    const fingerprint = this.generateFingerprint(errorMessage, errorStack, type);
    const errorId = fingerprint;

    const existingError = this.errors.get(errorId);
    const now = Date.now();

    if (existingError) {
      // Update existing error
      existingError.count++;
      existingError.lastSeen = now;
      
      // Check for error spikes
      this.checkErrorSpike(existingError);
    } else {
      // Create new error report
      const newError: ErrorReport = {
        id: errorId,
        type,
        severity,
        message: errorMessage,
        stack: errorStack,
        context: {
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          timestamp: now,
          userId: this.userId,
          sessionId: this.sessionId,
          component: context?.component,
          action: context?.action,
          metadata: context?.metadata,
        },
        fingerprint,
        count: 1,
        firstSeen: now,
        lastSeen: now,
      };

      this.errors.set(errorId, newError);
      
      // Alert for new critical errors
      if (severity === 'critical') {
        this.createAlert('new_error', errorId, 'New critical error detected', {
          message: errorMessage,
          component: context?.component,
        });
      }
    }

    // Check error rate thresholds
    this.checkErrorRateThreshold();

    // Send to backend
    this.sendErrorReport(this.errors.get(errorId)!);

    return errorId;
  }

  // Specific error types
  reportJavaScriptError(error: Error, component?: string, action?: string): string {
    return this.reportError(error, 'javascript', 'high', { component, action });
  }

  reportNetworkError(url: string, status: number, message: string): string {
    return this.reportError(
      `Network error: ${status} ${message}`,
      'network',
      status >= 500 ? 'high' : 'medium',
      { metadata: { url, status } }
    );
  }

  reportBlockchainError(operation: string, error: Error): string {
    return this.reportError(
      error,
      'blockchain',
      'high',
      { action: operation, metadata: { operation } }
    );
  }

  reportValidationError(field: string, message: string): string {
    return this.reportError(
      `Validation error: ${field} - ${message}`,
      'validation',
      'low',
      { metadata: { field } }
    );
  }

  reportRenderingError(component: string, error: Error): string {
    return this.reportError(
      error,
      'rendering',
      'medium',
      { component, metadata: { component } }
    );
  }

  // Error analysis
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorRate: number;
    topErrors: ErrorReport[];
  } {
    const errors = Array.from(this.errors.values());
    const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);
    
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    
    errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + error.count;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + error.count;
    });

    // Calculate error rate (errors per session/user action)
    const sessionDuration = Date.now() - (errors[0]?.firstSeen || Date.now());
    const errorRate = sessionDuration > 0 ? totalErrors / (sessionDuration / 60000) : 0; // errors per minute

    // Top errors by count
    const topErrors = errors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      errorRate,
      topErrors,
    };
  }

  getErrorById(errorId: string): ErrorReport | undefined {
    return this.errors.get(errorId);
  }

  getRecentErrors(limit: number = 50): ErrorReport[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, limit);
  }

  getAlerts(): ErrorAlert[] {
    return [...this.alerts].sort((a, b) => b.timestamp - a.timestamp);
  }

  // Alert management
  private createAlert(
    type: ErrorAlert['type'],
    errorId: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alert: ErrorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      errorId,
      type,
      message,
      timestamp: Date.now(),
      metadata,
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Emit alert event
    this.emitAlert(alert);
  }

  private emitAlert(alert: ErrorAlert): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('errorAlert', {
        detail: alert,
      }));
    }

    console.error('Error Alert:', alert);
  }

  private checkErrorSpike(error: ErrorReport): void {
    const recentWindow = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    if (now - error.firstSeen < recentWindow) {
      const normalRate = 1; // Assume 1 error per 5 minutes is normal
      if (error.count > normalRate * this.thresholds.spikeMultiplier) {
        this.createAlert('spike', error.id, `Error spike detected: ${error.message}`, {
          count: error.count,
          timeWindow: recentWindow,
        });
      }
    }
  }

  private checkErrorRateThreshold(): void {
    const stats = this.getErrorStats();
    if (stats.errorRate > this.thresholds.errorRate) {
      this.createAlert('threshold', 'error_rate', `High error rate: ${stats.errorRate.toFixed(2)} errors/min`, {
        errorRate: stats.errorRate,
        threshold: this.thresholds.errorRate,
      });
    }
  }

  // Fingerprinting
  private generateFingerprint(message: string, stack?: string, type?: string): string {
    // Create a unique fingerprint for grouping similar errors
    const key = `${type || 'unknown'}_${message}_${this.extractStackSignature(stack)}`;
    return this.hashString(key);
  }

  private extractStackSignature(stack?: string): string {
    if (!stack) return '';
    
    // Extract the first few lines of stack trace for fingerprinting
    const lines = stack.split('\n').slice(0, 3);
    return lines.map(line => {
      // Remove file paths and line numbers for consistent grouping
      return line.replace(/https?:\/\/[^\s]+/g, '').replace(/:\d+:\d+/g, '');
    }).join('|');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Global error handlers
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportJavaScriptError(
        new Error(event.message),
        undefined,
        `${event.filename}:${event.lineno}:${event.colno}`
      );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.reportJavaScriptError(error, undefined, 'unhandled_promise_rejection');
    });

    // Network errors (fetch wrapper)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.reportNetworkError(
            args[0] as string,
            response.status,
            response.statusText
          );
        }
        return response;
      } catch (error) {
        this.reportNetworkError(
          args[0] as string,
          0,
          error instanceof Error ? error.message : 'Network error'
        );
        throw error;
      }
    };
  }

  // Backend communication
  private async sendErrorReport(error: ErrorReport): Promise<void> {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });
    } catch (err) {
      console.warn('Failed to send error report:', err);
    }
  }

  // Cleanup
  clearErrors(): void {
    this.errors.clear();
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  destroy(): void {
    this.clearErrors();
    this.clearAlerts();
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// React hook for error tracking
export function useErrorTracker() {
  return {
    reportError: errorTracker.reportError.bind(errorTracker),
    reportJavaScriptError: errorTracker.reportJavaScriptError.bind(errorTracker),
    reportNetworkError: errorTracker.reportNetworkError.bind(errorTracker),
    reportBlockchainError: errorTracker.reportBlockchainError.bind(errorTracker),
    reportValidationError: errorTracker.reportValidationError.bind(errorTracker),
    reportRenderingError: errorTracker.reportRenderingError.bind(errorTracker),
    getErrorStats: errorTracker.getErrorStats.bind(errorTracker),
    getRecentErrors: errorTracker.getRecentErrors.bind(errorTracker),
    getAlerts: errorTracker.getAlerts.bind(errorTracker),
  };
}