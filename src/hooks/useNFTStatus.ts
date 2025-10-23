import { useState, useEffect, useCallback, useRef } from 'react';
import { NFTInfo, MintTransaction } from '@/types/nft';
import { toast } from 'sonner';

interface UseNFTStatusOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  trackMinting?: boolean;
}

interface UseNFTStatusReturn {
  nftInfo: NFTInfo | null;
  mintTransaction: MintTransaction | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  refresh: () => void;
  lastUpdated: number | null;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Hook for tracking individual NFT state and minting status
 */
export function useNFTStatus(
  identifier: { collectionId?: number; itemId?: number; transactionId?: string } | null,
  options: UseNFTStatusOptions = {}
): UseNFTStatusReturn {
  const {
    autoRefresh = true,
    refreshInterval = 15000, // 15 seconds
    trackMinting = true
  } = options;

  const [nftInfo, setNftInfo] = useState<NFTInfo | null>(null);
  const [mintTransaction, setMintTransaction] = useState<MintTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch NFT information by collection and item ID
   */
  const fetchNFTInfo = useCallback(async (
    collectionId: number, 
    itemId: number, 
    signal?: AbortSignal
  ): Promise<NFTInfo | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/nft/${collectionId}/${itemId}`, { signal });
      
      if (response.status === 404) {
        return null; // NFT doesn't exist yet
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFT info: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }, []);

  /**
   * Fetch mint transaction status
   */
  const fetchMintTransaction = useCallback(async (
    transactionId: string, 
    signal?: AbortSignal
  ): Promise<MintTransaction | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/transaction/${transactionId}`, { signal });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }, []);

  /**
   * Refetch NFT status data
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (!identifier) {
      setNftInfo(null);
      setMintTransaction(null);
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
      const promises: Promise<any>[] = [];

      // Fetch NFT info if we have collection and item IDs
      if (identifier.collectionId !== undefined && identifier.itemId !== undefined) {
        promises.push(
          fetchNFTInfo(identifier.collectionId, identifier.itemId, abortControllerRef.current.signal)
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      // Fetch mint transaction if we have transaction ID and tracking is enabled
      if (identifier.transactionId && trackMinting) {
        promises.push(
          fetchMintTransaction(identifier.transactionId, abortControllerRef.current.signal)
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      const [nftData, transactionData] = await Promise.all(promises);
      
      setNftInfo(nftData);
      setMintTransaction(transactionData);
      setLastUpdated(Date.now());

      // Show notifications for status changes
      if (transactionData && trackMinting) {
        const prevStatus = mintTransaction?.status;
        const newStatus = transactionData.status;
        
        if (prevStatus && prevStatus !== newStatus) {
          switch (newStatus) {
            case 'completed':
              toast.success('NFT minted successfully!', {
                description: `Your NFT "${transactionData.metadata.name}" is now on the blockchain`
              });
              break;
            case 'failed':
              toast.error('NFT minting failed', {
                description: transactionData.error || 'Please try again'
              });
              break;
            case 'processing':
              toast.info('NFT minting in progress', {
                description: 'Your transaction is being processed'
              });
              break;
          }
        }
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch NFT status');
      setError(error);
      console.error('NFT status fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [identifier, fetchNFTInfo, fetchMintTransaction, trackMinting, mintTransaction?.status]);

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
    if (autoRefresh && identifier && refreshInterval > 0) {
      // More frequent polling for pending transactions
      const interval = mintTransaction?.status === 'pending' || mintTransaction?.status === 'processing' 
        ? Math.min(refreshInterval, 5000) // 5 seconds for pending
        : refreshInterval;

      refreshIntervalRef.current = setInterval(() => {
        refetch();
      }, interval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, identifier, refreshInterval, refetch, mintTransaction?.status]);

  /**
   * Initial fetch when identifier changes
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
   * Stop polling when transaction is completed or failed
   */
  useEffect(() => {
    if (mintTransaction?.status === 'completed' || mintTransaction?.status === 'failed') {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  }, [mintTransaction?.status]);

  return {
    nftInfo,
    mintTransaction,
    isLoading,
    error,
    refetch,
    refresh,
    lastUpdated
  };
}

export default useNFTStatus;