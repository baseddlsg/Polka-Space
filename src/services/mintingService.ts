/**
 * Minting Service - Frontend Layer
 * 
 * Handles NFT minting operations by coordinating with the backend API
 * and IPFS services for metadata storage.
 */

import { toast } from 'sonner';
import { 
  mintNFT as backendMintNFT,
  getExplorerUrl,
  getNFTsByOwner
} from './blockchainService';
import { 
  generate3DPreview, 
  storeModelToIPFS, 
  storeNFTMetadata 
} from './ipfsService';
import { BLOCKCHAIN_CONFIG } from '@/config/blockchainConfig';

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
  chainId: string;
  account: any;
}

interface MintResponse {
  transactionHash: string;
  tokenId: string;
  chainId: string;
  explorerUrl: string;
  metadataUrl: string;
}

/**
 * Mint an NFT on the selected blockchain via backend API
 */
export async function mintNFT(request: MintRequest): Promise<MintResponse> {
  const { ownerAddress, objectDetails, chainId } = request;
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
      description: `A 3D object created in Polka-Space on ${BLOCKCHAIN_CONFIG[chainId]?.name || chainId}`,
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
    
    // 5. Mint the NFT via backend API
    const result = await backendMintNFT({
      ownerAddress,
      metadata,
      chainId
    });
    
    return {
      transactionHash: result.transactionHash,
      tokenId: result.tokenId,
      chainId: result.chainId,
      explorerUrl: getExplorerUrl(chainId, result.transactionHash),
      metadataUrl
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    throw new Error(error instanceof Error ? error.message : 'Failed to mint NFT');
  }
}

/**
 * Get all NFTs owned by an address across supported chains
 */
export async function fetchUserNFTs(address: string): Promise<any[]> {
  console.log(`Fetching NFTs for address: ${address}`);

  try {
    const nfts = await getNFTsByOwner(address);
    return nfts;
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return [];
  }
}
