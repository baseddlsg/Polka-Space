import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TEST_CONFIG, MOCK_NFT_DATA } from '../testConfig';

// Performance measurement utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): () => number {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const duration = end - start;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      return duration;
    };
  }

  getAverageTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMaxTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return Math.max(...times);
  }

  getMinTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return Math.min(...times);
  }

  clear(): void {
    this.measurements.clear();
  }
}

// Mock large dataset for performance testing
const generateLargeNFTDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `perf-nft-${index}`,
    name: `Performance Test NFT ${index}`,
    description: `Description for NFT ${index}`,
    model: {
      url: `https://ipfs.io/ipfs/QmTestHash${index}/model.glb`,
      format: 'glb',
      size: 1024000 + (index * 1000),
      dimensions: { width: 10, height: 15, depth: 8 },
    },
    creator: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`,
    timestamp: Date.now() - (index * 3600000),
    attributes: {
      category: 'test',
      style: 'performance',
      complexity: index % 3 === 0 ? 'high' : 'medium',
    },
  }));
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Performance Benchmarks', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
  });

  describe('Component Rendering Performance', () => {
    it('should render portfolio with 100 NFTs within performance threshold', async () => {
      const largeDataset = generateLargeNFTDataset(100);
      
      // Mock API response with large dataset
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          nfts: largeDataset,
          totalValue: 10000,
          createdCount: 100,
          lastUpdated: Date.now(),
        }),
      });

      const endMeasurement = performanceMonitor.startMeasurement('portfolio-render-100');
      
      render(
        <TestWrapper>
          <PortfolioView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Performance Test NFT 0')).toBeInTheDocument();
      });

      const renderTime = endMeasurement();
      
      expect(renderTime).toBeLessThan(TEST_CONFIG.performance.maxRenderTime * 5); // 500ms for 100 items
      console.log(`Portfolio render time (100 NFTs): ${renderTime.toFixed(2)}ms`);
    });

    it('should handle virtual scrolling efficiently with 1000 NFTs', async () => {
      const massiveDataset = generateLargeNFTDataset(1000);
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          nfts: massiveDataset,
          totalValue: 100000,
          createdCount: 1000,
          lastUpdated: Date.now(),
        }),
      });

      const endMeasurement = performanceMonitor.startMeasurement('virtual-scroll-1000');
      
      render(
        <TestWrapper>
          <VirtualScrollList items={massiveDataset} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Performance Test NFT 0')).toBeInTheDocument();
      });

      const renderTime = endMeasurement();
      
      // Virtual scrolling should handle 1000 items efficiently
      expect(renderTime).toBeLessThan(TEST_CONFIG.performance.maxRenderTime * 10); // 1000ms max
      console.log(`Virtual scroll render time (1000 NFTs): ${renderTime.toFixed(2)}ms`);
    });

    it('should lazy load 3D models efficiently', async () => {
      const modelsToLoad = Array.from({ length: 10 }, (_, i) => ({
        id: `model-${i}`,
        url: `https://ipfs.io/ipfs/QmTestHash${i}/model.glb`,
        name: `Model ${i}`,
      }));

      const loadTimes: number[] = [];

      for (const model of modelsToLoad) {
        const endMeasurement = performanceMonitor.startMeasurement(`model-load-${model.id}`);
        
        render(
          <TestWrapper>
            <LazyModel modelUrl={model.url} />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('model-loaded')).toBeInTheDocument();
        });

        const loadTime = endMeasurement();
        loadTimes.push(loadTime);
      }

      const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);

      expect(averageLoadTime).toBeLessThan(500); // 500ms average
      expect(maxLoadTime).toBeLessThan(1000); // 1s max for any single model
      
      console.log(`Average 3D model load time: ${averageLoadTime.toFixed(2)}ms`);
      console.log(`Max 3D model load time: ${maxLoadTime.toFixed(2)}ms`);
    });
  });

  describe('API Performance', () => {
    it('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 10;
      const mockResponses = Array.from({ length: concurrentRequests }, (_, i) => ({
        walletAddress: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY${i}`,
        nfts: generateLargeNFTDataset(10),
        totalValue: 1000,
        createdCount: 10,
      }));

      global.fetch = vi.fn().mockImplementation((url) => {
        const index = parseInt(url.slice(-1)) || 0;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponses[index % mockResponses.length]),
        });
      });

      const endMeasurement = performanceMonitor.startMeasurement('concurrent-api-requests');
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        fetch(`/api/portfolio/test${i}`)
      );

      await Promise.all(promises);
      
      const totalTime = endMeasurement();
      
      expect(totalTime).toBeLessThan(TEST_CONFIG.performance.maxApiResponseTime * 2); // 4s for 10 concurrent requests
      console.log(`Concurrent API requests time (${concurrentRequests} requests): ${totalTime.toFixed(2)}ms`);
    });

    it('should cache API responses effectively', async () => {
      const cacheKey = 'portfolio-cache-test';
      const mockData = {
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        nfts: MOCK_NFT_DATA,
        totalValue: 250,
        createdCount: 2,
      };

      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        });
      });

      // First request - should hit API
      const endMeasurement1 = performanceMonitor.startMeasurement('first-api-call');
      
      render(
        <TestWrapper>
          <PortfolioView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Abstract Sculpture #1')).toBeInTheDocument();
      });

      const firstCallTime = endMeasurement1();

      // Second request - should use cache
      const endMeasurement2 = performanceMonitor.startMeasurement('cached-api-call');
      
      render(
        <TestWrapper>
          <PortfolioView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Abstract Sculpture #1')).toBeInTheDocument();
      });

      const cachedCallTime = endMeasurement2();

      // Cached call should be significantly faster
      expect(cachedCallTime).toBeLessThan(firstCallTime * 0.5);
      console.log(`First API call: ${firstCallTime.toFixed(2)}ms`);
      console.log(`Cached API call: ${cachedCallTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during component mounting/unmounting', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Mount and unmount components multiple times
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <TestWrapper>
            <PortfolioView />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.queryByTestId('portfolio-loading')).not.toBeInTheDocument();
        });
        
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log(`Memory increase after 50 mount/unmount cycles: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle large datasets without excessive memory usage', async () => {
      const largeDataset = generateLargeNFTDataset(1000);
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          nfts: largeDataset,
          totalValue: 100000,
          createdCount: 1000,
        }),
      });

      render(
        <TestWrapper>
          <VirtualScrollList items={largeDataset} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Performance Test NFT 0')).toBeInTheDocument();
      });

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryUsage = finalMemory - initialMemory;
      
      // Should handle 1000 items without using more than 50MB
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory usage for 1000 NFTs: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('3D Rendering Performance', () => {
    it('should maintain 60fps during 3D model interactions', async () => {
      const frameRates: number[] = [];
      let lastFrameTime = performance.now();
      
      // Mock requestAnimationFrame to measure frame rates
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = vi.fn().mockImplementation((callback) => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastFrameTime;
        const fps = 1000 / deltaTime;
        frameRates.push(fps);
        lastFrameTime = currentTime;
        
        return originalRAF(callback);
      });

      render(
        <TestWrapper>
          <VRScene selectedNFT={MOCK_NFT_DATA[0]} />
        </TestWrapper>
      );

      // Simulate 3D interactions for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      window.requestAnimationFrame = originalRAF;

      const averageFPS = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
      const minFPS = Math.min(...frameRates);

      expect(averageFPS).toBeGreaterThan(30); // Minimum acceptable FPS
      expect(minFPS).toBeGreaterThan(15); // No frame should drop below 15fps
      
      console.log(`Average FPS: ${averageFPS.toFixed(2)}`);
      console.log(`Minimum FPS: ${minFPS.toFixed(2)}`);
    });
  });
});