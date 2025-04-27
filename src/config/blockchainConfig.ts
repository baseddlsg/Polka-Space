// Blockchain configurations for the VR Genesis Frame application
// This file contains RPC endpoints, contract addresses, and other chain-specific settings

interface ChainConfig {
  name: string;
  networkId: string | number;
  rpcUrl: string;
  explorerUrl: string;
  tokenSymbol: string;
  decimals: number;
  logo: string;
  contractAddress?: string;
  nftContractAddress?: string;
  isTestnet: boolean;
  blockTime: number; // in seconds
}

interface BlockchainConfig {
  [key: string]: ChainConfig;
}

// Get blockchain configuration from environment variables with fallbacks
const getEnvVar = (key: string, fallback: string): string => 
  import.meta.env[key] || fallback;

// Define our supported blockchains
export const BLOCKCHAIN_CONFIG: BlockchainConfig = {
  unique: {
    name: "Unique Network",
    networkId: "quartz", // Quartz is the production network
    rpcUrl: getEnvVar("VITE_UNIQUE_NETWORK_RPC_URL", "wss://quartz.unique.network"),
    explorerUrl: getEnvVar("VITE_UNIQUE_EXPLORER_URL", "https://uniquescan.io/quartz/"),
    tokenSymbol: "QTZ",
    decimals: 18,
    logo: "/blockchain-logos/unique.svg",
    nftContractAddress: getEnvVar("VITE_UNIQUE_NFT_CONTRACT", ""),
    isTestnet: false,
    blockTime: 6
  },
  uniqueTest: {
    name: "Unique Testnet",
    networkId: "opal",
    rpcUrl: getEnvVar("VITE_UNIQUE_TESTNET_RPC_URL", "wss://opal.unique.network"),
    explorerUrl: getEnvVar("VITE_UNIQUE_TESTNET_EXPLORER_URL", "https://uniquescan.io/opal/"),
    tokenSymbol: "OPL",
    decimals: 18,
    logo: "/blockchain-logos/unique.svg",
    nftContractAddress: getEnvVar("VITE_UNIQUE_TESTNET_NFT_CONTRACT", ""),
    isTestnet: true,
    blockTime: 6
  },
  moonbeam: {
    name: "Moonbeam",
    networkId: 1284,
    rpcUrl: getEnvVar("VITE_MOONBEAM_RPC_URL", "https://rpc.api.moonbeam.network"),
    explorerUrl: getEnvVar("VITE_MOONBEAM_EXPLORER_URL", "https://moonbeam.moonscan.io/"),
    tokenSymbol: "GLMR",
    decimals: 18,
    logo: "/blockchain-logos/moonbeam.svg",
    nftContractAddress: getEnvVar("VITE_MOONBEAM_NFT_CONTRACT", ""),
    isTestnet: false,
    blockTime: 12
  },
  moonbaseAlpha: {
    name: "Moonbase Alpha",
    networkId: 1287,
    rpcUrl: getEnvVar("VITE_MOONBASE_RPC_URL", "https://rpc.api.moonbase.moonbeam.network"),
    explorerUrl: getEnvVar("VITE_MOONBASE_EXPLORER_URL", "https://moonbase.moonscan.io/"),
    tokenSymbol: "DEV",
    decimals: 18,
    logo: "/blockchain-logos/moonbeam.svg",
    nftContractAddress: getEnvVar("VITE_MOONBASE_NFT_CONTRACT", ""),
    isTestnet: true,
    blockTime: 12
  },
  astar: {
    name: "Astar Network",
    networkId: 592,
    rpcUrl: getEnvVar("VITE_ASTAR_RPC_URL", "https://astar.api.onfinality.io/public"),
    explorerUrl: getEnvVar("VITE_ASTAR_EXPLORER_URL", "https://astar.subscan.io/"),
    tokenSymbol: "ASTR",
    decimals: 18,
    logo: "/blockchain-logos/astar.svg",
    nftContractAddress: getEnvVar("VITE_ASTAR_NFT_CONTRACT", ""),
    isTestnet: false,
    blockTime: 12
  },
  shibuya: {
    name: "Shibuya Testnet",
    networkId: 81,
    rpcUrl: getEnvVar("VITE_SHIBUYA_RPC_URL", "https://shibuya.public.blastapi.io"),
    explorerUrl: getEnvVar("VITE_SHIBUYA_EXPLORER_URL", "https://shibuya.subscan.io/"),
    tokenSymbol: "SBY",
    decimals: 18,
    logo: "/blockchain-logos/astar.svg",
    nftContractAddress: getEnvVar("VITE_SHIBUYA_NFT_CONTRACT", ""),
    isTestnet: true,
    blockTime: 12
  }
};

// Group chains by type
export const SUBSTRATE_CHAINS = ['unique', 'uniqueTest'];
export const EVM_CHAINS = ['moonbeam', 'moonbaseAlpha', 'astar', 'shibuya'];

// Default chain by environment
export const DEFAULT_CHAIN = import.meta.env.MODE === 'production' 
  ? 'unique' 
  : 'uniqueTest';

// ABI for NFT contracts
export const NFT_CONTRACT_ABI = [
  // ERC-721 standard functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  
  // Minting function
  "function mintToken(address owner, string memory metadataURI) external returns (uint256)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event NFTMinted(address indexed owner, uint256 tokenId, string tokenURI)"
];

// IPFS Gateway Configuration
export const IPFS_CONFIG = {
  nftStorageApiKey: getEnvVar("VITE_NFT_STORAGE_API_KEY", ""),
  pinataApiKey: getEnvVar("VITE_PINATA_API_KEY", ""),
  pinataSecretKey: getEnvVar("VITE_PINATA_SECRET_KEY", ""),
  ipfsGateway: getEnvVar("VITE_IPFS_GATEWAY", "https://ipfs.io/ipfs/")
};

// For development/testing, you can use these values:
export const DEVELOPMENT = {
  // Test accounts for UNIQUE Network (Opal testnet)
  testAccounts: {
    alice: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    bob: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
  }
}; 