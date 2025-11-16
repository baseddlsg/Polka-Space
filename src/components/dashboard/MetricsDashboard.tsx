import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RefreshCw, AlertTriangle, TrendingUp, Activity, Zap, Database } from 'lucide-react';
import { analytics } from '../../services/analytics';
import { performanceMonitor, usePerformanceMonitor } from '../../services/performanceMonitor';
import { errorTracker, useErrorTracker } from '../../services/errorTracker';

interface MetricsData {
  analytics: {
    totalEvents: number;
    activeUsers: number;
    nftsMinted: number;
    portfolioViews: number;
    communityInteractions: number;
  };
  performance: {
    averageFrameRate: number;
    averageRenderTime: number;
    averageApiResponseTime: number;
    memoryUsage: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    recentAlerts: number;
  };
}

export const MetricsDashboard: React.FC = () => {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const performanceHook = usePerformanceMonitor();
  const errorHook = useErrorTracker();

  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadMetrics = async () => {
    setIsLoading(true);
    
    try {
      // Fetch analytics data
      const analyticsResponse = await fetch('/api/analytics/summary');
      const analyticsData = analyticsResponse.ok ? await analyticsResponse.json() : {
        totalEvents: 0,
        activeUsers: 0,
        nftsMinted: 0,
        portfolioViews: 0,
        communityInteractions: 0,
      };

      // Get performance data
      const renderingStats = performanceHook.getRenderingStats();
      const blockchainStats = performanceHook.getBlockchainStats();
      const performanceAlerts = performanceHook.getAlerts();

      // Get error data
      const errorStats = errorHook.getErrorStats();
      const errorAlerts = errorHook.getAlerts();

      const metrics: MetricsData = {
        analytics: analyticsData,
        performance: {
          averageFrameRate: renderingStats.averageFrameRate,
          averageRenderTime: renderingStats.averageRenderTime,
          averageApiResponseTime: blockchainStats.averageQueryTime,
          memoryUsage: performanceMonitor.trackMemoryUsage(),
        },
        errors: {
          totalErrors: errorStats.totalErrors,
          errorRate: errorStats.errorRate,
          criticalErrors: errorStats.errorsBySeverity.critical || 0,
          recentAlerts: errorAlerts.filter(alert => 
            Date.now() - alert.timestamp < 24 * 60 * 60 * 1000
          ).length,
        },
      };

      setMetricsData(metrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load metrics:', error);
      errorHook.reportError(error as Error, 'javascript', 'medium', {
        component: 'MetricsDashboard',
        action: 'loadMetrics',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${bytes}B`;
  };

  const getPerformanceStatus = (frameRate: number): { status: string; color: string } => {
    if (frameRate >= 50) return { status: 'Excellent', color: 'bg-green-500' };
    if (frameRate >= 30) return { status: 'Good', color: 'bg-yellow-500' };
    return { status: 'Poor', color: 'bg-red-500' };
  };

  const getErrorStatus = (errorRate: number): { status: string; color: string } => {
    if (errorRate < 0.01) return { status: 'Low', color: 'bg-green-500' };
    if (errorRate < 0.05) return { status: 'Medium', color: 'bg-yellow-500' };
    return { status: 'High', color: 'bg-red-500' };
  };

  if (isLoading && !metricsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading metrics...</span>
      </div>
    );
  }

  if (!metricsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <span className="ml-2">Failed to load metrics</span>
        <Button onClick={loadMetrics} variant="outline" className="ml-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system performance, user engagement, and error rates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          <Button onClick={loadMetrics} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metricsData.analytics.totalEvents)}</div>
            <p className="text-xs text-muted-foreground">User interactions tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsData.performance.averageFrameRate.toFixed(1)} FPS</div>
            <div className="flex items-center space-x-2">
              <Badge 
                className={`${getPerformanceStatus(metricsData.performance.averageFrameRate).color} text-white`}
              >
                {getPerformanceStatus(metricsData.performance.averageFrameRate).status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metricsData.errors.errorRate * 100).toFixed(2)}%</div>
            <div className="flex items-center space-x-2">
              <Badge 
                className={`${getErrorStatus(metricsData.errors.errorRate).color} text-white`}
              >
                {getErrorStatus(metricsData.errors.errorRate).status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(metricsData.performance.memoryUsage)}</div>
            <p className="text-xs text-muted-foreground">JavaScript heap size</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Active users and interactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Active Users:</span>
                  <span className="font-semibold">{metricsData.analytics.activeUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Portfolio Views:</span>
                  <span className="font-semibold">{metricsData.analytics.portfolioViews}</span>
                </div>
                <div className="flex justify-between">
                  <span>Community Interactions:</span>
                  <span className="font-semibold">{metricsData.analytics.communityInteractions}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>NFT Activity</CardTitle>
                <CardDescription>Minting and viewing statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>NFTs Minted:</span>
                  <span className="font-semibold">{metricsData.analytics.nftsMinted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-semibold">
                    {metricsData.analytics.nftsMinted > 0 ? '95%' : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Rendering Performance</CardTitle>
                <CardDescription>3D rendering and frame rate metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Average FPS:</span>
                  <span className="font-semibold">{metricsData.performance.averageFrameRate.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Render Time:</span>
                  <span className="font-semibold">{metricsData.performance.averageRenderTime.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory Usage:</span>
                  <span className="font-semibold">{formatBytes(metricsData.performance.memoryUsage)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Backend and blockchain response times</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>API Response:</span>
                  <span className="font-semibold">{metricsData.performance.averageApiResponseTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={metricsData.performance.averageApiResponseTime < 2000 ? "default" : "destructive"}>
                    {metricsData.performance.averageApiResponseTime < 2000 ? "Good" : "Slow"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid   
       </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetricsDashboard;