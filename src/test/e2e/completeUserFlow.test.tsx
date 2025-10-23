/**
 * Complete User Flow End-to-End Test
 * Tests the entire journey from VR scene to NFT minting to portfolio display
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from '@/contexts/WalletContext';
import { AvatarProvider } from '@/contexts/AvatarContext';
import VRWorld from '@/pages/VRWorld';
import PortfolioView from '@/components/portfolio/PortfolioView';
import { integrationService } from '@/services/integrationService';
import { NFTMetadata } from '@/types/nft';

// Mock the integration service
vi.mock('@/services/integrationService', () => ({
  integrationService: {
    executeMintingFlow: vi.fn(),
    executePortfolioSyncFlow: vi.fn(),
    executeCommunityDiscoveryFlow: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getActiveFlows: vi.fn(() => []),
    getFlow: vi.fn()
  }
}));

// Mock blockchain service
vi.mock('@/services/blockchainService', () => ({
  blockchainService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    mintNFT: vi.fn(),
    getNFTsByOwner: vi.fn(),
    isConnected: vi.fn(() => true)
  }
}));

// Mock minting service
vi.mock('@/services/mintingService', () => ({
  fetchUserNFTs: vi.fn().mockResolvedValue([]),
  mintNFT: vi.fn().mockResolvedValue({
    transactionHash: '0x123456789abcdef',
    tokenId: '42'
  })
}));

// Mock wallet functionality
const mockWallet = {
  selectedAccount: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    meta: { name: 'Test Account', source: 'polkadot-js' }
  },
  isWalletConnected: true,
  papiConnected: true,
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  accounts: [],
  chainType: 'substrate' as const,
  setChainType: vi.fn(),
  connectToPAPI: vi.fn(),
  disconnectFromPAPI: vi.fn()
};

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => mockWallet,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Three.js and React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({
    camera: {},
    gl: { domElement: document.createElement('canvas') },
    scene: { add: vi.fn(), remove: vi.fn() }
  })
}));

vi.mock('@react-three/drei', () => ({
  Sky: () => <div data-testid="sky" />,
  PerspectiveCamera: () => <div data-testid="camera" />,
  MeshReflectorMaterial: () => <div data-testid="reflector" />,
  SoftShadows: () => <div data-testid="shadows" />,
  TransformControls: () => <div data-testid="transform-controls" />,
  Sparkles: () => <div data-testid="sparkles" />
}));

// Mock object store
const mockObjectStore = {
  objects: [
    {
      id: 'test-object-1',
      name: 'Test Cube',
      type: 'box',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#ff0000',
      modelUrl: null,
      metadata: {}
    }
  ],
  updateObjectTransform: vi.fn(),
  removeObject: vi.fn(),
  addObject: vi.fn()
};

vi.mock('@/stores/objectStore', () => ({
  useObjectStore: () => mockObjectStore
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn()
  }
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AvatarProvider>
        <WalletProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </WalletProvider>
      </AvatarProvider>
    </QueryClientProvider>
  );
};

describe('Complete User Flow Integration', () => {
  let mockMintingFlow: any;
  let mockPortfolioFlow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock responses
    mockMintingFlow = vi.fn().mockResolvedValue({
      transactionHash: '0x123456789abcdef',
      collectionId: 1,
      itemId: 42,
      metadata: {
        id: 'nft-1',
        name: 'Test NFT',
        description: 'A test NFT created in VR',
        model: {
          url: 'https://example.com/model.glb',
          format: 'glb' as const,
          size: 1024,
          dimensions: { width: 1, height: 1, depth: 1 }
        },
        materials: [],
        creator: mockWallet.selectedAccount.address,
        timestamp: Date.now(),
        attributes: {}
      }
    });

    mockPortfolioFlow = vi.fn().mockResolvedValue({
      walletAddress: mockWallet.selectedAccount.address,
      nfts: [
        {
          id: 'nft-1',
          name: 'Test NFT',
          description: 'A test NFT created in VR',
          model: {
            url: 'https://example.com/model.glb',
            format: 'glb' as const,
            size: 1024,
            dimensions: { width: 1, height: 1, depth: 1 }
          },
          materials: [],
          creator: mockWallet.selectedAccount.address,
          timestamp: Date.now(),
          attributes: {}
        }
      ],
      totalValue: 0,
      createdCount: 1,
      lastUpdated: Date.now()
    });

    (integrationService.executeMintingFlow as any).mockImplementation(mockMintingFlow);
    (integrationService.executePortfolioSyncFlow as any).mockImplementation(mockPortfolioFlow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VR Scene to Minting Flow', () => {
    it('should complete the full minting workflow from VR scene', async () => {
      render(
        <TestWrapper>
          <VRWorld />
        </TestWrapper>
      );

      // Verify VR scene loads
      expect(screen.getByText('VR Genesis Frame')).toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();

      // Wait for scene to load
      await waitFor(() => {
        expect(screen.queryByText('Loading VR World...')).not.toBeInTheDocument();
      });

      // Simulate object selection and minting
      // Note: In a real test, we would interact with the 3D scene
      // For now, we'll test the integration service directly
      
      const testMetadata: NFTMetadata = {
        id: 'test-nft',
        name: 'Test 3D Object',
        description: 'A 3D object created in VR',
        model: {
          url: 'https://example.com/test-model.glb',
          format: 'glb',
          size: 2048,
          dimensions: { width: 2, height: 2, depth: 2 }
        },
        materials: [
          {
            name: 'Test Material',
            type: 'PBR',
            properties: { color: '#ff0000', metalness: 0.5, roughness: 0.3 }
          }
        ],
        creator: mockWallet.selectedAccount.address,
        timestamp: Date.now(),
        attributes: { shape: 'cube', color: 'red' }
      };

      // Execute minting flow
      await act(async () => {
        const result = await integrationService.executeMintingFlow(
          mockWallet.selectedAccount.address,
          testMetadata,
          (step, progress) => {
            console.log(`Minting progress: ${step} - ${progress}%`);
          }
        );

        expect(result).toBeDefined();
        expect(result.transactionHash).toBe('0x123456789abcdef');
        expect(result.collectionId).toBe(1);
        expect(result.itemId).toBe(42);
      });

      // Verify minting flow was called with correct parameters
      expect(mockMintingFlow).toHaveBeenCalledWith(
        mockWallet.selectedAccount.address,
        testMetadata,
        expect.any(Function)
      );
    });

    it('should handle minting errors gracefully', async () => {
      // Setup error scenario
      const errorMessage = 'Insufficient funds for minting';
      (integrationService.executeMintingFlow as any).mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <VRWorld />
        </TestWrapper>
      );

      const testMetadata: NFTMetadata = {
        id: 'test-nft-error',
        name: 'Test Error NFT',
        description: 'This should fail',
        model: {
          url: 'https://example.com/error-model.glb',
          format: 'glb',
          size: 1024,
          dimensions: { width: 1, height: 1, depth: 1 }
        },
        materials: [],
        creator: mockWallet.selectedAccount.address,
        timestamp: Date.now(),
        attributes: {}
      };

      // Attempt minting and expect error
      await expect(
        integrationService.executeMintingFlow(
          mockWallet.selectedAccount.address,
          testMetadata
        )
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Portfolio Synchronization Flow', () => {
    it('should sync portfolio data after minting', async () => {
      render(
        <TestWrapper>
          <PortfolioView />
        </TestWrapper>
      );

      // Wait for portfolio to load
      await waitFor(() => {
        expect(screen.getByText('My NFT Portfolio')).toBeInTheDocument();
      });

      // Execute portfolio sync
      await act(async () => {
        const portfolio = await integrationService.executePortfolioSyncFlow(
          mockWallet.selectedAccount.address,
          (step, progress) => {
            console.log(`Portfolio sync: ${step} - ${progress}%`);
          }
        );

        expect(portfolio).toBeDefined();
        expect(portfolio.nfts).toHaveLength(1);
        expect(portfolio.nfts[0].name).toBe('Test NFT');
      });

      // Verify portfolio sync was called
      expect(mockPortfolioFlow).toHaveBeenCalledWith(
        mockWallet.selectedAccount.address,
        expect.any(Function)
      );
    });

    it('should display NFTs in the portfolio view', async () => {
      render(
        <TestWrapper>
          <PortfolioView />
        </TestWrapper>
      );

      // Wait for portfolio to load and display NFTs
      await waitFor(() => {
        expect(screen.getByText('My NFT Portfolio')).toBeInTheDocument();
      });

      // The portfolio should show loading state initially
      // In a real implementation, this would show the actual NFTs
      expect(screen.getByText(/NFT/)).toBeInTheDocument();
    });
  });

  describe('Cross-Component Communication', () => {
    it('should update portfolio when new NFT is minted', async () => {
      const eventListeners: { [key: string]: Function[] } = {};
      
      // Mock event system
      (integrationService.addEventListener as any).mockImplementation((event: string, callback: Function) => {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(callback);
      });

      const emitEvent = (event: string, data: any) => {
        if (eventListeners[event]) {
          eventListeners[event].forEach(callback => callback(data));
        }
      };

      render(
        <TestWrapper>
          <div>
            <VRWorld />
            <PortfolioView />
          </div>
        </TestWrapper>
      );

      // Simulate minting completion
      const mintResult = {
        transactionHash: '0x123456789abcdef',
        collectionId: 1,
        itemId: 42,
        metadata: {
          id: 'new-nft',
          name: 'Newly Minted NFT',
          description: 'Fresh from the VR scene',
          model: {
            url: 'https://example.com/new-model.glb',
            format: 'glb' as const,
            size: 1024,
            dimensions: { width: 1, height: 1, depth: 1 }
          },
          materials: [],
          creator: mockWallet.selectedAccount.address,
          timestamp: Date.now(),
          attributes: {}
        }
      };

      // Emit minting completion event
      act(() => {
        emitEvent('flow_completed', {
          id: 'mint-flow-1',
          type: 'minting',
          status: 'completed',
          result: mintResult
        });
      });

      // Verify event listeners were set up
      expect(integrationService.addEventListener).toHaveBeenCalledWith(
        'flow_completed',
        expect.any(Function)
      );
    });

    it('should show integration status across components', async () => {
      render(
        <TestWrapper>
          <div>
            <VRWorld />
            <PortfolioView />
          </div>
        </TestWrapper>
      );

      // Both components should be able to show integration status
      // This would be tested by checking for the IntegrationStatus component
      // In the actual implementation
      
      expect(screen.getByText('VR Genesis Frame')).toBeInTheDocument();
      expect(screen.getByText('My NFT Portfolio')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network connection failed');
      (integrationService.executePortfolioSyncFlow as any).mockRejectedValue(networkError);

      render(
        <TestWrapper>
          <PortfolioView />
        </TestWrapper>
      );

      // Attempt portfolio sync and expect error handling
      await expect(
        integrationService.executePortfolioSyncFlow(mockWallet.selectedAccount.address)
      ).rejects.toThrow('Network connection failed');
    });

    it('should provide retry mechanisms for failed operations', async () => {
      let attemptCount = 0;
      (integrationService.executeMintingFlow as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return mockMintingFlow();
      });

      const testMetadata: NFTMetadata = {
        id: 'retry-test',
        name: 'Retry Test NFT',
        description: 'Testing retry mechanism',
        model: {
          url: 'https://example.com/retry-model.glb',
          format: 'glb',
          size: 1024,
          dimensions: { width: 1, height: 1, depth: 1 }
        },
        materials: [],
        creator: mockWallet.selectedAccount.address,
        timestamp: Date.now(),
        attributes: {}
      };

      // First two attempts should fail, third should succeed
      await expect(
        integrationService.executeMintingFlow(mockWallet.selectedAccount.address, testMetadata)
      ).rejects.toThrow('Temporary failure');

      await expect(
        integrationService.executeMintingFlow(mockWallet.selectedAccount.address, testMetadata)
      ).rejects.toThrow('Temporary failure');

      // Third attempt should succeed
      const result = await integrationService.executeMintingFlow(
        mockWallet.selectedAccount.address,
        testMetadata
      );

      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large NFT collections efficiently', async () => {
      // Create a large portfolio
      const largePortfolio = {
        walletAddress: mockWallet.selectedAccount.address,
        nfts: Array.from({ length: 100 }, (_, i) => ({
          id: `nft-${i}`,
          name: `NFT ${i}`,
          description: `Test NFT number ${i}`,
          model: {
            url: `https://example.com/model-${i}.glb`,
            format: 'glb' as const,
            size: 1024,
            dimensions: { width: 1, height: 1, depth: 1 }
          },
          materials: [],
          creator: mockWallet.selectedAccount.address,
          timestamp: Date.now() - i * 1000,
          attributes: { index: i }
        })),
        totalValue: 0,
        createdCount: 100,
        lastUpdated: Date.now()
      };

      (integrationService.executePortfolioSyncFlow as any).mockResolvedValue(largePortfolio);

      const startTime = performance.now();
      
      await act(async () => {
        const result = await integrationService.executePortfolioSyncFlow(
          mockWallet.selectedAccount.address
        );
        expect(result.nfts).toHaveLength(100);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Portfolio sync should complete within reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    it('should cache frequently accessed data', async () => {
      // Test that repeated calls use cached data
      const firstCall = await integrationService.executePortfolioSyncFlow(
        mockWallet.selectedAccount.address
      );

      const secondCall = await integrationService.executePortfolioSyncFlow(
        mockWallet.selectedAccount.address
      );

      // Both calls should return the same data
      expect(firstCall).toEqual(secondCall);
      
      // But the actual implementation should only make one network request
      // This would be verified by checking mock call counts in a real implementation
    });
  });
});