import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TEST_CONFIG, createMockFetch, createMockWalletContext, MOCK_NFT_DATA } from '../testConfig';

// Mock components for integration testing
const MockApp = () => {
  const [selectedNFT, setSelectedNFT] = React.useState(null);
  const [portfolioData, setPortfolioData] = React.useState(null);
  
  return (
    <div>
      <div data-testid="portfolio-section">
        <PortfolioView 
          onNFTSelect={setSelectedNFT}
          onDataUpdate={setPortfolioData}
        />
      </div>
      <div data-testid="community-section">
        <CommunityGallery onNFTSelect={setSelectedNFT} />
      </div>
      <div data-testid="vr-section">
        <VRScene selectedNFT={selectedNFT} />
      </div>
      <div data-testid="minting-section">
        <MintingModal 
          isOpen={false}
          onSuccess={(data) => {
            // Simulate portfolio update after minting
            setPortfolioData(prev => ({
              ...prev,
              nfts: [...(prev?.nfts || []), data.nft],
              createdCount: (prev?.createdCount || 0) + 1,
            }));
          }}
        />
      </div>
    </div>
  );
};

// Test wrapper
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

describe('Cross-Component Communication E2E Tests', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  let mockWalletContext: ReturnType<typeof createMockWalletContext>;

  beforeEach(() => {
    mockWalletContext = createMockWalletContext({
      isConnected: true,
      account: TEST_CONFIG.wallet.testAccounts[0],
    });

    const mockResponses = {
      'GET /api/portfolio/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY': {
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        nfts: MOCK_NFT_DATA,
        totalValue: 250,
        createdCount: 2,
        lastUpdated: Date.now(),
      },
      'GET /api/community': {
        recentMints: MOCK_NFT_DATA,
        featuredCreators: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
        totalNFTs: 2,
      },
      'POST /api/mint': {
        success: true,
        transactionId: 'test-tx-1',
        nft: {
          id: 'new-nft-1',
          name: 'New Test NFT',
          creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        },
      },
    };

    mockFetch = createMockFetch(mockResponses);
    global.fetch = mockFetch;

    // Mock wallet context
    vi.mock('../../contexts/WalletContext', () => ({
      useWallet: () => mockWalletContext,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should synchronize NFT selection across portfolio and VR components', async () => {
    render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Wait for portfolio to load
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture #1')).toBeInTheDocument();
    });

    // Select NFT from portfolio
    const nftCard = screen.getByText('Abstract Sculpture #1');
    await userEvent.click(nftCard);

    // Verify VR scene updates
    await waitFor(() => {
      const vrSection = screen.getByTestId('vr-section');
      expect(vrSection).toHaveAttribute('data-selected-nft', 'test-nft-1');
    });

    // Verify 3D model loads in VR scene
    await waitFor(() => {
      expect(screen.getByTestId('vr-model-viewer')).toBeInTheDocument();
    });
  });

  it('should update portfolio data after successful minting', async () => {
    render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Wait for initial portfolio load
    await waitFor(() => {
      expect(screen.getByText(/2.*created/i)).toBeInTheDocument();
    });

    // Simulate successful minting
    const mintingSection = screen.getByTestId('minting-section');
    fireEvent(mintingSection, new CustomEvent('mintingSuccess', {
      detail: {
        nft: {
          id: 'new-nft-1',
          name: 'New Test NFT',
          creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        },
      },
    }));

    // Verify portfolio updates
    await waitFor(() => {
      expect(screen.getByText(/3.*created/i)).toBeInTheDocument();
    });

    // Verify new NFT appears in portfolio
    await waitFor(() => {
      expect(screen.getByText('New Test NFT')).toBeInTheDocument();
    });
  });

  it('should propagate loading states across components', async () => {
    // Mock slow API response
    const slowFetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_NFT_DATA),
      }), 2000))
    );
    global.fetch = slowFetch;

    render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Verify loading states appear
    expect(screen.getByTestId('portfolio-loading')).toBeInTheDocument();
    expect(screen.getByTestId('community-loading')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('portfolio-loading')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle error states consistently across components', async () => {
    // Mock API error
    const errorFetch = vi.fn().mockRejectedValue(new Error('API Error'));
    global.fetch = errorFetch;

    render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Verify error states appear
    await waitFor(() => {
      expect(screen.getByText(/error.*loading.*portfolio/i)).toBeInTheDocument();
      expect(screen.getByText(/error.*loading.*community/i)).toBeInTheDocument();
    });

    // Verify retry functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    expect(errorFetch).toHaveBeenCalledTimes(2); // Initial + retry
  });

  it('should maintain state consistency during wallet connection changes', async () => {
    const { rerender } = render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Wait for initial load with connected wallet
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture #1')).toBeInTheDocument();
    });

    // Simulate wallet disconnection
    mockWalletContext.isConnected = false;
    mockWalletContext.account = null;

    rerender(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Verify components handle disconnection
    await waitFor(() => {
      expect(screen.getByText(/connect.*wallet/i)).toBeInTheDocument();
    });

    // Verify VR scene clears selection
    const vrSection = screen.getByTestId('vr-section');
    expect(vrSection).not.toHaveAttribute('data-selected-nft');
  });

  it('should synchronize real-time updates across components', async () => {
    render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture #1')).toBeInTheDocument();
    });

    // Simulate real-time update (e.g., WebSocket message)
    const newNFT = {
      id: 'realtime-nft-1',
      name: 'Real-time NFT',
      creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      timestamp: Date.now(),
    };

    // Dispatch custom event to simulate real-time update
    window.dispatchEvent(new CustomEvent('nftUpdate', {
      detail: { type: 'new_mint', nft: newNFT },
    }));

    // Verify both portfolio and community components update
    await waitFor(() => {
      expect(screen.getByText('Real-time NFT')).toBeInTheDocument();
    });

    // Verify community feed shows the new NFT
    const communitySection = screen.getByTestId('community-section');
    expect(communitySection).toContainElement(screen.getByText('Real-time NFT'));
  });
});

describe('Data Flow Integration Tests', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    const mockResponses = {
      'GET /api/portfolio/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY': {
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        nfts: MOCK_NFT_DATA,
        totalValue: 250,
        createdCount: 2,
        lastUpdated: Date.now(),
      },
      'POST /api/portfolio/sync': {
        success: true,
        synced: 1,
        newNFTs: [{
          id: 'synced-nft-1',
          name: 'Synced NFT',
          onChain: true,
        }],
      },
      'GET /api/community': {
        recentMints: MOCK_NFT_DATA,
        featuredCreators: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
        totalNFTs: 2,
      },
    };

    mockFetch = createMockFetch(mockResponses);
    global.fetch = mockFetch;
  });

  it('should handle blockchain sync and update all dependent components', async () => {
    render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/2.*created/i)).toBeInTheDocument();
    });

    // Trigger blockchain sync
    const syncButton = screen.getByRole('button', { name: /sync/i });
    await userEvent.click(syncButton);

    // Verify sync request
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/portfolio/sync'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Verify portfolio updates with synced data
    await waitFor(() => {
      expect(screen.getByText('Synced NFT')).toBeInTheDocument();
      expect(screen.getByText(/3.*created/i)).toBeInTheDocument();
    });

    // Verify community feed also updates
    const communitySection = screen.getByTestId('community-section');
    await waitFor(() => {
      expect(communitySection).toContainElement(screen.getByText('Synced NFT'));
    });
  });

  it('should maintain performance during rapid state updates', async () => {
    const performanceStart = performance.now();
    
    render(
      <TestWrapper>
        <MockApp />
      </TestWrapper>
    );

    // Simulate rapid NFT selections
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture #1')).toBeInTheDocument();
    });

    const nftCards = screen.getAllByTestId('nft-card');
    
    // Rapidly select different NFTs
    for (let i = 0; i < 10; i++) {
      await userEvent.click(nftCards[i % nftCards.length]);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const performanceEnd = performance.now();
    const totalTime = performanceEnd - performanceStart;

    // Verify performance is within acceptable limits
    expect(totalTime).toBeLessThan(TEST_CONFIG.performance.maxRenderTime * 10);
  });
});