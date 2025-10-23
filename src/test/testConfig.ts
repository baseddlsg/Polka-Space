// Test configuration for frontend components
export const TEST_CONFIG = {
  // Mock API endpoints
  api: {
    baseUrl: 'http://localhost:3001',
    endpoints: {
      mint: '/api/mint',
      portfolio: '/api/portfolio',
      community: '/api/community',
      status: '/api/mint/status',
    },
  },
  
  // Mock wallet configuration
  wallet: {
    testAccounts: [
      {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        name: 'Test Server Account',
      },
      {
        address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        name: 'Test User Account',
      },
      {
        address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
        name: 'Test Creator Account',
      },
    ],
  },
  
  // Test timeouts and delays
  timeouts: {
    render: 5000,
    interaction: 1000,
    api: 10000,
    blockchain: 30000,
  },
  
  // Performance thresholds
  performance: {
    maxRenderTime: 100, // ms
    maxApiResponseTime: 2000, // ms
    maxBlockchainResponseTime: 10000, // ms
  },
  
  // Test data limits
  limits: {
    maxNFTsInPortfolio: 100,
    maxCommunityFeedItems: 50,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
};

// Mock 3D models for testing
export const MOCK_3D_MODELS = [
  {
    name: 'Test Cube',
    url: '/models/test-cube.glb',
    size: 1024,
    dimensions: { width: 2, height: 2, depth: 2 },
  },
  {
    name: 'Test Sculpture',
    url: '/models/test-sculpture.glb',
    size: 2048576,
    dimensions: { width: 10, height: 15, depth: 8 },
  },
  {
    name: 'Test Vase',
    url: '/models/test-vase.glb',
    size: 1536000,
    dimensions: { width: 6, height: 12, depth: 6 },
  },
];

// Mock NFT data for frontend testing
export const MOCK_NFT_DATA = [
  {
    id: 'test-nft-1',
    name: 'Abstract Sculpture #1',
    description: 'A beautiful abstract 3D sculpture',
    model: MOCK_3D_MODELS[1],
    creator: TEST_CONFIG.wallet.testAccounts[0].address,
    timestamp: Date.now() - 86400000,
    attributes: {
      category: 'sculpture',
      style: 'abstract',
    },
  },
  {
    id: 'test-nft-2',
    name: 'Geometric Vase',
    description: 'A geometric vase with patterns',
    model: MOCK_3D_MODELS[2],
    creator: TEST_CONFIG.wallet.testAccounts[1].address,
    timestamp: Date.now() - 172800000,
    attributes: {
      category: 'decorative',
      style: 'geometric',
    },
  },
];

// Test environment detection
export const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' || 
         process.env.VITEST === 'true' ||
         typeof global.it === 'function';
};

// Mock localStorage for tests
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock fetch for API testing
export const createMockFetch = (responses: Record<string, any>) => {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    const key = `${method} ${url}`;
    
    if (responses[key]) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responses[key]),
        text: () => Promise.resolve(JSON.stringify(responses[key])),
      });
    }
    
    return Promise.reject(new Error(`No mock response for ${key}`));
  });
};

// Helper to create mock wallet context
export const createMockWalletContext = (overrides = {}) => ({
  account: null,
  accounts: TEST_CONFIG.wallet.testAccounts,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  selectAccount: vi.fn(),
  ...overrides,
});

// Helper to create mock portfolio data
export const createMockPortfolio = (address: string, nftCount = 2) => ({
  walletAddress: address,
  nfts: MOCK_NFT_DATA.slice(0, nftCount),
  totalValue: nftCount * 100,
  createdCount: nftCount,
  lastUpdated: Date.now(),
});

// Helper to wait for async operations in tests
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to simulate user interactions
export const simulateUserInteraction = async (element: HTMLElement, action: 'click' | 'hover' | 'focus') => {
  const { fireEvent } = await import('@testing-library/react');
  
  switch (action) {
    case 'click':
      fireEvent.click(element);
      break;
    case 'hover':
      fireEvent.mouseEnter(element);
      break;
    case 'focus':
      fireEvent.focus(element);
      break;
  }
  
  // Wait for any async updates
  await waitFor(100);
};