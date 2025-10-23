import { renderHook, waitFor } from '@testing-library/react';
import { useNFTStatus } from '../useNFTStatus';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

const mockToast = toast as jest.Mocked<typeof toast>;

describe('useNFTStatus', () => {
  const mockCollectionId = 1;
  const mockItemId = 1;
  const mockTransactionId = 'test-tx-123';
  const mockAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

  const mockNFTInfo = {
    collectionId: mockCollectionId,
    itemId: mockItemId,
    owner: mockAddress,
    metadata: {
      id: `${mockCollectionId}-${mockItemId}`,
      name: 'Test NFT',
      description: 'A test NFT',
      model: {
        url: 'https://example.com/model.glb',
        format: 'glb' as const,
        size: 1024,
        dimensions: { width: 1, height: 1, depth: 1 }
      },
      materials: [],
      creator: mockAddress,
      timestamp: Date.now(),
      attributes: {}
    }
  };

  const mockTransaction = {
    id: mockTransactionId,
    status: 'completed' as const,
    metadata: mockNFTInfo.metadata,
    walletAddress: mockAddress,
    transactionHash: '0x123',
    blockNumber: 12345,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should fetch NFT info successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockNFTInfo
    });

    const { result } = renderHook(() => 
      useNFTStatus({ collectionId: mockCollectionId, itemId: mockItemId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nftInfo).toEqual(mockNFTInfo);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/nft/${mockCollectionId}/${mockItemId}`),
      expect.any(Object)
    );
  });

  it('should fetch transaction status successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockTransaction
    });

    const { result } = renderHook(() => 
      useNFTStatus({ transactionId: mockTransactionId }, { trackMinting: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mintTransaction).toEqual(mockTransaction);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/transaction/${mockTransactionId}`),
      expect.any(Object)
    );
  });

  it('should handle NFT not found (404)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'NFT not found' })
    });

    const { result } = renderHook(() => 
      useNFTStatus({ collectionId: mockCollectionId, itemId: mockItemId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nftInfo).toBeNull();
    expect(result.current.error).toBeNull(); // 404 is handled as null, not error
  });

  it('should handle fetch errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => 
      useNFTStatus({ collectionId: mockCollectionId, itemId: mockItemId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nftInfo).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle null identifier', async () => {
    const { result } = renderHook(() => useNFTStatus(null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nftInfo).toBeNull();
    expect(result.current.mintTransaction).toBeNull();
    expect(result.current.error).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should show toast notifications for status changes', async () => {
    // First render with pending status
    const pendingTransaction = { ...mockTransaction, status: 'pending' as const };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => pendingTransaction
    });

    const { result, rerender } = renderHook(() => 
      useNFTStatus({ transactionId: mockTransactionId }, { trackMinting: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mintTransaction?.status).toBe('pending');

    // Update to completed status
    const completedTransaction = { ...mockTransaction, status: 'completed' as const };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => completedTransaction
    });

    // Trigger refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.mintTransaction?.status).toBe('completed');
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      'NFT minted successfully!',
      expect.objectContaining({
        description: expect.stringContaining('Test NFT')
      })
    );
  });

  it('should show error toast for failed transactions', async () => {
    const failedTransaction = { 
      ...mockTransaction, 
      status: 'failed' as const,
      error: 'Insufficient funds'
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => failedTransaction
    });

    const { result } = renderHook(() => 
      useNFTStatus({ transactionId: mockTransactionId }, { trackMinting: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mintTransaction?.status).toBe('failed');
    expect(mockToast.error).toHaveBeenCalledWith(
      'NFT minting failed',
      expect.objectContaining({
        description: 'Insufficient funds'
      })
    );
  });

  it('should auto-refresh with faster interval for pending transactions', async () => {
    jest.useFakeTimers();
    
    const pendingTransaction = { ...mockTransaction, status: 'pending' as const };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => pendingTransaction
    });

    const { result } = renderHook(() => 
      useNFTStatus(
        { transactionId: mockTransactionId }, 
        { trackMinting: true, autoRefresh: true, refreshInterval: 15000 }
      )
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear initial call
    (global.fetch as jest.Mock).mockClear();

    // Should use faster interval (5s) for pending transactions
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('should stop polling when transaction is completed', async () => {
    jest.useFakeTimers();
    
    // Start with pending
    const pendingTransaction = { ...mockTransaction, status: 'pending' as const };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => pendingTransaction
    });

    const { result } = renderHook(() => 
      useNFTStatus(
        { transactionId: mockTransactionId }, 
        { trackMinting: true, autoRefresh: true, refreshInterval: 5000 }
      )
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update to completed
    const completedTransaction = { ...mockTransaction, status: 'completed' as const };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => completedTransaction
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.mintTransaction?.status).toBe('completed');
    });

    // Clear fetch mock
    (global.fetch as jest.Mock).mockClear();

    // Advance time - should not fetch again since completed
    jest.advanceTimersByTime(10000);

    expect(global.fetch).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should handle both NFT info and transaction tracking', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNFTInfo
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransaction
      });

    const { result } = renderHook(() => 
      useNFTStatus(
        { 
          collectionId: mockCollectionId, 
          itemId: mockItemId, 
          transactionId: mockTransactionId 
        }, 
        { trackMinting: true }
      )
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nftInfo).toEqual(mockNFTInfo);
    expect(result.current.mintTransaction).toEqual(mockTransaction);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});