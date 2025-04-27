import { NFTStorage, File } from 'nft.storage';

// Use environment variable for API key
const apiKey = import.meta.env.VITE_NFT_STORAGE_KEY;
console.log('VITE_NFT_STORAGE_KEY loaded by Vite:', apiKey ? 'Available' : 'Not found');

if (!apiKey) {
  console.error('NFT.Storage API key not found. Make sure VITE_NFT_STORAGE_KEY is set in your environment and the server was fully restarted.');
}

const client = new NFTStorage({ token: apiKey || '' });

/**
 * Interface for NFT metadata following ERC-1155 metadata standard
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image: string | File;
  animation_url?: string | File;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
      name?: string;
    }>;
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
    [key: string]: any;
  };
}

/**
 * Interface for VR Genesis Frame NFT metadata
 */
export interface VRObjectMetadata {
  name: string;
  description: string;
  modelUrl?: string;
  previewImage?: string | File;
  modelFile?: File;
  creator: string;
  objectType: 'primitive' | 'library' | 'custom';
  attributes: {
    shape?: string;
    color?: string;
    scale?: number | number[];
    [key: string]: any;
  };
}

/**
 * Uploads a file from a URL to NFT.Storage
 * @param fileUrl The URL of the file to upload
 * @param fileName The desired name for the file
 * @returns The IPFS CID of the uploaded file
 */
export async function uploadFileToIpfs(fileUrl: string, fileName: string): Promise<string> {
  if (!apiKey) throw new Error('NFT.Storage API key is missing.');

  try {
    // Fetch the file data from the URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const fileBlob = await response.blob();
    const file = new File([fileBlob], fileName, { type: fileBlob.type });

    console.log(`Uploading ${fileName} to NFT.Storage...`);
    const cid = await client.storeBlob(file);
    console.log(`Upload successful! CID: ${cid}`);
    return cid;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw error;
  }
}

/**
 * Generate and upload NFT metadata to IPFS
 * @param metadata The VR object metadata
 * @returns The IPFS URI for the metadata
 */
export async function generateAndUploadMetadata(metadata: VRObjectMetadata): Promise<string> {
  if (!apiKey) throw new Error('NFT.Storage API key is missing.');

  try {
    console.log('Preparing NFT metadata for upload...');
    
    // Convert to standard NFT metadata format
    const nftMetadata: NFTMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: metadata.previewImage || 'https://ui-avatars.com/api/?name=VR-Genesis-Frame&background=6D28D9&color=fff&format=svg',
      attributes: [
        { trait_type: 'Creator', value: metadata.creator },
        { trait_type: 'Object Type', value: metadata.objectType }
      ],
      properties: {
        category: 'vr',
        creators: [{ address: metadata.creator, share: 100 }]
      }
    };
    
    // Add animation_url if we have a model URL
    if (metadata.modelUrl) {
      nftMetadata.animation_url = metadata.modelUrl;
      
      // Add to files property
      if (!nftMetadata.properties) nftMetadata.properties = {};
      if (!nftMetadata.properties.files) nftMetadata.properties.files = [];
      
      nftMetadata.properties.files.push({
        uri: metadata.modelUrl,
        type: 'model/gltf-binary',
        name: `${metadata.name.toLowerCase().replace(/\s+/g, '_')}.glb`
      });
    }
    
    // Add all custom attributes
    if (metadata.attributes) {
      for (const [key, value] of Object.entries(metadata.attributes)) {
        if (value !== undefined) {
          nftMetadata.attributes.push({ trait_type: key, value });
        }
      }
    }
    
    // Store metadata on IPFS
    console.log('Uploading metadata to IPFS:', nftMetadata);
    
    // For testing, we'll create a mock response since we don't have actual model files
    if (import.meta.env.DEV && !metadata.modelFile) {
      // In development without actual model files, simulate a delay and return a fake CID
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockCid = `bafybeig${Math.random().toString(36).substring(2, 15)}`;
      console.log(`Mock upload successful! CID: ${mockCid}`);
      return `ipfs://${mockCid}`;
    }
    
    // In production or with actual model files:
    const metadataFile = new File(
      [JSON.stringify(nftMetadata, null, 2)],
      'metadata.json',
      { type: 'application/json' }
    );
    
    const metadataCid = await client.storeBlob(metadataFile);
    console.log(`Metadata upload successful! CID: ${metadataCid}`);
    return `ipfs://${metadataCid}`;
    
  } catch (error) {
    console.error('Error generating and uploading NFT metadata:', error);
    throw error;
  }
} 