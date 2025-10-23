import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MintingModal } from '../../components/portfolio/MintingModal';
import { PortfolioView } from '../../components/portfolio/PortfolioView';
import { TEST_CONFIG, createMockFetch, createMockWalletContext, MOCK_3D_MODELS } from '../testConfig';

// Mock the wallet context
const mockWalletContext = createMockWalletContext({
  isConnected: true,
  account: TEST_CONFIG.wallet.testAccounts[0],
});

// Mock fetch responses for the complete minting workflow
const mockFetchResponses = {
  'POST /api/mint': {
    success: true,
    transactionId: 'test-mint-tx-1',
    status: 'pending',
  },
  'GET /api/mint/status/test-mint-tx-1': {
    id: 'test-mint-tx-1',
    status: 'processing',
    progress: 50,
  },
  'GET /api/portfolio/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY': {
    walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    nfts: [],
    totalValue: 0,
    createdCount: 0,
    lastUpdated: Date.now(),
  },
  'GET /api/community': {
    recentMints: [],
    featuredCreators: [],
    totalNFTs: 0,
  },
};

// Test wrapper component
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

describe('End-to-End Minting Workflow', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    user = userEvent.setup();
    mockFetch = createMockFetch(mockFetchResponses);
    global.fetch = mockFetch;
    
    // Mock wallet context
    vi.mock('../../contexts/WalletContext', () => ({
      useWallet: () => mockWalletContext,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete the full minting workflow from file upload to blockchain confirmation', async () => {
    // Step 1: Render minting modal
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    
    render(
      <TestWrapper>
        <MintingModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
      </TestWrapper>
    );

    // Step 2: Upload 3D model file
    const fileInput = screen.getByLabelText(/upload.*model/i);
    const testFile = new File(['test content'], 'test-model.glb', {
      type: 'model/gltf-binary',
    });

    await user.upload(fileInput, testFile);

    // Verify file upload
    await waitFor(() => {
      expect(screen.getByText('test-model.glb')).toBeInTheDocument();
    });

    // Step 3: Fill in NFT metadata
    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'Test NFT Sculpture');
    await user.type(descriptionInput, 'A beautiful test sculpture for e2e testing');

    // Step 4: Set material properties
    const materialSection = screen.getByText(/material properties/i);
    expect(materialSection).toBeInTheDocument();

    // Step 5: Submit minting request
    const mintButton = screen.getByRole('button', { name: /mint nft/i });
    expect(mintButton).toBeEnabled();

    await user.click(mintButton);

    // Step 6: Verify minting request was sent
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mint'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    // Step 7: Verify transaction status polling starts
    await waitFor(() => {
      expect(screen.getByText(/minting in progress/i)).toBeInTheDocument();
    });

    // Step 8: Simulate transaction completion
    mockFetchResponses['GET /api/mint/status/test-mint-tx-1'] = {
      id: 'test-mint-tx-1',
      status: 'completed',
      transactionHash: '0x1234567890abcdef',
      blockNumber: 1000000,
      nftId: 'test-nft-1',
    };

    // Wait for status update
    await waitFor(() => {
      expect(screen.getByText(/minting completed/i)).toBeInTheDocument();
    }, { timeout: TEST_CONFIG.timeouts.blockchain });

    // Step 9: Verify success callback
    expect(onSuccess).toHaveBeenCalledWith({
      transactionId: 'test-mint-tx-1',
      nftId: 'test-nft-1',
    });
  });

  it('should handle minting errors gracefully', async () => {
    // Mock error response
    const errorFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = errorFetch;

    const onClose = vi.fn();
    const onSuccess = vi.fn();
    
    render(
      <TestWrapper>
        <MintingModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
      </TestWrapper>
    );

    // Upload file and fill form
    const fileInput = screen.getByLabelText(/upload.*model/i);
    const testFile = new File(['test content'], 'test-model.glb', {
      type: 'model/gltf-binary',
    });

    await user.upload(fileInput, testFile);
    
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test NFT');

    // Attempt to mint
    const mintButton = screen.getByRole('button', { name: /mint nft/i });
    await user.click(mintButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/error.*minting/i)).toBeInTheDocument();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should validate file format and size before minting', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    
    render(
      <TestWrapper>
        <MintingModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
      </TestWrapper>
    );

    // Try to upload invalid file
    const fileInput = screen.getByLabelText(/upload.*model/i);
    const invalidFile = new File(['test content'], 'test.txt', {
      type: 'text/plain',
    });

    await user.upload(fileInput, invalidFile);

    // Verify validation error
    await waitFor(() => {
      expect(screen.getByText(/invalid file format/i)).toBeInTheDocument();
    });

    // Try to upload oversized file
    const oversizedFile = new File([new ArrayBuffer(TEST_CONFIG.limits.maxFileSize + 1)], 'large.glb', {
      type: 'model/gltf-binary',
    });

    await user.upload(fileInput, oversizedFile);

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('should update portfolio after successful minting', async () => {
    // Mock successful minting and updated portfolio
    const updatedPortfolioResponse = {
      walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      nfts: [{
        id: 'test-nft-1',
        name: 'Test NFT Sculpture',
        description: 'A beautiful test sculpture',
        model: MOCK_3D_MODELS[0],
        creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        timestamp: Date.now(),
      }],
      totalValue: 100,
      createdCount: 1,
      lastUpdated: Date.now(),
    };

    mockFetchResponses['GET /api/portfolio/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'] = updatedPortfolioResponse;

    // Render portfolio view
    render(
      <TestWrapper>
        <PortfolioView />
      </TestWrapper>
    );

    // Wait for portfolio to load
    await waitFor(() => {
      expect(screen.getByText('Test NFT Sculpture')).toBeInTheDocument();
    });

    // Verify portfolio stats
    expect(screen.getByText('1')).toBeInTheDocument(); // Created count
    expect(screen.getByText(/100/)).toBeInTheDocument(); // Total value
  });
});

describe('Portfolio Synchronization E2E Tests', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch(mockFetchResponses);
    global.fetch = mockFetch;
  });

  it('should sync portfolio data from blockchain', async () => {
    const portfolioData = {
      walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      nfts: [
        {
          id: 'blockchain-nft-1',
          name: 'Blockchain NFT',
          onChain: true,
          blockNumber: 1000000,
        },
      ],
      totalValue: 150,
      createdCount: 1,
      lastUpdated: Date.now(),
    };

    mockFetchResponses['GET /api/portfolio/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'] = portfolioData;
    mockFetchResponses['POST /api/portfolio/sync'] = { success: true, synced: 1 };

    render(
      <TestWrapper>
        <PortfolioView />
      </TestWrapper>
    );

    // Trigger sync
    const syncButton = await screen.findByRole('button', { name: /sync/i });
    await userEvent.click(syncButton);

    // Verify sync request
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/portfolio/sync'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Verify updated data
    await waitFor(() => {
      expect(screen.getByText('Blockchain NFT')).toBeInTheDocument();
    });
  });
});

describe('Community Discovery E2E Tests', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    const communityData = {
      recentMints: [
        {
          id: 'community-nft-1',
          name: 'Community NFT 1',
          creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          timestamp: Date.now() - 3600000,
        },
        {
          id: 'community-nft-2',
          name: 'Community NFT 2',
          creator: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
          timestamp: Date.now() - 7200000,
        },
      ],
      featuredCreators: [
        '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
      ],
      totalNFTs: 25,
    };

    mockFetch = createMockFetch({
      ...mockFetchResponses,
      'GET /api/community': communityData,
    });
    global.fetch = mockFetch;
  });

  it('should load and display community feed', async () => {
    const { CommunityGallery } = await import('../../components/portfolio/CommunityGallery');
    
    render(
      <TestWrapper>
        <CommunityGallery />
      </TestWrapper>
    );

    // Verify community data loads
    await waitFor(() => {
      expect(screen.getByText('Community NFT 1')).toBeInTheDocument();
      expect(screen.getByText('Community NFT 2')).toBeInTheDocument();
    });

    // Verify total count
    expect(screen.getByText(/25.*nfts/i)).toBeInTheDocument();
  });

  it('should filter community feed by creator', async () => {
    const { CommunityGallery } = await import('../../components/portfolio/CommunityGallery');
    
    render(
      <TestWrapper>
        <CommunityGallery />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Community NFT 1')).toBeInTheDocument();
    });

    // Apply creator filter
    const creatorFilter = screen.getByLabelText(/filter by creator/i);
    await userEvent.selectOptions(creatorFilter, '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');

    // Verify filtered results
    await waitFor(() => {
      expect(screen.getByText('Community NFT 1')).toBeInTheDocument();
      expect(screen.queryByText('Community NFT 2')).not.toBeInTheDocument();
    });
  });
});