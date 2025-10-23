/**
 * Integration Service - Orchestrates complete user flows across all components
 * Connects VR scene, portfolio management, minting, and blockchain services
 */

import { toast } from "sonner";
import { NFTMetadata, MintRequest, MintResponse, UserPortfolio } from "@/types/nft";

export interface IntegrationConfig {
  backendUrl: string;
  enableAnalytics: boolean;
  enableCaching: boolean;
  retryAttempts: number;
}

export interface UserFlow {
  id: string;
  type: 'minting' | 'portfolio_sync' | 'community_discovery';
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  steps: FlowStep[];
  metadata?: any;
  startTime: number;
  endTime?: number;
}

export interface FlowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
}

class IntegrationService {
  private config: IntegrationConfig;
  private activeFlows: Map<string, UserFlow> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  /**
   * Complete minting flow from VR scene to blockchain
   */
  async executeMintingFlow(
    walletAddress: string,
    metadata: NFTMetadata,
    onProgress?: (step: string, progress: number) => void
  ): Promise<MintResponse> {
    const flowId = `mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const flow: UserFlow = {
      id: flowId,
      type: 'minting',
      status: 'started',
      steps: [
        { id: 'validate_metadata', name: 'Validate 3D Model Metadata', status: 'pending' },
        { id: 'prepare_transaction', name: 'Prepare Blockchain Transaction', status: 'pending' },
        { id: 'submit_mint', name: 'Submit Minting Request', status: 'pending' },
        { id: 'confirm_blockchain', name: 'Confirm On-Chain Registration', status: 'pending' },
        { id: 'update_portfolio', name: 'Update Portfolio Display', status: 'pending' }
      ],
      metadata: { walletAddress, nftMetadata: metadata },
      startTime: Date.now()
    };

    this.activeFlows.set(flowId, flow);
    this.emitEvent('flow_started', flow);

    try {
      // Step 1: Validate metadata
      await this.executeStep(flow, 'validate_metadata', async () => {
        onProgress?.('Validating 3D model metadata...', 20);
        await this.validateMetadata(metadata);
      });

      // Step 2: Prepare transaction
      await this.executeStep(flow, 'prepare_transaction', async () => {
        onProgress?.('Preparing blockchain transaction...', 40);
        await this.prepareTransaction(walletAddress, metadata);
      });

      // Step 3: Submit mint request
      let mintResult: MintResponse;
      await this.executeStep(flow, 'submit_mint', async () => {
        onProgress?.('Submitting minting request...', 60);
        mintResult = await this.submitMintRequest(walletAddress, metadata);
      });

      // Step 4: Confirm blockchain registration
      await this.executeStep(flow, 'confirm_blockchain', async () => {
        onProgress?.('Confirming on-chain registration...', 80);
        await this.confirmBlockchainRegistration(mintResult!.transactionHash);
      });

      // Step 5: Update portfolio
      await this.executeStep(flow, 'update_portfolio', async () => {
        onProgress?.('Updating portfolio display...', 100);
        await this.updatePortfolioCache(walletAddress);
      });

      flow.status = 'completed';
      flow.endTime = Date.now();
      this.emitEvent('flow_completed', flow);

      toast.success("NFT Minted Successfully!", {
        description: `Your 3D artwork "${metadata.name}" is now on the blockchain`
      });

      return mintResult!;

    } catch (error) {
      flow.status = 'failed';
      flow.endTime = Date.now();
      this.emitEvent('flow_failed', { flow, error });

      toast.error("Minting Failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });

      throw error;
    } finally {
      // Cleanup flow after 5 minutes
      setTimeout(() => {
        this.activeFlows.delete(flowId);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Complete portfolio synchronization flow
   */
  async executePortfolioSyncFlow(
    walletAddress: string,
    onProgress?: (step: string, progress: number) => void
  ): Promise<UserPortfolio> {
    const flowId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const flow: UserFlow = {
      id: flowId,
      type: 'portfolio_sync',
      status: 'started',
      steps: [
        { id: 'fetch_blockchain_data', name: 'Fetch Blockchain Data', status: 'pending' },
        { id: 'process_nft_metadata', name: 'Process NFT Metadata', status: 'pending' },
        { id: 'load_3d_assets', name: 'Load 3D Assets', status: 'pending' },
        { id: 'update_ui', name: 'Update User Interface', status: 'pending' }
      ],
      metadata: { walletAddress },
      startTime: Date.now()
    };

    this.activeFlows.set(flowId, flow);

    try {
      // Step 1: Fetch blockchain data
      let portfolioData: any;
      await this.executeStep(flow, 'fetch_blockchain_data', async () => {
        onProgress?.('Fetching blockchain data...', 25);
        portfolioData = await this.fetchPortfolioData(walletAddress);
      });

      // Step 2: Process NFT metadata
      await this.executeStep(flow, 'process_nft_metadata', async () => {
        onProgress?.('Processing NFT metadata...', 50);
        await this.processNFTMetadata(portfolioData.nfts);
      });

      // Step 3: Load 3D assets
      await this.executeStep(flow, 'load_3d_assets', async () => {
        onProgress?.('Loading 3D assets...', 75);
        await this.preload3DAssets(portfolioData.nfts);
      });

      // Step 4: Update UI
      await this.executeStep(flow, 'update_ui', async () => {
        onProgress?.('Updating user interface...', 100);
        this.emitEvent('portfolio_updated', portfolioData);
      });

      flow.status = 'completed';
      flow.endTime = Date.now();

      return portfolioData;

    } catch (error) {
      flow.status = 'failed';
      flow.endTime = Date.now();
      throw error;
    } finally {
      setTimeout(() => {
        this.activeFlows.delete(flowId);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Complete community discovery flow
   */
  async executeCommunityDiscoveryFlow(
    filters?: any,
    onProgress?: (step: string, progress: number) => void
  ): Promise<any> {
    const flowId = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const flow: UserFlow = {
      id: flowId,
      type: 'community_discovery',
      status: 'started',
      steps: [
        { id: 'fetch_community_data', name: 'Fetch Community Data', status: 'pending' },
        { id: 'apply_filters', name: 'Apply Filters', status: 'pending' },
        { id: 'load_previews', name: 'Load 3D Previews', status: 'pending' },
        { id: 'update_gallery', name: 'Update Gallery Display', status: 'pending' }
      ],
      metadata: { filters },
      startTime: Date.now()
    };

    this.activeFlows.set(flowId, flow);

    try {
      // Step 1: Fetch community data
      let communityData: any;
      await this.executeStep(flow, 'fetch_community_data', async () => {
        onProgress?.('Fetching community data...', 25);
        communityData = await this.fetchCommunityData();
      });

      // Step 2: Apply filters
      await this.executeStep(flow, 'apply_filters', async () => {
        onProgress?.('Applying filters...', 50);
        communityData = await this.applyFilters(communityData, filters);
      });

      // Step 3: Load previews
      await this.executeStep(flow, 'load_previews', async () => {
        onProgress?.('Loading 3D previews...', 75);
        await this.loadCommunityPreviews(communityData.recentMints);
      });

      // Step 4: Update gallery
      await this.executeStep(flow, 'update_gallery', async () => {
        onProgress?.('Updating gallery display...', 100);
        this.emitEvent('community_updated', communityData);
      });

      flow.status = 'completed';
      flow.endTime = Date.now();

      return communityData;

    } catch (error) {
      flow.status = 'failed';
      flow.endTime = Date.now();
      throw error;
    } finally {
      setTimeout(() => {
        this.activeFlows.delete(flowId);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Execute a single step within a flow
   */
  private async executeStep(
    flow: UserFlow,
    stepId: string,
    operation: () => Promise<void>
  ): Promise<void> {
    const step = flow.steps.find(s => s.id === stepId);
    if (!step) throw new Error(`Step ${stepId} not found in flow`);

    step.status = 'in_progress';
    step.startTime = Date.now();
    this.emitEvent('step_started', { flow, step });

    try {
      await operation();
      step.status = 'completed';
      step.endTime = Date.now();
      this.emitEvent('step_completed', { flow, step });
    } catch (error) {
      step.status = 'failed';
      step.endTime = Date.now();
      step.error = error instanceof Error ? error.message : 'Unknown error';
      this.emitEvent('step_failed', { flow, step, error });
      throw error;
    }
  }

  /**
   * Helper methods for individual operations
   */
  private async validateMetadata(metadata: NFTMetadata): Promise<void> {
    const response = await fetch(`${this.config.backendUrl}/api/validate-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      throw new Error('Metadata validation failed');
    }
  }

  private async prepareTransaction(walletAddress: string, metadata: NFTMetadata): Promise<void> {
    // Simulate transaction preparation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async submitMintRequest(walletAddress: string, metadata: NFTMetadata): Promise<MintResponse> {
    const mintRequest: MintRequest = {
      ownerAddress: walletAddress,
      metadata
    };

    const response = await fetch(`${this.config.backendUrl}/mint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mintRequest)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Minting request failed');
    }

    const result = await response.json();
    return result.data;
  }

  private async confirmBlockchainRegistration(transactionHash: string): Promise<void> {
    // Poll for transaction confirmation
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check transaction status (mock implementation)
      const confirmed = Math.random() > 0.1; // 90% chance of confirmation each attempt
      
      if (confirmed) {
        return;
      }
      
      attempts++;
    }

    throw new Error('Transaction confirmation timeout');
  }

  private async updatePortfolioCache(walletAddress: string): Promise<void> {
    // Invalidate cache to force refresh
    await fetch(`${this.config.backendUrl}/api/cache/invalidate/portfolio/${walletAddress}`, {
      method: 'POST'
    });
  }

  private async fetchPortfolioData(walletAddress: string): Promise<UserPortfolio> {
    const response = await fetch(`${this.config.backendUrl}/portfolio/${walletAddress}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio data');
    }

    const result = await response.json();
    return result.data;
  }

  private async processNFTMetadata(nfts: NFTMetadata[]): Promise<void> {
    // Process metadata for display optimization
    await Promise.all(nfts.map(async (nft) => {
      // Validate and optimize metadata
      if (nft.model?.url) {
        // Preprocess 3D model metadata
        await this.preprocessModelMetadata(nft);
      }
    }));
  }

  private async preload3DAssets(nfts: NFTMetadata[]): Promise<void> {
    // Preload critical 3D assets
    const preloadPromises = nfts.slice(0, 5).map(async (nft) => {
      if (nft.model?.url) {
        try {
          // Preload model for faster rendering
          await this.preloadModel(nft.model.url);
        } catch (error) {
          console.warn(`Failed to preload model for NFT ${nft.id}:`, error);
        }
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  private async fetchCommunityData(): Promise<any> {
    const response = await fetch(`${this.config.backendUrl}/community`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch community data');
    }

    return await response.json();
  }

  private async applyFilters(data: any, filters?: any): Promise<any> {
    if (!filters) return data;

    // Apply client-side filtering
    let filteredData = { ...data };

    if (filters.creator) {
      filteredData.recentMints = data.recentMints.filter((nft: NFTMetadata) => 
        nft.creator?.toLowerCase().includes(filters.creator.toLowerCase())
      );
    }

    if (filters.format) {
      filteredData.recentMints = filteredData.recentMints.filter((nft: NFTMetadata) => 
        nft.model?.format === filters.format
      );
    }

    return filteredData;
  }

  private async loadCommunityPreviews(nfts: NFTMetadata[]): Promise<void> {
    // Load preview thumbnails for community gallery
    const previewPromises = nfts.slice(0, 10).map(async (nft) => {
      if (nft.model?.url) {
        try {
          await this.generatePreview(nft.model.url);
        } catch (error) {
          console.warn(`Failed to generate preview for NFT ${nft.id}:`, error);
        }
      }
    });

    await Promise.allSettled(previewPromises);
  }

  private async preprocessModelMetadata(nft: NFTMetadata): Promise<void> {
    // Simulate metadata preprocessing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async preloadModel(url: string): Promise<void> {
    // Simulate model preloading
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private async generatePreview(url: string): Promise<void> {
    // Simulate preview generation
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  /**
   * Event system for cross-component communication
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get active flows for monitoring
   */
  getActiveFlows(): UserFlow[] {
    return Array.from(this.activeFlows.values());
  }

  /**
   * Get flow by ID
   */
  getFlow(flowId: string): UserFlow | undefined {
    return this.activeFlows.get(flowId);
  }
}

// Create singleton instance
export const integrationService = new IntegrationService({
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  enableAnalytics: true,
  enableCaching: true,
  retryAttempts: 3
});

export default integrationService;