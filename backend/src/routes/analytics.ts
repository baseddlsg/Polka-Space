import express from 'express';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';

const router = express.Router();

// Redis client for analytics storage
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface AnalyticsData {
  events: any[];
  metrics: any[];
  interactions: any[];
  sessionId: string;
  userId?: string;
  timestamp: number;
}

interface ErrorReport {
  id: string;
  type: string;
  severity: string;
  message: string;
  stack?: string;
  context: any;
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

// Store analytics data
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: AnalyticsData = req.body;
    
    if (!data.sessionId || !data.timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store events
    for (const event of data.events) {
      await redis.zadd('analytics:events', data.timestamp, JSON.stringify({
        ...event,
        sessionId: data.sessionId,
        userId: data.userId,
      }));
    }

    // Store metrics
    for (const metric of data.metrics) {
      await redis.zadd('analytics:metrics', data.timestamp, JSON.stringify({
        ...metric,
        sessionId: data.sessionId,
        userId: data.userId,
      }));
    }

    // Store interactions
    for (const interaction of data.interactions) {
      await redis.zadd('analytics:interactions', data.timestamp, JSON.stringify({
        ...interaction,
        sessionId: data.sessionId,
        userId: data.userId,
      }));
    }

    // Update session info
    await redis.hset(`analytics:session:${data.sessionId}`, {
      userId: data.userId || '',
      lastActivity: data.timestamp,
      eventCount: data.events.length,
      metricCount: data.metrics.length,
      interactionCount: data.interactions.length,
    });

    // Update daily counters
    const today = new Date().toISOString().split('T')[0];
    await redis.hincrby(`analytics:daily:${today}`, 'events', data.events.length);
    await redis.hincrby(`analytics:daily:${today}`, 'metrics', data.metrics.length);
    await redis.hincrby(`analytics:daily:${today}`, 'interactions', data.interactions.length);

    if (data.userId) {
      await redis.sadd(`analytics:daily:${today}:users`, data.userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Analytics storage error:', error);
    res.status(500).json({ error: 'Failed to store analytics data' });
  }
});

// Get analytics summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Get recent events
    const recentEvents = await redis.zrangebyscore('analytics:events', oneDayAgo, now);
    const weeklyEvents = await redis.zrangebyscore('analytics:events', oneWeekAgo, now);

    // Parse events to get specific metrics
    const parsedEvents = recentEvents.map(event => JSON.parse(event));
    const nftMintEvents = parsedEvents.filter(e => e.category === 'nft' && e.action === 'mint');
    const portfolioViewEvents = parsedEvents.filter(e => e.category === 'portfolio' && e.action === 'view');
    const communityEvents = parsedEvents.filter(e => e.category === 'community');

    // Get active users (unique sessions in last 24h)
    const today = new Date().toISOString().split('T')[0];
    const activeUsers = await redis.scard(`analytics:daily:${today}:users`);

    // Get daily stats
    const dailyStats = await redis.hgetall(`analytics:daily:${today}`);

    const summary = {
      totalEvents: parseInt(dailyStats.events || '0'),
      activeUsers,
      nftsMinted: nftMintEvents.length,
      portfolioViews: portfolioViewEvents.length,
      communityInteractions: communityEvents.length,
      weeklyEvents: weeklyEvents.length,
      dailyStats,
    };

    res.json(summary);
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

// Get detailed analytics for a specific metric
router.get('/metrics/:metricName', async (req: Request, res: Response) => {
  try {
    const { metricName } = req.params;
    const { timeRange = '24h' } = req.query;

    let timeAgo: number;
    switch (timeRange) {
      case '1h':
        timeAgo = Date.now() - (60 * 60 * 1000);
        break;
      case '24h':
        timeAgo = Date.now() - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeAgo = Date.now() - (24 * 60 * 60 * 1000);
    }

    const metrics = await redis.zrangebyscore('analytics:metrics', timeAgo, Date.now());
    const parsedMetrics = metrics
      .map(metric => JSON.parse(metric))
      .filter(metric => metric.name === metricName);

    // Calculate statistics
    const values = parsedMetrics.map(m => m.value);
    const stats = {
      count: values.length,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      latest: values.length > 0 ? values[values.length - 1] : 0,
      data: parsedMetrics.slice(-100), // Last 100 data points
    };

    res.json(stats);
  } catch (error) {
    console.error('Metrics query error:', error);
    res.status(500).json({ error: 'Failed to get metrics data' });
  }
});

// Store error reports
router.post('/errors', async (req: Request, res: Response) => {
  try {
    const errorReport: ErrorReport = req.body;
    
    if (!errorReport.id || !errorReport.message) {
      return res.status(400).json({ error: 'Missing required error fields' });
    }

    // Store error report
    await redis.hset(`analytics:error:${errorReport.id}`, {
      type: errorReport.type,
      severity: errorReport.severity,
      message: errorReport.message,
      stack: errorReport.stack || '',
      context: JSON.stringify(errorReport.context),
      fingerprint: errorReport.fingerprint,
      count: errorReport.count,
      firstSeen: errorReport.firstSeen,
      lastSeen: errorReport.lastSeen,
    });

    // Add to error index
    await redis.zadd('analytics:errors', errorReport.lastSeen, errorReport.id);

    // Update error counters
    const today = new Date().toISOString().split('T')[0];
    await redis.hincrby(`analytics:daily:${today}:errors`, errorReport.type, 1);
    await redis.hincrby(`analytics:daily:${today}:errors`, errorReport.severity, 1);

    res.json({ success: true });
  } catch (error) {
    console.error('Error storage error:', error);
    res.status(500).json({ error: 'Failed to store error report' });
  }
});

// Get error summary
router.get('/errors/summary', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Get recent errors
    const recentErrorIds = await redis.zrangebyscore('analytics:errors', oneDayAgo, now);
    const errorReports = await Promise.all(
      recentErrorIds.map(async (errorId) => {
        const errorData = await redis.hgetall(`analytics:error:${errorId}`);
        return {
          id: errorId,
          ...errorData,
          context: JSON.parse(errorData.context || '{}'),
          count: parseInt(errorData.count || '0'),
          firstSeen: parseInt(errorData.firstSeen || '0'),
          lastSeen: parseInt(errorData.lastSeen || '0'),
        };
      })
    );

    // Calculate error statistics
    const totalErrors = errorReports.reduce((sum, error) => sum + error.count, 0);
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    errorReports.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + error.count;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + error.count;
    });

    // Calculate error rate (errors per total events)
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = await redis.hgetall(`analytics:daily:${today}`);
    const totalEvents = parseInt(dailyStats.events || '0');
    const errorRate = totalEvents > 0 ? totalErrors / totalEvents : 0;

    const summary = {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      errorRate,
      recentErrors: errorReports.slice(0, 10), // Top 10 recent errors
    };

    res.json(summary);
  } catch (error) {
    console.error('Error summary error:', error);
    res.status(500).json({ error: 'Failed to get error summary' });
  }
});

// Get performance metrics
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query;

    let timeAgo: number;
    switch (timeRange) {
      case '1h':
        timeAgo = Date.now() - (60 * 60 * 1000);
        break;
      case '24h':
        timeAgo = Date.now() - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeAgo = Date.now() - (24 * 60 * 60 * 1000);
    }

    const metrics = await redis.zrangebyscore('analytics:metrics', timeAgo, Date.now());
    const parsedMetrics = metrics.map(metric => JSON.parse(metric));

    // Group metrics by type
    const performanceMetrics = {
      renderTime: parsedMetrics.filter(m => m.name === 'render_time'),
      frameRate: parsedMetrics.filter(m => m.name === 'frame_rate'),
      apiResponseTime: parsedMetrics.filter(m => m.name === 'api_call'),
      memoryUsage: parsedMetrics.filter(m => m.name === 'memory_used'),
      pageLoad: parsedMetrics.filter(m => m.name === 'page_load'),
    };

    // Calculate averages
    const calculateAverage = (metrics: any[]) => {
      if (metrics.length === 0) return 0;
      return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    };

    const summary = {
      averageRenderTime: calculateAverage(performanceMetrics.renderTime),
      averageFrameRate: calculateAverage(performanceMetrics.frameRate),
      averageApiResponseTime: calculateAverage(performanceMetrics.apiResponseTime),
      averageMemoryUsage: calculateAverage(performanceMetrics.memoryUsage),
      averagePageLoadTime: calculateAverage(performanceMetrics.pageLoad),
      dataPoints: {
        renderTime: performanceMetrics.renderTime.slice(-50),
        frameRate: performanceMetrics.frameRate.slice(-50),
        apiResponseTime: performanceMetrics.apiResponseTime.slice(-50),
        memoryUsage: performanceMetrics.memoryUsage.slice(-50),
      },
    };

    res.json(summary);
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// Clean up old data (should be called periodically)
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.body;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Remove old events, metrics, and interactions
    await redis.zremrangebyscore('analytics:events', 0, cutoffTime);
    await redis.zremrangebyscore('analytics:metrics', 0, cutoffTime);
    await redis.zremrangebyscore('analytics:interactions', 0, cutoffTime);
    await redis.zremrangebyscore('analytics:errors', 0, cutoffTime);

    // Remove old daily stats
    const cutoffDate = new Date(cutoffTime);
    for (let i = days; i < days + 7; i++) {
      const date = new Date(cutoffDate.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      await redis.del(`analytics:daily:${dateStr}`);
      await redis.del(`analytics:daily:${dateStr}:users`);
      await redis.del(`analytics:daily:${dateStr}:errors`);
    }

    res.json({ success: true, message: `Cleaned up data older than ${days} days` });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup old data' });
  }
});

export default router;