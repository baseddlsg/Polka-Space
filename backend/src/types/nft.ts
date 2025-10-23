/**
 * NFT-related type definitions
 */

export interface NFTMetadata {
  id: string;
  name: string;
  description: string;
  model: {
    url: string;
    format: 'glb' | 'gltf';
    size: number;
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  };
  materials: MaterialProperty[];
  creator: string;
  timestamp: number;
  attributes: Record<string, any>;
}

export interface MaterialProperty {
  name: string;
  type: 'PBR' | 'Standard' | 'Custom';
  properties: Record<string, any>;
}

export interface UserPortfolio {
  walletAddress: string;
  nfts: NFTMetadata[];
  totalValue: number;
  createdCount: number;
  lastUpdated: number;
}

export interface CommunityFeed {
  recentMints: NFTMetadata[];
  featuredCreators: string[];
  totalNFTs: number;
}

export interface MintTransaction {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: NFTMetadata;
  walletAddress: string;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MintRequest {
  ownerAddress: string;
  metadata: Partial<NFTMetadata>;
}

export interface MintResponse {
  transactionHash: string;
  collectionId: number;
  itemId: number;
  metadata: NFTMetadata;
}

export interface NFTInfo {
  collectionId: number;
  itemId: number;
  owner: string;
  metadata?: NFTMetadata;
}