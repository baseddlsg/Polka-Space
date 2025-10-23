import { renderHook, waitFor } from '@testing-library/react';
import { usePortfolio } from '../usePortfolio';
import { useWallet } from '@/contexts/WalletContext';
import * as cacheService from '@/services/cacheService';

// Mock dependencies
jest.mock('@/contexts/WalletContext');
jest.mock('@/services/cacheService');
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockCachedFetch = cacheService.cachedFetch as jest.MockedFunction<typeof cacheService.cachedFetch>;

describe('usePortfolio', () => {
  const mockAccount = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    meta: { name: 'Test Account', source: 'polkadot-js' }
  };

  const mockPortfolio = {
    walletAddress: mockAccount.address,
    nfts: [
      {
        id: 'test-nft-1',
        name: 'Test NFT',
        description: 'A test NFT',
        model: {
          url: 'https://example.com/model.glb',
          format: 'glb' as const,
          size: 1024,
          dimensions: { width: 1, height: 1, depth: 1 }
        },
        materials: [],
        creator: mockAccount.address,
        timestamp: Date.now(),
        attributes: {}
      }
    ],
    totalValue: 0,
    createdCount: 1,
    lastUpdated: Date.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseWallet.mockReturnValue({
      selectedAccount: mockAccount,
      papiConnected: false,
      isWalletConnected: true,
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      accounts: [mockAccount],
      chainType: 'substrate',
      setChainType: jest.fn(),
      connectToPAPI: jest.fn(),
      disconnectFromPAPI: jest.fn(),
      setSelectedAccount: jest.fn()
    });
  });

  it('should fetch portfolio data successfully', async () => {
    mockCachedFetch.mockResolvedValueOnce(mockPortfolio);

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.portfolio).toEqual(mockPortfolio);
    expect(result.current.error).toBeNull();
    expect(mockCachedFetch).toHaveBeenCalledWith(
      expect.stringContaining(mockAccount.address),
      expect.any(Function),
      expect.any(Object),
      expect.any(Number)
    );
  });

  it('should handle no selected account', async () => {
    mockUseWallet.mockReturnValue({
      selectedAccount: null,
      papiConnected: false,
      isWalletConnected: false,
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      accounts: [],
      chainType: null,
      setChainType: jest.fn(),
      connectToPAPI: jest.fn(),
      disconnectFromPAPI: jest.fn(),
      setSelectedAccount: jest.fn()
    });

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.portfolio).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockCachedFetch).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');
    mockCachedFetch.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.portfolio).toBeNull();
    expect(result.current.error).toEqual(mockError);
  });

  it('should refetch data when requested', async () => {
    mockCachedFetch.mockResolvedValue(mockPortfolio);

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear the mock to verify refetch
    mockCachedFetch.mockClear();
    
    await result.current.refetch();

    expect(mockCachedFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle PAPI connected state', async () => {
    mockUseWallet.mockReturnValue({
      selectedAccount: mockAccount,
      papiConnected: true,
      isWalletConnected: true,
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      accounts: [mockAccount],
      chainType: 'substrate',
      setChainType: jest.fn(),
      connectToPAPI: jest.fn(),
      disconnectFromPAPI: jest.fn(),
      setSelectedAccount: jest.fn()
    });

    mockCachedFetch.mockImplementation(async (key, fetchFn) => {
      return await fetchFn();
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ nfts: mockPortfolio.nfts })
    });

    const { result } = renderHook(() => usePortfolio());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/papi/account/'),
      expect.any(Object)
    );
  });

  it('should auto-refresh when enabled', async () => {
    jest.useFakeTimers();
    mockCachedFetch.mockResolvedValue(mockPortfolio);

    const { result } = renderHook(() => 
      usePortfolio({ autoRefresh: true, refreshInterval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear initial call
    mockCachedFetch.mockClear();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockCachedFetch).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('should disable auto-refresh when option is false', async () => {
    jest.useFakeTimers();
    mockCachedFetch.mockResolvedValue(mockPortfolio);

    renderHook(() => 
      usePortfolio({ autoRefresh: false })
    );

    // Clear initial call
    mockCachedFetch.mockClear();

    // Fast-forward time
    jest.advanceTimersByTime(30000);

    // Should not have been called again
    expect(mockCachedFetch).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should cleanup on unmount', () => {
    jest.useFakeTimers();
    const { unmount } = renderHook(() => 
      usePortfolio({ autoRefresh: true, refreshInterval: 1000 })
    );

    unmount();

    // Fast-forward time after unmount
    jest.advanceTimersByTime(5000);

    // Should not cause any issues
    expect(() => jest.runAllTimers()).not.toThrow();

    jest.useRealTimers();
  });
});