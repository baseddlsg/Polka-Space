import { NFTMetadata, MaterialProperty, UserPortfolio, MintTransaction } from '../../types/nft';

export const mockMaterialProperties: MaterialProperty[] = [
  {
    name: 'PBR_Material',
    type: 'PBR',
    properties: {
      baseColor: '#ff6b6b',
      metallic: 0.8,
      roughness: 0.2,
      emissive: '#000000',
    },
  },
  {
    name: 'Glass_Material',
    type: 'Standard',
    properties: {
      baseColor: '#ffffff',
      transparency: 0.9,
      refraction: 1.5,
    },
  },
];

export const mockNFTMetadata: NFTMetadata[] = [
  {
    id: 'test-nft-1',
    name: 'Abstract Sculpture #1',
    description: 'A beautiful abstract 3D sculpture created for testing',
    model: {
      url: 'https://ipfs.io/ipfs/QmTestHash1/sculpture.glb',
      format: 'glb',
      size: 2048576, // 2MB
      dimensions: {
        width: 10,
        height: 15,
        depth: 8,
      },
    },
    materials: [mockMaterialProperties[0]],
    creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // Alice's address
    timestamp: Date.now() - 86400000, // 1 day ago
    attributes: {
      category: 'sculpture',
      style: 'abstract',
      complexity: 'medium',
      renderTime: '2.3s',
    },
  },
  {
    id: 'test-nft-2',
    name: 'Geometric Vase',
    description: 'A geometric vase with intricate patterns',
    model: {
      url: 'https://ipfs.io/ipfs/QmTestHash2/vase.glb',
      format: 'glb',
      size: 1536000, // 1.5MB
      dimensions: {
        width: 6,
        height: 12,
        depth: 6,
      },
    },
    materials: [mockMaterialProperties[1]],
    creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // Bob's address
    timestamp: Date.now() - 172800000, // 2 days ago
    attributes: {
      category: 'decorative',
      style: 'geometric',
      complexity: 'high',
      renderTime: '3.1s',
    },
  },
  {
    id: 'test-nft-3',
    name: 'Minimalist Chair',
    description: 'A sleek minimalist chair design',
    model: {
      url: 'https://ipfs.io/ipfs/QmTestHash3/chair.glb',
      format: 'glb',
      size: 1024000, // 1MB
      dimensions: {
        width: 18,
        height: 32,
        depth: 20,
      },
    },
    materials: [mockMaterialProperties[0]],
    creator: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', // Charlie's address
    timestamp: Date.now() - 259200000, // 3 days ago
    attributes: {
      category: 'furniture',
      style: 'minimalist',
      complexity: 'low',
      renderTime: '1.8s',
    },
  },
];

export const mockUserPortfolios: UserPortfolio[] = [
  {
    walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    nfts: [mockNFTMetadata[0]],
    totalValue: 100,
    createdCount: 1,
    lastUpdated: Date.now(),
  },
  {
    walletAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    nfts: [mockNFTMetadata[1]],
    totalValue: 150,
    createdCount: 1,
    lastUpdated: Date.now(),
  },
  {
    walletAddress: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    nfts: [mockNFTMetadata[2]],
    totalValue: 75,
    createdCount: 1,
    lastUpdated: Date.now(),
  },
];

export const mockMintTransactions: MintTransaction[] = [
  {
    id: 'mint-tx-1',
    status: 'completed',
    metadata: mockNFTMetadata[0],
    walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    transactionHash: '0x1234567890abcdef',
    blockNumber: 1000000,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86000000,
  },
  {
    id: 'mint-tx-2',
    status: 'pending',
    metadata: {
      ...mockNFTMetadata[1],
      id: 'pending-nft-1',
      name: 'Pending Sculpture',
    },
    walletAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 1800000,
  },
  {
    id: 'mint-tx-3',
    status: 'failed',
    metadata: {
      ...mockNFTMetadata[2],
      id: 'failed-nft-1',
      name: 'Failed Mint',
    },
    walletAddress: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    error: 'Insufficient balance for transaction fees',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 3600000,
  },
];

export const mockCommunityFeed = {
  recentMints: mockNFTMetadata.slice(0, 2),
  featuredCreators: [
    '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  ],
  totalNFTs: mockNFTMetadata.length,
};

// Mock 3D model files for testing
export const mock3DModels = {
  sculpture: {
    name: 'test-sculpture.glb',
    size: 2048576,
    type: 'model/gltf-binary',
    buffer: new ArrayBuffer(2048576),
  },
  vase: {
    name: 'test-vase.glb',
    size: 1536000,
    type: 'model/gltf-binary',
    buffer: new ArrayBuffer(1536000),
  },
  chair: {
    name: 'test-chair.glb',
    size: 1024000,
    type: 'model/gltf-binary',
    buffer: new ArrayBuffer(1024000),
  },
};

// Helper functions for test data generation
export function generateRandomNFTMetadata(overrides: Partial<NFTMetadata> = {}): NFTMetadata {
  const baseMetadata = mockNFTMetadata[0];
  return {
    ...baseMetadata,
    id: `test-nft-${Math.random().toString(36).substr(2, 9)}`,
    name: `Test NFT ${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    ...overrides,
  };
}

export function generateRandomMintTransaction(overrides: Partial<MintTransaction> = {}): MintTransaction {
  return {
    id: `mint-tx-${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    metadata: generateRandomNFTMetadata(),
    walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}