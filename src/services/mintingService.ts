import { toast } from 'sonner';
import { 
  getChainType, 
  getNFTContract, 
  mintSubstrateNFT,
  mintEvmNFT,
  getExplorerUrl,
  estimateGasFee
} from './blockchainService';
import { 
  generate3DPreview, 
  storeModelToIPFS, 
  storeNFTMetadata 
} from './ipfsService';
import { BLOCKCHAIN_CONFIG } from '@/config/blockchainConfig';
import { ContractPromise } from '@polkadot/api-contract';
import { ethers } from 'ethers';

interface MintRequest {
  ownerAddress: string;
  objectDetails: {
    shape?: string;
    color?: string;
    scale?: number;
    modelUrl?: string;
    name?: string;
    metadata?: Record<string, any>;
  };
  chainId: string; // 'unique' | 'moonbeam' | 'astar' or their testnet equivalents
  account: any; // Account with signer information
}

interface MintResponse {
  transactionHash: string;
  tokenId: string;
  chainId: string;
  explorerUrl: string;
  metadataUrl: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// Chain configuration
const CHAIN_CONFIG = {
  unique: {
    rpcUrl: 'https://rpc.unique.network',
    explorerUrl: 'https://uniquescan.io/tx/',
    name: 'Unique Network'
  },
  moonbeam: {
    rpcUrl: 'https://rpc.api.moonbeam.network',
    explorerUrl: 'https://moonbeam.moonscan.io/tx/',
    name: 'Moonbeam'
  },
  astar: {
    rpcUrl: 'https://rpc.astar.network:8545',
    explorerUrl: 'https://astar.subscan.io/tx/',
    name: 'Astar Network'
  }
};

/**
 * Mint an NFT on the selected blockchain
 */
export async function mintNFT(request: MintRequest): Promise<MintResponse> {
  const { ownerAddress, objectDetails, chainId, account } = request;
  console.log(`Minting NFT on ${chainId}`, request);
  
  try {
    // 1. Generate a preview image for the NFT
    const previewImage = await generate3DPreview(objectDetails);
    
    // 2. If it's a 3D model, upload it to IPFS
    let modelIPFSUrl: string | undefined;
    if (objectDetails.modelUrl) {
      modelIPFSUrl = await storeModelToIPFS(
        objectDetails.modelUrl,
        `${objectDetails.name || 'model'}.glb`
      );
    }
    
    // 3. Prepare metadata for the NFT
    const metadata = {
      name: objectDetails.name || `${objectDetails.shape || 'Model'} NFT`,
      description: `A 3D object created in VR Genesis Frame on ${BLOCKCHAIN_CONFIG[chainId].name}`,
      image: previewImage,
      animation_url: modelIPFSUrl,
      properties: {
        type: objectDetails.modelUrl ? 'model' : (objectDetails.shape || 'box'),
        color: objectDetails.color,
        scale: objectDetails.scale,
        ...objectDetails.metadata
      }
    };
    
    // 4. Upload metadata to IPFS
    const metadataUrl = await storeNFTMetadata(metadata);
    
    // 5. Determine chain type
    const chainType = getChainType(chainId);
    
    // 6. Get the NFT contract for the selected chain
    const contract = await getNFTContract(chainId, account);
    
    // 7. Mint the NFT
    let transactionHash: string;
    let tokenId: string;
    
    if (chainType === 'substrate') {
      // Mint on Substrate chain (Unique Network, etc.)
      // Use type assertion to ensure contract is of the correct type
      const substrateContract = contract as ContractPromise;
      
      const result = await mintSubstrateNFT(
        substrateContract,
        ownerAddress,
        metadataUrl,
        account
      );
      
      // Extract transaction hash and token ID from result
      // The exact structure depends on the chain and contract
      transactionHash = result.txHash || result.hash || '';
      tokenId = extractTokenIdFromSubstrateResult(result);
    } else {
      // Mint on EVM chain (Moonbeam, Astar, etc.)
      // Use type assertion to ensure contract is of the correct type
      const evmContract = contract as ethers.Contract;
      
      const result = await mintEvmNFT(
        evmContract,
        ownerAddress,
        metadataUrl
      );
      
      // Extract transaction hash and token ID from result
      transactionHash = result.hash;
      tokenId = extractTokenIdFromEvmResult(result);
    }
    
    return {
      transactionHash,
      tokenId,
      chainId,
      explorerUrl: getExplorerUrl(chainId, transactionHash),
      metadataUrl
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    throw new Error(error instanceof Error ? error.message : 'Failed to mint NFT');
  }
}

/**
 * Extract token ID from Substrate transaction result
 * @param result Transaction result
 * @returns Token ID
 */
function extractTokenIdFromSubstrateResult(result: any): string {
  // This implementation depends on the specific contract and chain
  // For demonstration, we'll return a mock value
  // In reality, you'd parse the transaction events
  
  try {
    // Check if result has an events array
    if (result.events && Array.isArray(result.events)) {
      // Look for NFT minted event
      const mintEvent = result.events.find((event: any) => 
        event.event && 
        event.event.method === 'NFTMinted' || 
        event.event.method === 'Created' ||
        event.event.method === 'Transfer'
      );
      
      if (mintEvent && mintEvent.event.data) {
        // Extract token ID from event data - format depends on the contract
        return mintEvent.event.data[1]?.toString() || 
               mintEvent.event.data.tokenId?.toString() || 
               mintEvent.event.data[0]?.toString() || 
               '0';
      }
    }
    
    // Fallback to random ID for testing
    return Math.floor(Math.random() * 1000000).toString();
  } catch (error) {
    console.error('Error extracting token ID from Substrate result:', error);
    return Math.floor(Math.random() * 1000000).toString();
  }
}

/**
 * Extract token ID from EVM transaction result
 * @param result Transaction receipt
 * @returns Token ID
 */
function extractTokenIdFromEvmResult(result: any): string {
  try {
    // Parse the transaction logs to find the NFTMinted or Transfer event
    if (result.logs && Array.isArray(result.logs)) {
      // For ERC-721, typically there's a Transfer event
      // The third topic is the token ID (after the from and to addresses)
      // This assumes the standard ERC-721 Transfer event
      for (const log of result.logs) {
        // Check for Transfer event
        if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          // This is the Transfer event
          // The token ID is the third topic
          if (log.topics[3]) {
            // Convert from hex and remove leading zeros
            return parseInt(log.topics[3], 16).toString();
          }
        }
        
        // Check for custom NFTMinted event
        // The format depends on your contract
        if (log.topics[0] === '0x7df4fb99994dbdc265d1387e6268f68f3c8b2c0ee11375894780e55351cc8997') {
          // Parse the event data to extract token ID
          // The format depends on your contract
          if (log.data) {
            // For simplicity, we'll just return a substring of the data
            // In reality, you'd properly decode the ABI-encoded data
            return parseInt(log.data.slice(2, 66), 16).toString();
          }
        }
      }
    }
    
    // Fallback to random ID for testing
    return Math.floor(Math.random() * 1000000).toString();
  } catch (error) {
    console.error('Error extracting token ID from EVM result:', error);
    return Math.floor(Math.random() * 1000000).toString();
  }
}

/**
 * Get all NFTs owned by an address across supported chains
 */
export async function fetchUserNFTs(address: string): Promise<any[]> {
  console.log(`Fetching NFTs for address: ${address}`);
  
  try {
    // In a real implementation, you would:
    // 1. Query NFTs from each supported chain
    // 2. Parse and normalize the results
    // 3. Combine and return them
    
    // For now, we'll use mock data for demonstration
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock data
    return Array.from({length: 6}, (_, i) => ({
      id: `nft-${i+1}`,
      name: ['Designer Chair', 'Modern Sculpture', 'Yellow Duck', 
             'Plant Collection', 'Luxury Table', 'Modern Lamp'][i],
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(['chair','sculpture','duck','plant','table','lamp'][i])}-nft&background=6D28D9&color=fff`,
      chain: ['unique', 'astar', 'moonbeam', 'unique', 'astar', 'moonbeam'][i],
      modelUrl: ['/models/simple_chair.glb', '/models/abstract_sculpture_1.glb', 
                '/models/rubber_duck.glb', '/models/potted_plant.glb',
                '/models/small_table.glb', '/models/lamp.glb'][i],
      tokenId: Math.floor(Math.random() * 1000000).toString(),
      dateCreated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return [];
  }
}
