import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { UserPortfolio, NFTMetadata } from '@/types/nft';
import { portfolioCache, cacheKeys, cachedFetch } from '@/services/cacheService';
import { toast } from 'sonner';

interface UsePortfolioOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
}

interface UsePortfolioReturn {
  portfolio: UserPortfolio | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  refresh: () => void;
  lastUpdated: number | null;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Hook for fetching and managing user NFT portfolio with real-time updates
 */
export function usePortfolio(options: UsePortfolioOptions = {}): UsePortfolioReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableRealTime = true
  } = options;

  const { selectedAccount, papiConnected } = useWallet();
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch portfolio data from backend with caching
   */
  const fetchPortfolio = useCallback(async (signal?: AbortSignal): Promise<UserPortfolio | null> => {
    if (!selectedAccount?.address) {
      return null;
    }

    const cacheKey = cacheKeys.portfolio(selectedAccount.address);

    return await cachedFetch(
      cacheKey,
      async () => {
        const endpoint = papiConnected 
          ? `${BACKEND_URL}/api/papi/account/${selectedAccount.address}/nfts`
          : `${BACKEND_URL}/portfolio/${selectedAccount.address}`;

        const response = await fetch(endpoint, { signal });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch portfolio: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        let portfolioData: UserPortfolio;
        if (papiConnected && data.nfts) {
          // PAPI response format
          portfolioData = {
            walletAddress: selectedAccount.address,
            nfts: data.nfts,
            totalValue: 0, // Calculate if needed
            createdCount: data.nfts.length,
            lastUpdated: Date.now()
          };
        } else {
          // Standard portfolio response
          portfolioData = data;
        }

        return portfolioData;
      },
      portfolioCache,
      5 * 60 * 1000 // 5 minutes
    );
  }, [selectedAccount?.address, papiConnected]);

  /**
   * Refetch portfolio data
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (!selectedAccount?.address) {
      setPortfolio(null);
      setError(null);
      setLastUpdated(null);
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
      const portfolioData = await fetchPortfolio(abortControllerRef.current.signal);
      
      if (portfolioData) {
        setPortfolio(portfolioData);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch portfolio');
      setError(error);
      console.error('Portfolio fetch error:', error);
      
      // Show toast for user-facing errors
      if (error.message.includes('Failed to fetch')) {
        toast.error('Failed to load portfolio', {
          description: 'Please check your connection and try again'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount?.address, fetchPortfolio]);

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
    if (autoRefresh && selectedAccount?.address && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refetch();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, selectedAccount?.address, refreshInterval, refetch]);

  /**
   * Initial fetch when wallet connects or changes
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
   * Real-time updates via WebSocket or polling
   * This would be enhanced with actual WebSocket implementation
   */
  useEffect(() => {
    if (!enableRealTime || !selectedAccount?.address) {
      return;
    }

    // For now, we'll use more frequent polling for "real-time" updates
    // In production, this would be replaced with WebSocket connections
    const realTimeInterval = setInterval(() => {
      // Only refetch if we haven't updated recently
      const timeSinceLastUpdate = lastUpdated ? Date.now() - lastUpdated : Infinity;
      if (timeSinceLastUpdate > 10000) { // 10 seconds
        refetch();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(realTimeInterval);
  }, [enableRealTime, selectedAccount?.address, lastUpdated, refetch]);

  return {
    portfolio,
    isLoading,
    error,
    refetch,
    refresh,
    lastUpdated
  };
}

export default usePortfolio;