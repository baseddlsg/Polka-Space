import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { web3FromSource } from '@polkadot/extension-dapp';
import { ethers } from 'ethers';
import { 
  BLOCKCHAIN_CONFIG, 
  SUBSTRATE_CHAINS, 
  EVM_CHAINS,
  NFT_CONTRACT_ABI
} from '@/config/blockchainConfig';

// Cache for API instances to avoid redundant connections
const apiCache: Record<string, ApiPromise> = {};
const providerCache: Record<string, ethers.JsonRpcProvider> = {};

/**
 * Get a Polkadot API connection for Substrate-based chains
 * @param chainId The chain ID to connect to
 * @returns ApiPromise instance
 */
export async function getPolkadotApi(chainId: string): Promise<ApiPromise> {
  // Return from cache if available
  if (apiCache[chainId]) {
    const api = apiCache[chainId];
    
    // Check if the connection is still alive
    if (api.isConnected) {
      return api;
    }
    
    // If disconnected, clean up and reconnect
    await api.disconnect();
    delete apiCache[chainId];
  }
  
  // Get chain config
  const chainConfig = BLOCKCHAIN_CONFIG[chainId];
  if (!chainConfig) {
    throw new Error(`Chain configuration not found for ${chainId}`);
  }
  
  // Create new provider and API
  const provider = new WsProvider(chainConfig.rpcUrl);
  const api = await ApiPromise.create({ provider });
  
  // Store in cache
  apiCache[chainId] = api;
  
  return api;
}

/**
 * Get an Ethereum provider for EVM-compatible chains
 * @param chainId The chain ID to connect to
 * @returns ethers.JsonRpcProvider instance
 */
export function getEthereumProvider(chainId: string): ethers.JsonRpcProvider {
  // Return from cache if available
  if (providerCache[chainId]) {
    return providerCache[chainId];
  }
  
  // Get chain config
  const chainConfig = BLOCKCHAIN_CONFIG[chainId];
  if (!chainConfig) {
    throw new Error(`Chain configuration not found for ${chainId}`);
  }
  
  // Create new provider
  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  
  // Store in cache
  providerCache[chainId] = provider;
  
  return provider;
}

/**
 * Determine if a chain is Substrate-based or EVM-compatible
 * @param chainId The chain ID to check
 * @returns 'substrate' or 'evm'
 */
export function getChainType(chainId: string): 'substrate' | 'evm' {
  if (SUBSTRATE_CHAINS.includes(chainId)) {
    return 'substrate';
  } else if (EVM_CHAINS.includes(chainId)) {
    return 'evm';
  }
  
  throw new Error(`Unsupported chain: ${chainId}`);
}

/**
 * Get the NFT contract for a specific chain
 * @param chainId The chain ID
 * @param account The user account for transaction signing
 * @returns Contract instance
 */
export async function getNFTContract(
  chainId: string, 
  account: any
): Promise<ContractPromise | ethers.Contract> {
  const chainConfig = BLOCKCHAIN_CONFIG[chainId];
  if (!chainConfig || !chainConfig.nftContractAddress) {
    throw new Error(`NFT contract not configured for chain ${chainId}`);
  }
  
  const chainType = getChainType(chainId);
  
  if (chainType === 'substrate') {
    // Substrate chain - use Polkadot.js
    const api = await getPolkadotApi(chainId);
    
    // Note: In a real implementation, you would need the contract ABI JSON
    // This is a simplified example
    const contractAbi = {} as any; // Replace with actual ABI
    
    return new ContractPromise(
      api, 
      contractAbi, 
      chainConfig.nftContractAddress
    );
  } else {
    // EVM chain - use ethers.js
    const provider = getEthereumProvider(chainId);
    
    // Connect with signer if account is provided
    if (account && account.address) {
      // For MetaMask/EVM wallets, we would use the injected provider
      // This is a simplified example
      const signer = await provider.getSigner(account.address);
      return new ethers.Contract(
        chainConfig.nftContractAddress, 
        NFT_CONTRACT_ABI, 
        signer
      );
    }
    
    // Read-only mode without signer
    return new ethers.Contract(
      chainConfig.nftContractAddress, 
      NFT_CONTRACT_ABI, 
      provider
    );
  }
}

/**
 * Get transaction URL for explorer
 * @param chainId The chain ID
 * @param txHash Transaction hash
 * @returns Explorer URL for the transaction
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
 * @param address The full address
 * @param length Number of characters to display at start and end
 * @returns Shortened address with ellipsis
 */
export function formatAddress(address: string, length: number = 4): string {
  if (!address) return '';
  if (address.length <= length * 2) return address;
  
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Mint an NFT on Substrate chains using Unique Network/RMRK standard
 * @param contract Contract instance
 * @param ownerAddress Owner's address
 * @param metadataUri IPFS metadata URI
 * @param account Account with signer
 * @returns Transaction result
 */
export async function mintSubstrateNFT(
  contract: ContractPromise,
  ownerAddress: string,
  metadataUri: string,
  account: any
): Promise<any> {
  // Get the injector and signer from the account source
  const injector = await web3FromSource(account.meta.source);
  
  // The actual function name and parameters depend on your specific contract
  // This is a simplified example
  const tx = await contract.tx.mintNft(
    { gasLimit: -1 },
    ownerAddress,
    metadataUri
  );
  
  // Sign and send the transaction
  const txResult = await tx.signAndSend(account.address, { signer: injector.signer });
  
  return txResult;
}

/**
 * Mint an NFT on EVM chains using ERC-721 standard
 * @param contract Contract instance
 * @param ownerAddress Owner's address
 * @param metadataUri IPFS metadata URI
 * @returns Transaction result
 */
export async function mintEvmNFT(
  contract: ethers.Contract,
  ownerAddress: string,
  metadataUri: string
): Promise<any> {
  // Call the mint function - name depends on your contract
  const tx = await contract.mintToken(ownerAddress, metadataUri);
  
  // Wait for transaction to be mined
  const receipt = await tx.wait();
  
  return receipt;
}

/**
 * Helper function for estimating gas fees on EVM chains
 * @param chainId Chain ID
 * @param contractMethod Contract method to estimate
 * @param params Parameters for the method
 * @returns Estimated gas limit and price
 */
export async function estimateGasFee(
  chainId: string,
  contractMethod: any,
  params: any[]
): Promise<{gasLimit: ethers.BigNumberish, gasPrice: ethers.BigNumberish}> {
  try {
    const provider = getEthereumProvider(chainId);
    
    // Estimate gas limit
    const gasLimit = await contractMethod.estimateGas(...params);
    
    // Get current gas price
    const gasPrice = await provider.getFeeData();
    
    return {
      gasLimit: gasLimit,
      gasPrice: gasPrice.gasPrice || 0
    };
  } catch (error) {
    console.error('Error estimating gas fee:', error);
    throw error;
  }
}

/**
 * Get token balance for a user
 * @param chainId Chain ID
 * @param address User address
 * @returns Token balance with proper decimals
 */
export async function getTokenBalance(
  chainId: string,
  address: string
): Promise<string> {
  const chainConfig = BLOCKCHAIN_CONFIG[chainId];
  if (!chainConfig) {
    throw new Error(`Chain configuration not found for ${chainId}`);
  }
  
  const chainType = getChainType(chainId);
  
  if (chainType === 'substrate') {
    // Substrate chain
    const api = await getPolkadotApi(chainId);
    const { data: balance } = await api.query.system.account(address);
    const free = balance.free.toString();
    
    // Format with correct decimals
    return formatBalance(free, chainConfig.decimals);
  } else {
    // EVM chain
    const provider = getEthereumProvider(chainId);
    const balance = await provider.getBalance(address);
    
    // Format with correct decimals
    return formatBalance(balance.toString(), chainConfig.decimals);
  }
}

/**
 * Format balance with correct decimals
 * @param balance Raw balance as string
 * @param decimals Number of decimals
 * @returns Formatted balance
 */
function formatBalance(balance: string, decimals: number): string {
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
} 