import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { TEST_CONFIG, mockLocalStorage, isTestEnvironment } from './testConfig'
import { afterEach } from 'node:test'

// Ensure we're in test environment
if (!isTestEnvironment()) {
  throw new Error('Test setup should only run in test environment')
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(),
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockLocalStorage,
})

// Mock WebGL context for Three.js
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  drawArrays: vi.fn(),
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
}

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext
  }
  return null
})

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock FileReader for file uploads
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  readAsText: vi.fn(),
  onload: null,
  onerror: null,
  result: null,
}))

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock Polkadot extension and APIs
Object.defineProperty(window, 'injectedWeb3', {
  value: {
    'polkadot-js': {
      enable: vi.fn().mockResolvedValue({
        accounts: {
          get: vi.fn().mockResolvedValue(TEST_CONFIG.wallet.testAccounts),
        },
        signer: {
          signPayload: vi.fn().mockResolvedValue({
            signature: '0x' + '0'.repeat(128),
          }),
        },
      }),
    },
  },
})

// Mock backend API calls for blockchain operations
// Frontend now uses backend API instead of direct blockchain access
vi.mock('@/services/blockchainService', () => ({
  mintNFT: vi.fn().mockResolvedValue({
    transactionHash: '0x' + '0'.repeat(64),
    tokenId: '1',
    chainId: 'assethub',
  }),
  getNFTsByOwner: vi.fn().mockResolvedValue([]),
  getNFTInfo: vi.fn().mockResolvedValue({
    collectionId: 1,
    itemId: 1,
    owner: TEST_CONFIG.wallet.testAccounts[0].address,
  }),
  getTokenBalance: vi.fn().mockResolvedValue('1000000000000'),
  connectToPAPI: vi.fn().mockResolvedValue({ success: true }),
  disconnectFromPAPI: vi.fn().mockResolvedValue(undefined),
  getChainType: vi.fn().mockReturnValue('substrate'),
  getExplorerUrl: vi.fn().mockReturnValue('https://explorer.example.com/tx/0x123'),
  formatAddress: vi.fn((addr) => addr?.slice(0, 6) + '...' + addr?.slice(-4)),
  formatBalance: vi.fn((balance) => balance),
}))

// Mock Polkadot util-crypto
vi.mock('@polkadot/util-crypto', () => ({
  encodeAddress: vi.fn((address) => address),
  decodeAddress: vi.fn((address) => address),
  cryptoWaitReady: vi.fn().mockResolvedValue(true),
}))

// Mock console methods to reduce noise in tests
const originalConsole = { ...console }
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Cleanup function for tests
afterEach(() => {
  vi.clearAllMocks()
  mockLocalStorage.clear()
})

// Global test configuration
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: ({ element }: { element: React.ReactNode }) => element,
}))

// Set test timeouts
vi.setConfig({
  testTimeout: TEST_CONFIG.timeouts.render,
})