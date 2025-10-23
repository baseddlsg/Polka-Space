// Performance monitoring for 3D rendering and blockchain operations

export interface PerformanceThresholds {
  renderTime: number; // ms
  apiResponseTime: number; // ms
  blockchainResponseTime: number; // ms
  memoryUsage: number; // bytes
  frameRate: number; // fps
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  context?: Record<string, any>;
}

export interface RenderingMetrics {
  frameRate: number;
  renderTime: number;
  triangleCount: number;
  textureMemory: number;
  shaderCompileTime: number;
}

export interface BlockchainMetrics {
  connectionLatency: number;
  transactionTime: number;
  blockSyncTime: number;
  queryResponseTime: number;
  errorRate: number;
}

class PerformanceMonitor {
  private thresholds: PerformanceThresholds = {
    renderTime: 16.67, // 60fps
    apiResponseTime: 2000,
    blockchainResponseTime: 10000,
    memoryUsage: 100 * 1024 * 1024, // 100MB
    frameRate: 30,
  };

  private alerts: PerformanceAlert[] = [];
  private renderingMetrics: RenderingMetrics[] = [];
  private blockchainMetrics: BlockchainMetrics[] = [];
  private isMonitoring: boolean = false;
  private frameRateBuffer: number[] = [];
  private memoryCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.setupFrameRateMonitoring();
    this.setupMemoryMonitoring();
  }

  // Configuration
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    this.startMemoryChecks();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }

  // 3D Rendering Performance
  trackRenderFrame(renderTime: number, triangleCount: number, textureMemory: number): void {
    if (!this.isMonitoring) return;

    const frameRate = 1000 / renderTime;
    this.frameRateBuffer.push(frameRate);
    
    // Keep only last 60 frames for rolling average
    if (this.frameRateBuffer.length > 60) {
      this.frameRateBuffer.shift();
    }

    const metrics: RenderingMetrics = {
      frameRate,
      renderTime,
      triangleCount,
      textureMemory,
      shaderCompileTime: 0, // Will be set separately
    };

    this.renderingMetrics.push(metrics);
    this.checkRenderingThresholds(metrics);
  }

  trackShaderCompilation(compileTime: number): void {
    if (this.renderingMetrics.length > 0) {
      this.renderingMetrics[this.renderingMetrics.length - 1].shaderCompileTime = compileTime;
    }
  }

  getAverageFrameRate(): number {
    if (this.frameRateBuffer.length === 0) return 0;
    return this.frameRateBuffer.reduce((sum, fps) => sum + fps, 0) / this.frameRateBuffer.length;
  }

  getRenderingStats(): {
    averageFrameRate: number;
    averageRenderTime: number;
    averageTriangleCount: number;
    totalTextureMemory: number;
  } {
    if (this.renderingMetrics.length === 0) {
      return {
        averageFrameRate: 0,
        averageRenderTime: 0,
        averageTriangleCount: 0,
        totalTextureMemory: 0,
      };
    }

    const recent = this.renderingMetrics.slice(-60); // Last 60 frames
    
    return {
      averageFrameRate: recent.reduce((sum, m) => sum + m.frameRate, 0) / recent.length,
      averageRenderTime: recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length,
      averageTriangleCount: recent.reduce((sum, m) => sum + m.triangleCount, 0) / recent.length,
      totalTextureMemory: recent.reduce((sum, m) => sum + m.textureMemory, 0),
    };
  }

  // Blockchain Performance
  trackBlockchainOperation(
    operation: 'connection' | 'transaction' | 'query' | 'sync',
    duration: number,
    success: boolean,
    context?: Record<string, any>
  ): void {
    if (!this.isMonitoring) return;

    const metrics: Partial<BlockchainMetrics> = {};
    
    switch (operation) {
      case 'connection':
        metrics.connectionLatency = duration;
        break;
      case 'transaction':
        metrics.transactionTime = duration;
        break;
      case 'query':
        metrics.queryResponseTime = duration;
        break;
      case 'sync':
        metrics.blockSyncTime = duration;
        break;
    }

    // Update error rate
    const recentMetrics = this.blockchainMetrics.slice(-100);
    const errorCount = recentMetrics.filter(m => m.errorRate > 0).length + (success ? 0 : 1);
    metrics.errorRate = errorCount / (recentMetrics.length + 1);

    const fullMetrics: BlockchainMetrics = {
      connectionLatency: 0,
      transactionTime: 0,
      blockSyncTime: 0,
      queryResponseTime: 0,
      errorRate: 0,
      ...metrics,
    };

    this.blockchainMetrics.push(fullMetrics);
    this.checkBlockchainThresholds(fullMetrics, operation, context);
  }

  getBlockchainStats(): {
    averageConnectionLatency: number;
    averageTransactionTime: number;
    averageQueryTime: number;
    errorRate: number;
  } {
    if (this.blockchainMetrics.length === 0) {
      return {
        averageConnectionLatency: 0,
        averageTransactionTime: 0,
        averageQueryTime: 0,
        errorRate: 0,
      };
    }

    const recent = this.blockchainMetrics.slice(-100);
    
    return {
      averageConnectionLatency: this.average(recent.map(m => m.connectionLatency)),
      averageTransactionTime: this.average(recent.map(m => m.transactionTime)),
      averageQueryTime: this.average(recent.map(m => m.queryResponseTime)),
      errorRate: recent[recent.length - 1]?.errorRate || 0,
    };
  }

  // Memory Monitoring
  trackMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize;
      
      if (usedMemory > this.thresholds.memoryUsage) {
        this.createAlert('warning', 'memory_usage', usedMemory, this.thresholds.memoryUsage);
      }
      
      return usedMemory;
    }
    return 0;
  }

  // Alert System
  private checkRenderingThresholds(metrics: RenderingMetrics): void {
    if (metrics.frameRate < this.thresholds.frameRate) {
      this.createAlert('warning', 'frame_rate', metrics.frameRate, this.thresholds.frameRate, {
        renderTime: metrics.renderTime,
        triangleCount: metrics.triangleCount,
      });
    }

    if (metrics.renderTime > this.thresholds.renderTime) {
      this.createAlert('warning', 'render_time', metrics.renderTime, this.thresholds.renderTime, {
        frameRate: metrics.frameRate,
        triangleCount: metrics.triangleCount,
      });
    }
  }

  private checkBlockchainThresholds(
    metrics: BlockchainMetrics,
    operation: string,
    context?: Record<string, any>
  ): void {
    const responseTime = metrics.transactionTime || metrics.queryResponseTime || metrics.connectionLatency;
    
    if (responseTime > this.thresholds.blockchainResponseTime) {
      this.createAlert('warning', 'blockchain_response_time', responseTime, this.thresholds.blockchainResponseTime, {
        operation,
        ...context,
      });
    }

    if (metrics.errorRate > 0.1) { // 10% error rate
      this.createAlert('critical', 'blockchain_error_rate', metrics.errorRate, 0.1, {
        operation,
        ...context,
      });
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    metric: string,
    value: number,
    threshold: number,
    context?: Record<string, any>
  ): void {
    const alert: PerformanceAlert = {
      type,
      metric,
      value,
      threshold,
      timestamp: Date.now(),
      context,
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Emit alert event
    this.emitAlert(alert);
  }

  private emitAlert(alert: PerformanceAlert): void {
    // Dispatch custom event for alert handling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performanceAlert', {
        detail: alert,
      }));
    }

    // Log critical alerts
    if (alert.type === 'critical') {
      console.error('Performance Alert:', alert);
    } else {
      console.warn('Performance Warning:', alert);
    }
  }

  getAlerts(type?: PerformanceAlert['type']): PerformanceAlert[] {
    if (type) {
      return this.alerts.filter(alert => alert.type === type);
    }
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  // Setup methods
  private setupFrameRateMonitoring(): void {
    if (typeof window === 'undefined') return;

    let lastFrameTime = performance.now();
    
    const measureFrame = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastFrameTime;
      
      if (this.isMonitoring && frameTime > 0) {
        // Only track if we have meaningful frame time
        this.trackRenderFrame(frameTime, 0, 0);
      }
      
      lastFrameTime = currentTime;
      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  private setupMemoryMonitoring(): void {
    // Memory monitoring will be started when monitoring begins
  }

  private startMemoryChecks(): void {
    this.memoryCheckInterval = setInterval(() => {
      this.trackMemoryUsage();
    }, 5000); // Check every 5 seconds
  }

  // Utility methods
  private average(values: number[]): number {
    const filtered = values.filter(v => v > 0);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, val) => sum + val, 0) / filtered.length;
  }

  // Performance measurement helpers
  measureRenderOperation<T>(operation: () => T): T {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    
    this.trackRenderFrame(duration, 0, 0);
    return result;
  }

  async measureBlockchainOperation<T>(
    operation: 'connection' | 'transaction' | 'query' | 'sync',
    promise: Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    let success = true;
    
    try {
      const result = await promise;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - start;
      this.trackBlockchainOperation(operation, duration, success, context);
    }
  }

  // Export data for analytics
  exportMetrics(): {
    rendering: RenderingMetrics[];
    blockchain: BlockchainMetrics[];
    alerts: PerformanceAlert[];
    thresholds: PerformanceThresholds;
  } {
    return {
      rendering: [...this.renderingMetrics],
      blockchain: [...this.blockchainMetrics],
      alerts: [...this.alerts],
      thresholds: { ...this.thresholds },
    };
  }

  // Cleanup
  destroy(): void {
    this.stopMonitoring();
    this.renderingMetrics = [];
    this.blockchainMetrics = [];
    this.alerts = [];
    this.frameRateBuffer = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    startMonitoring: performanceMonitor.startMonitoring.bind(performanceMonitor),
    stopMonitoring: performanceMonitor.stopMonitoring.bind(performanceMonitor),
    trackRenderFrame: performanceMonitor.trackRenderFrame.bind(performanceMonitor),
    trackBlockchainOperation: performanceMonitor.trackBlockchainOperation.bind(performanceMonitor),
    getRenderingStats: performanceMonitor.getRenderingStats.bind(performanceMonitor),
    getBlockchainStats: performanceMonitor.getBlockchainStats.bind(performanceMonitor),
    getAlerts: performanceMonitor.getAlerts.bind(performanceMonitor),
    measureRenderOperation: performanceMonitor.measureRenderOperation.bind(performanceMonitor),
    measureBlockchainOperation: performanceMonitor.measureBlockchainOperation.bind(performanceMonitor),
  };
}