// Analytics and user interaction tracking service

export interface AnalyticsEvent {
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UserInteraction {
  type: 'click' | 'hover' | 'scroll' | 'input' | 'navigation';
  element: string;
  page: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private interactions: UserInteraction[] = [];
  private isEnabled: boolean = true;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceObserver();
    this.setupInteractionTracking();
    this.startAutoFlush();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  // Event tracking
  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      type: 'event',
      category,
      action,
      label,
      value,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(event);
    this.checkBatchFlush();
  }

  // NFT-specific events
  trackNFTMint(nftId: string, modelSize: number, processingTime: number): void {
    this.trackEvent('nft', 'mint', nftId, processingTime, {
      modelSize,
      processingTime,
    });
  }

  trackNFTView(nftId: string, viewDuration: number): void {
    this.trackEvent('nft', 'view', nftId, viewDuration, {
      viewDuration,
    });
  }

  trackPortfolioView(walletAddress: string, nftCount: number): void {
    this.trackEvent('portfolio', 'view', walletAddress, nftCount, {
      nftCount,
    });
  }

  trackCommunityInteraction(action: 'browse' | 'filter' | 'search', metadata?: Record<string, any>): void {
    this.trackEvent('community', action, undefined, undefined, metadata);
  }

  track3DModelLoad(modelUrl: string, loadTime: number, modelSize: number): void {
    this.trackEvent('3d_model', 'load', modelUrl, loadTime, {
      loadTime,
      modelSize,
    });
  }

  trackVRInteraction(action: string, duration: number): void {
    this.trackEvent('vr', action, undefined, duration, {
      duration,
    });
  }

  trackWalletConnection(walletType: string, success: boolean): void {
    this.trackEvent('wallet', 'connect', walletType, success ? 1 : 0, {
      success,
      walletType,
    });
  }

  trackError(error: Error, context?: string): void {
    this.trackEvent('error', 'exception', error.name, undefined, {
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  // Performance tracking
  trackPerformance(name: string, value: number, unit: PerformanceMetric['unit'], metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.checkBatchFlush();
  }

  trackPageLoad(page: string, loadTime: number): void {
    this.trackPerformance('page_load', loadTime, 'ms', { page });
  }

  trackAPICall(endpoint: string, responseTime: number, status: number): void {
    this.trackPerformance('api_call', responseTime, 'ms', {
      endpoint,
      status,
    });
  }

  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.trackPerformance('memory_used', memory.usedJSHeapSize, 'bytes');
      this.trackPerformance('memory_total', memory.totalJSHeapSize, 'bytes');
    }
  }

  // User interaction tracking
  trackInteraction(
    type: UserInteraction['type'],
    element: string,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const interaction: UserInteraction = {
      type,
      element,
      page: window.location.pathname,
      timestamp: Date.now(),
      duration,
      metadata,
    };

    this.interactions.push(interaction);
    this.checkBatchFlush();
  }

  // Setup methods
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackPageLoad(window.location.pathname, navEntry.loadEventEnd - navEntry.loadEventStart);
          } else if (entry.entryType === 'measure') {
            this.trackPerformance(entry.name, entry.duration, 'ms');
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'measure'] });
    }
  }

  private setupInteractionTracking(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const element = this.getElementIdentifier(target);
      this.trackInteraction('click', element);
    });

    // Track navigation
    window.addEventListener('popstate', () => {
      this.trackInteraction('navigation', window.location.pathname);
    });

    // Track scroll events (throttled)
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackInteraction('scroll', 'window', undefined, {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
        });
      }, 100);
    });
  }

  private getElementIdentifier(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  // Data management
  private checkBatchFlush(): void {
    const totalItems = this.events.length + this.metrics.length + this.interactions.length;
    if (totalItems >= this.batchSize) {
      this.flush();
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  async flush(): Promise<void> {
    if (!this.isEnabled) return;

    const data = {
      events: [...this.events],
      metrics: [...this.metrics],
      interactions: [...this.interactions],
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    // Clear local storage
    this.events = [];
    this.metrics = [];
    this.interactions = [];

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn('Failed to send analytics data:', error);
      // Could implement retry logic or local storage fallback here
    }
  }

  // Utility methods
  startTiming(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.trackPerformance(name, duration, 'ms');
    };
  }

  measureAsync<T>(name: string, promise: Promise<T>): Promise<T> {
    const endTiming = this.startTiming(name);
    return promise.finally(() => endTiming());
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// React hook for analytics
export function useAnalytics() {
  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackNFTMint: analytics.trackNFTMint.bind(analytics),
    trackNFTView: analytics.trackNFTView.bind(analytics),
    trackPortfolioView: analytics.trackPortfolioView.bind(analytics),
    trackCommunityInteraction: analytics.trackCommunityInteraction.bind(analytics),
    track3DModelLoad: analytics.track3DModelLoad.bind(analytics),
    trackVRInteraction: analytics.trackVRInteraction.bind(analytics),
    trackWalletConnection: analytics.trackWalletConnection.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackInteraction: analytics.trackInteraction.bind(analytics),
    startTiming: analytics.startTiming.bind(analytics),
    measureAsync: analytics.measureAsync.bind(analytics),
  };
}