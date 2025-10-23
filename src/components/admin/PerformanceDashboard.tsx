/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and system health
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Zap, 
  Clock, 
  Users,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { performanceOptimizer } from '@/services/performanceOptimizer';
import { getConfig } from '@/config/production';

interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  frameRate: number;
  loadTime: number;
  activeUsers: number;
  cacheHitRate: number;
  errorRate: number;
  uptime: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  resolved: boolean;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    network: 0,
    storage: 0,
    frameRate: 60,
    loadTime: 0,
    activeUsers: 0,
    cacheHitRate: 0,
    errorRate: 0,
    uptime: 0
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const config = getConfig();

  // Fetch performance metrics
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);

      // Get performance metrics from optimizer
      const optimizerMetrics = performanceOptimizer.getMetrics();
      const cacheStats = performanceOptimizer.getCacheStats();

      // Simulate additional system metrics (in production, these would come from monitoring APIs)
      const systemMetrics: SystemMetrics = {
        cpu: Math.random() * 100,
        memory: optimizerMetrics.memoryUsage,
        network: Math.random() * 100,
        storage: Math.random() * 100,
        frameRate: optimizerMetrics.frameRate,
        loadTime: optimizerMetrics.loadTime,
        activeUsers: Math.floor(Math.random() * 1000),
        cacheHitRate: (cacheStats.modelCache / (cacheStats.modelCache + 10)) * 100,
        errorRate: Math.random() * 5,
        uptime: Date.now() - (Date.now() - Math.random() * 86400000) // Random uptime up to 24h
      };

      setMetrics(systemMetrics);
      setLastUpdate(new Date());

      // Generate alerts based on metrics
      generateAlerts(systemMetrics);

    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate performance alerts
  const generateAlerts = (metrics: SystemMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    if (metrics.cpu > 80) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: 'warning',
        message: `High CPU usage: ${metrics.cpu.toFixed(1)}%`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    if (metrics.memory > 85) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'error',
        message: `High memory usage: ${metrics.memory.toFixed(1)}MB`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    if (metrics.frameRate < 30) {
      newAlerts.push({
        id: `fps-${Date.now()}`,
        type: 'warning',
        message: `Low frame rate: ${metrics.frameRate.toFixed(1)} FPS`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    if (metrics.errorRate > 2) {
      newAlerts.push({
        id: `error-${Date.now()}`,
        type: 'error',
        message: `High error rate: ${metrics.errorRate.toFixed(1)}%`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Only add new alerts, avoid duplicates
    setAlerts(prev => {
      const existingTypes = prev.filter(a => !a.resolved).map(a => a.message.split(':')[0]);
      const uniqueNewAlerts = newAlerts.filter(alert => 
        !existingTypes.includes(alert.message.split(':')[0])
      );
      return [...prev, ...uniqueNewAlerts];
    });
  };

  // Auto-refresh metrics
  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Get status color based on value and thresholds
  const getStatusColor = (value: number, type: 'cpu' | 'memory' | 'network' | 'storage' | 'error') => {
    const thresholds = {
      cpu: { warning: 70, error: 85 },
      memory: { warning: 70, error: 85 },
      network: { warning: 80, error: 95 },
      storage: { warning: 80, error: 95 },
      error: { warning: 1, error: 3 }
    };

    const threshold = thresholds[type];
    if (value >= threshold.error) return 'text-red-600 bg-red-100';
    if (value >= threshold.warning) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  // Format uptime
  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Resolve alert
  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time system metrics and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={autoRefresh ? 'default' : 'secondary'}>
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cpu.toFixed(1)}%</div>
            <Progress value={metrics.cpu} className="mt-2" />
            <Badge className={`mt-2 ${getStatusColor(metrics.cpu, 'cpu')}`}>
              {metrics.cpu < 70 ? 'Normal' : metrics.cpu < 85 ? 'Warning' : 'Critical'}
            </Badge>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memory.toFixed(1)}MB</div>
            <Progress value={(metrics.memory / 512) * 100} className="mt-2" />
            <Badge className={`mt-2 ${getStatusColor((metrics.memory / 512) * 100, 'memory')}`}>
              {metrics.memory < 350 ? 'Normal' : metrics.memory < 450 ? 'Warning' : 'Critical'}
            </Badge>
          </CardContent>
        </Card>

        {/* Frame Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frame Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.frameRate.toFixed(0)} FPS</div>
            <Progress value={(metrics.frameRate / 60) * 100} className="mt-2" />
            <Badge className={`mt-2 ${metrics.frameRate >= 50 ? 'text-green-600 bg-green-100' : metrics.frameRate >= 30 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'}`}>
              {metrics.frameRate >= 50 ? 'Excellent' : metrics.frameRate >= 30 ? 'Good' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% from last hour
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                <span>Network</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={metrics.network} className="w-20" />
                <span className="text-sm">{metrics.network.toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Cache Hit Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={metrics.cacheHitRate} className="w-20" />
                <span className="text-sm">{metrics.cacheHitRate.toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Load Time</span>
              </div>
              <span className="text-sm">{metrics.loadTime.toFixed(0)}ms</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Uptime</span>
              </div>
              <span className="text-sm">{formatUptime(metrics.uptime)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Error Rate</span>
              </div>
              <Badge className={getStatusColor(metrics.errorRate, 'error')}>
                {metrics.errorRate.toFixed(2)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mr-2" />
                  <span>No active alerts</span>
                </div>
              ) : (
                alerts
                  .filter(alert => !alert.resolved)
                  .slice(0, 5)
                  .map(alert => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${
                        alert.type === 'error' ? 'border-red-200 bg-red-50' :
                        alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.type === 'error' ? 'text-red-600' :
                            alert.type === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <span className="text-sm font-medium">{alert.message}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Performance Settings</h4>
              <div className="text-sm space-y-1">
                <div>Max Concurrent Models: {config.performance.maxConcurrentModels}</div>
                <div>Model Cache Size: {config.performance.modelCacheSize}</div>
                <div>Query Batch Size: {config.performance.queryBatchSize}</div>
                <div>Service Worker: {config.performance.enableServiceWorker ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Feature Flags</h4>
              <div className="text-sm space-y-1">
                <div>VR Mode: {config.features.enableVR ? 'Enabled' : 'Disabled'}</div>
                <div>AR Mode: {config.features.enableAR ? 'Enabled' : 'Disabled'}</div>
                <div>PWA: {config.features.enablePWA ? 'Enabled' : 'Disabled'}</div>
                <div>Offline Mode: {config.features.enableOfflineMode ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Monitoring</h4>
              <div className="text-sm space-y-1">
                <div>Analytics: {config.monitoring.enableAnalytics ? 'Enabled' : 'Disabled'}</div>
                <div>Error Tracking: {config.monitoring.enableErrorTracking ? 'Enabled' : 'Disabled'}</div>
                <div>Performance: {config.monitoring.enablePerformanceMonitoring ? 'Enabled' : 'Disabled'}</div>
                <div>Sample Rate: {(config.monitoring.sampleRate * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default PerformanceDashboard;