/**
 * Blockchain Service - Frontend API Layer
 * 
 * This service provides a clean interface for blockchain operations
 * by calling the backend PAPI service. All blockchain interactions
 * are handled server-side for better security and performance.
 */

import { BLOCKCHAIN_CONFIG } from '@/config/blockchainConfig';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Determine if a chain is Substrate-based or EVM-compatible
 */
export function getChainType(chainId: string): 'substrate' | 'evm' {
  const SUBSTRATE_CHAINS = ['polkadot', 'kusama', 'westend', 'assethub', 'unique'];
  const EVM_CHAINS = ['moonbeam', 'moonriver', 'astar', 'shiden'];
  
  if (SUBSTRATE_CHAINS.includes(chainId)) {
    return 'substrate';
  } else if (EVM_CHAINS.includes(chainId)) {
    return 'evm';
  }
  
  throw new Error(`Unsupported chain: ${chainId}`);
}

/**
 * Get transaction URL for explorer
 */
export function getExplorerUrl(chainId: string, txHash: string): string {
  const chainConfig = BLOCKCHAIN_CONFIG[chainId];
  if (!chainConfig) {
    throw new Error(`Chain configuration not found for ${chainId}`);
  }
  
  // Format depends on the explorer
  if (txHash.startsWith('0x')) {
    return `${chainConfig.explorerUrl}tx/${txHash}`;
  } else {
    return `${chainConfig.explorerUrl}extrinsic/${txHash}`;
  }
}

/**
 * Format an address for display
 */
export function formatAddress(address: string, length: number = 4): string {
  if (!address) return '';
  if (address.length <= length * 2) return address;
  
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Get token balance for a user via backend API
 */
export async function getTokenBalance(
  chainId: string,
  address: string
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/account/${address}/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.statusText}`);
    }

    const data = await response.json();
    return data.balance?.free || '0';
  } catch (error) {
    console.error('Error fetching token balance:', error);
    throw error;
  }
}

/**
 * Mint an NFT via backend API
 */
export async function mintNFT(params: {
  ownerAddress: string;
  metadata: any;
  chainId?: string;
}): Promise<{
  transactionHash: string;
  tokenId: string;
  chainId: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ownerAddress: params.ownerAddress,
        metadata: params.metadata,
        chainId: params.chainId || 'assethub',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Minting failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      transactionHash: result.data.transactionHash,
      tokenId: result.data.itemId?.toString() || '0',
      chainId: params.chainId || 'assethub',
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
}

/**
 * Get NFTs owned by an address via backend API
 */
export async function getNFTsByOwner(address: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/portfolio/${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NFTs: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data?.nfts || [];
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }
}

/**
 * Get specific NFT information via backend API
 */
export async function getNFTInfo(
  collectionId: number,
  itemId: number
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/nft/${collectionId}/${itemId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NFT info: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching NFT info:', error);
    throw error;
  }
}

/**
 * Connect to PAPI services via backend
 */
export async function connectToPAPI(
  accountAddress: string,
  chainType: 'substrate' | 'evm' = 'substrate'
): Promise<{
  success: boolean;
  accountInfo?: any;
  supportedChains?: string[];
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/papi/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: accountAddress,
        chainType,
      }),
    });

    if (!response.ok) {
      return { success: false };
    }

    return await response.json();
  } catch (error) {
    console.error('Error connecting to PAPI:', error);
    return { success: false };
  }
}

/**
 * Disconnect from PAPI services
 */
export async function disconnectFromPAPI(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/papi/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error disconnecting from PAPI:', error);
  }
}

/**
 * Helper function for estimating gas fees (placeholder for future implementation)
 */
export async function estimateGasFee(
  chainId: string,
  operation: string
): Promise<{ gasLimit: string; gasPrice: string }> {
  // This would call a backend endpoint in a real implementation
  console.warn('Gas estimation not yet implemented');
  return {
    gasLimit: '0',
    gasPrice: '0',
  };
}

/**
 * Format balance with correct decimals
 */
export function formatBalance(balance: string, decimals: number = 12): string {
  try {
    const balanceNumber = BigInt(balance);
    const divisor = BigInt(10) ** BigInt(decimals);
    const wholePart = balanceNumber / divisor;
    const fractionalPart = balanceNumber % divisor;
    
    // Format fractional part with leading zeros
    let fractionalStr = fractionalPart.toString();
    const padding = decimals - fractionalStr.length;
    if (padding > 0) {
      fractionalStr = '0'.repeat(padding) + fractionalStr;
    }
    
    // Trim trailing zeros
    fractionalStr = fractionalStr.replace(/0+$/, '');
    
    if (fractionalStr) {
      return `${wholePart}.${fractionalStr}`;
    }
    
    return wholePart.toString();
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0';
  }
}
