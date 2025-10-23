import { PAPIClient, getAssetHubClient } from './papiClient';
import { WalletAdapter } from './walletAdapter';
import { ChainQueries } from './chainQueries';

export interface PAPIServiceConfig {
  enabledChains: string[];
  defaultChain: string;
}

export class PAPIService {
  private clients: Map<string, PAPIClient> = new Map();
  private walletAdapter: WalletAdapter | null = null;
  private chainQueries: ChainQueries | null = null;
  private config: PAPIServiceConfig;

  constructor(config: PAPIServiceConfig) {
    this.config = config;
  }

  /**
   * Initialize the PAPI service with all required clients
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing PAPI Service...');

      // Initialize AssetHub client
      const assetHubClient = await getAssetHubClient();
      this.clients.set('assethub', assetHubClient);

      // Initialize wallet adapter
      this.walletAdapter = new WalletAdapter(assetHubClient);
      await this.walletAdapter.initialize();

      // Initialize chain queries
      this.chainQueries = new ChainQueries(assetHubClient);

      console.log('PAPI Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PAPI Service:', error);
      throw error;
    }
  }

  /**
   * Connect a user account to PAPI services
   */
  async connectAccount(accountAddress: string, chainType: 'substrate' | 'evm'): Promise<{
    success: boolean;
    accountInfo?: any;
    supportedChains?: string[];
  }> {
    try {
      if (!this.walletAdapter) {
        throw new Error('PAPI Service not initialized');
      }

      // Validate the account address
      if (chainType === 'substrate' && !this.walletAdapter.validateAddress(accountAddress)) {
        throw new Error('Invalid Substrate address');
      }

      // Get account information from the chain
      const accountInfo = await this.getAccountInfo(accountAddress);

      return {
        success: true,
        accountInfo,
        supportedChains: this.config.enabledChains
      };
    } catch (error) {
      console.error('Failed to connect account to PAPI:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Get account information from the blockchain
   */
  async getAccountInfo(address: string): Promise<any> {
    if (!this.chainQueries) {
      throw new Error('Chain queries not initialized');
    }

    try {
      const balance = await this.chainQueries.getAccountBalance(address);
      const nonce = await this.chainQueries.getAccountNonce(address);

      return {
        address,
        balance,
        nonce,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  /**
   * Get NFTs owned by an account across supported chains
   */
  async getAccountNFTs(address: string): Promise<any[]> {
    if (!this.chainQueries) {
      throw new Error('Chain queries not initialized');
    }

    try {
      // Query NFTs from AssetHub
      const assetHubNFTs = await this.chainQueries.getNFTsByOwner(address);
      
      // Format and return NFTs
      return assetHubNFTs.map(nft => ({
        ...nft,
        chain: 'assethub',
        chainName: 'Asset Hub'
      }));
    } catch (error) {
      console.error('Failed to get account NFTs:', error);
      return [];
    }
  }

  /**
   * Mint an NFT using PAPI
   */
  async mintNFT(params: {
    ownerAddress: string;
    metadataUrl: string;
    collectionId?: number;
    chainId?: string;
  }): Promise<{
    success: boolean;
    transactionHash?: string;
    tokenId?: string;
    error?: string;
  }> {
    try {
      if (!this.walletAdapter || !this.chainQueries) {
        throw new Error('PAPI Service not initialized');
      }

      const { ownerAddress, metadataUrl, collectionId = 1, chainId = 'assethub' } = params;

      // Get the appropriate client
      const client = this.clients.get(chainId);
      if (!client) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      // Use server account for minting (in production, this would be signed by user)
      const serverAccount = this.walletAdapter.getServerAccount();

      // Create the mint transaction
      const result = await this.chainQueries.mintNFT({
        collectionId,
        itemId: Date.now(), // Simple item ID generation
        owner: ownerAddress,
        metadata: metadataUrl,
        signer: serverAccount
      });

      return {
        success: true,
        transactionHash: result.txHash,
        tokenId: result.itemId?.toString()
      };
    } catch (error) {
      console.error('Failed to mint NFT via PAPI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Transfer an NFT using PAPI
   */
  async transferNFT(params: {
    fromAddress: string;
    toAddress: string;
    collectionId: number;
    itemId: number;
    chainId?: string;
  }): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      if (!this.chainQueries) {
        throw new Error('PAPI Service not initialized');
      }

      const result = await this.chainQueries.transferNFT(params);

      return {
        success: true,
        transactionHash: result.txHash
      };
    } catch (error) {
      console.error('Failed to transfer NFT via PAPI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a specific client by chain ID
   */
  getClient(chainId: string): PAPIClient | undefined {
    return this.clients.get(chainId);
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return this.walletAdapter !== null && this.chainQueries !== null;
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up PAPI Service...');
    
    for (const [chainId, client] of this.clients) {
      try {
        await client.disconnect();
        console.log(`Disconnected from ${chainId}`);
      } catch (error) {
        console.error(`Error disconnecting from ${chainId}:`, error);
      }
    }
    
    this.clients.clear();
    this.walletAdapter = null;
    this.chainQueries = null;
    
    console.log('PAPI Service cleanup completed');
  }
}

// Singleton instance
let papiService: PAPIService | null = null;

/**
 * Get or create the PAPI service instance
 */
export function getPAPIService(): PAPIService {
  if (!papiService) {
    papiService = new PAPIService({
      enabledChains: ['assethub', 'unique', 'astar'],
      defaultChain: 'assethub'
    });
  }
  return papiService;
}

/**
 * Initialize the global PAPI service
 */
export async function initializePAPIService(): Promise<PAPIService> {
  const service = getPAPIService();
  await service.initialize();
  return service;
}