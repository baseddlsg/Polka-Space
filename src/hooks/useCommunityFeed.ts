import { useState, useEffect, useCallback, useRef } from 'react';
import { CommunityFeed, NFTMetadata } from '@/types/nft';
import { communityCache, cacheKeys, cachedFetch } from '@/services/cacheService';
import { toast } from 'sonner';

interface UseCommunityFeedOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
  offset?: number;
  enableRealTime?: boolean;
}

interface UseCommunityFeedReturn {
  communityFeed: CommunityFeed | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  refresh: () => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  lastUpdated: number | null;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Hook for fetching and managing community NFT discovery feed
 */
export function useCommunityFeed(options: UseCommunityFeedOptions = {}): UseCommunityFeedReturn {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
    limit = 20,
    offset: initialOffset = 0,
    enableRealTime = true
  } = options;

  const [communityFeed, setCommunityFeed] = useState<CommunityFeed | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [currentOffset, setCurrentOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch community feed data from backend with caching
   */
  const fetchCommunityFeed = useCallback(async (
    fetchLimit: number = limit,
    fetchOffset: number = 0,
    signal?: AbortSignal
  ): Promise<CommunityFeed | null> => {
    const cacheKey = cacheKeys.communityFeed(fetchLimit, fetchOffset);

    return await cachedFetch(
      cacheKey,
      async () => {
        const params = new URLSearchParams({
          limit: fetchLimit.toString(),
          offset: fetchOffset.toString()
        });

        const response = await fetch(`${BACKEND_URL}/community?${params}`, { signal });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch community feed: ${response.status} ${response.statusText}`);
        }

        const data: CommunityFeed = await response.json();
        
        // Validate response structure
        if (!data.recentMints || !Array.isArray(data.recentMints)) {
          throw new Error('Invalid community feed response format');
        }

        return data;
      },
      communityCache,
      2 * 60 * 1000 // 2 minutes
    );
  }, [limit]);

  /**
   * Refetch community feed data (replace existing data)
   */
  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const feedData = await fetchCommunityFeed(limit, 0, abortControllerRef.current.signal);
      
      if (feedData) {
        setCommunityFeed(feedData);
        setCurrentOffset(limit);
        setHasMore(feedData.recentMints.length === limit);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch community feed');
      setError(error);
      console.error('Community feed fetch error:', error);
      
      // Show toast for user-facing errors
      if (error.message.includes('Failed to fetch')) {
        toast.error('Failed to load community feed', {
          description: 'Please check your connection and try again'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchCommunityFeed, limit]);

  /**
   * Load more community feed data (append to existing data)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const feedData = await fetchCommunityFeed(limit, currentOffset, abortControllerRef.current.signal);
      
      if (feedData && communityFeed) {
        // Merge new data with existing data
        const mergedFeed: CommunityFeed = {
          recentMints: [...communityFeed.recentMints, ...feedData.recentMints],
          featuredCreators: [
            ...new Set([...communityFeed.featuredCreators, ...feedData.featuredCreators])
          ],
          totalNFTs: feedData.totalNFTs // Use latest total count
        };

        setCommunityFeed(mergedFeed);
        setCurrentOffset(currentOffset + limit);
        setHasMore(feedData.recentMints.length === limit);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more community data');
      setError(error);
      console.error('Community feed load more error:', error);
      
      toast.error('Failed to load more content', {
        description: 'Please try again'
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchCommunityFeed, limit, currentOffset, hasMore, isLoading, communityFeed]);

  /**
   * Manual refresh trigger
   */
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * Set up auto-refresh interval
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refetch();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refetch]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Real-time updates for new NFT mints
   * This would be enhanced with actual WebSocket implementation
   */
  useEffect(() => {
    if (!enableRealTime) {
      return;
    }

    // For now, we'll use more frequent polling for "real-time" updates
    // In production, this would be replaced with WebSocket connections
    const realTimeInterval = setInterval(() => {
      // Only refetch if we haven't updated recently
      const timeSinceLastUpdate = lastUpdated ? Date.now() - lastUpdated : Infinity;
      if (timeSinceLastUpdate > 30000) { // 30 seconds
        refetch();
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(realTimeInterval);
  }, [enableRealTime, lastUpdated, refetch]);

  /**
   * Detect new NFTs and show notifications
   */
  useEffect(() => {
    if (!communityFeed || !lastUpdated) {
      return;
    }

    // Check for very recent mints (within last 2 minutes)
    const recentThreshold = Date.now() - (2 * 60 * 1000);
    const veryRecentMints = communityFeed.recentMints.filter(
      nft => nft.timestamp > recentThreshold
    );

    if (veryRecentMints.length > 0 && enableRealTime) {
      // Show notification for new mints (but not on initial load)
      const timeSinceLastUpdate = Date.now() - lastUpdated;
      if (timeSinceLastUpdate < 60000) { // Only if updated within last minute
        veryRecentMints.forEach(nft => {
          toast.info('New NFT minted!', {
            description: `"${nft.name}" by ${nft.creator.slice(0, 8)}...`,
            duration: 3000
          });
        });
      }
    }
  }, [communityFeed, lastUpdated, enableRealTime]);

  return {
    communityFeed,
    isLoading,
    error,
    refetch,
    refresh,
    loadMore,
    hasMore,
    lastUpdated
  };
}

export default useCommunityFeed;