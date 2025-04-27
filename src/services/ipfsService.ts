import { NFTStorage, File } from 'nft.storage';
import { IPFS_CONFIG } from '@/config/blockchainConfig';
import { Buffer } from 'buffer';

// NFT Metadata structure
export interface NFTMetadata {
  name: string;
  description: string;
  image: File | string;
  animation_url?: File | string;
  properties: {
    type: string;
    shape?: string;
    color?: string;
    scale?: number;
    dimensions?: [number, number, number];
    [key: string]: any;
  };
  [key: string]: any;
}

// Create a client instance for NFT.Storage
const nftStorageClient = new NFTStorage({ 
  token: IPFS_CONFIG.nftStorageApiKey 
});

/**
 * Store a 3D model file to IPFS using NFT.Storage
 * @param modelUrl URL or Blob/File of the 3D model
 * @param modelName Name of the model file
 * @returns IPFS CID (Content Identifier)
 */
export async function storeModelToIPFS(
  modelUrl: string | Blob, 
  modelName: string = 'model.glb'
): Promise<string> {
  try {
    // If modelUrl is a string URL, fetch it first
    let modelData: Blob;
    
    if (typeof modelUrl === 'string') {
      if (modelUrl.startsWith('data:')) {
        // Handle data URLs
        const res = await fetch(modelUrl);
        modelData = await res.blob();
      } else if (modelUrl.startsWith('http') || modelUrl.startsWith('/')) {
        // Handle HTTP or local URLs
        const res = await fetch(modelUrl);
        modelData = await res.blob();
      } else {
        throw new Error('Unsupported model URL format');
      }
    } else {
      // It's already a Blob or File
      modelData = modelUrl;
    }
    
    // Create a File object from the Blob
    const modelFile = new File([modelData], modelName, { 
      type: 'model/gltf-binary' 
    });
    
    // Store the model file on IPFS
    const cid = await nftStorageClient.storeBlob(modelFile);
    
    return `ipfs://${cid}`;
  } catch (error) {
    console.error('Error storing model to IPFS:', error);
    throw error;
  }
}

/**
 * Generate an image preview of a 3D model
 * This is a simplified placeholder - in a real app, you'd use Three.js to render a preview
 * @param objectDetails Details of the 3D object
 * @returns Preview image as a File object
 */
export async function generate3DPreview(objectDetails: any): Promise<File> {
  // For now, we'll generate a simple colored square as a placeholder
  // In a real implementation, you would use canvas or Three.js to render the model
  
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Use the object's color or a default
  const color = objectDetails.color || '#8B5CF6';
  
  // Fill background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw shape based on type
  ctx.fillStyle = color;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const size = 250; // Size of the shape
  
  if (objectDetails.shape === 'sphere') {
    // Draw a circle for sphere
    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (objectDetails.shape === 'cylinder') {
    // Draw a simplified cylinder
    const height = size;
    const width = size * 0.7;
    
    // Ellipse at top
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - height / 4, width / 2, width / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rectangle for body
    ctx.fillRect(centerX - width / 2, centerY - height / 4, width, height / 2);
    
    // Ellipse at bottom
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + height / 4, width / 2, width / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (objectDetails.shape === 'torus') {
    // Draw a simplified torus
    const outerRadius = size / 2;
    const innerRadius = outerRadius / 2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Cut out center
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Default: box
    ctx.fillRect(centerX - size / 2, centerY - size / 2, size, size);
  }
  
  // Add name text
  const name = objectDetails.name || `${objectDetails.shape || 'Model'} NFT`;
  ctx.fillStyle = '#333';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(name, centerX, canvas.height - 50);
  
  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob as Blob);
    }, 'image/png');
  });
  
  return new File([blob], `${name.replace(/\s+/g, '-').toLowerCase()}-preview.png`, { 
    type: 'image/png' 
  });
}

/**
 * Store NFT metadata on IPFS
 * @param metadata NFT metadata object
 * @returns IPFS URI for the metadata
 */
export async function storeNFTMetadata(metadata: NFTMetadata): Promise<string> {
  try {
    // Make sure image is a File object
    let imageFile: File;
    if (typeof metadata.image === 'string') {
      // If image is a URL, fetch it and convert to File
      if (metadata.image.startsWith('ipfs://')) {
        // Already on IPFS, use as is
        const ipfsUrl = metadata.image.replace('ipfs://', IPFS_CONFIG.ipfsGateway);
        const response = await fetch(ipfsUrl);
        const blob = await response.blob();
        imageFile = new File([blob], 'image.png', { type: 'image/png' });
      } else {
        // Regular URL
        const response = await fetch(metadata.image);
        const blob = await response.blob();
        imageFile = new File([blob], 'image.png', { type: 'image/png' });
      }
    } else {
      // Already a File object
      imageFile = metadata.image;
    }
    
    // Handle animation_url (3D model) if present
    let animationFile: File | undefined;
    if (metadata.animation_url) {
      if (typeof metadata.animation_url === 'string') {
        if (metadata.animation_url.startsWith('ipfs://')) {
          // Already on IPFS, use the URI directly in the metadata
          // No need to re-upload
        } else {
          // Regular URL, fetch and store
          const response = await fetch(metadata.animation_url);
          const blob = await response.blob();
          animationFile = new File([blob], 'model.glb', { type: 'model/gltf-binary' });
        }
      } else {
        // Already a File object
        animationFile = metadata.animation_url;
      }
    }
    
    // Prepare the NFT Storage metadata
    const nftMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: imageFile,
      properties: { ...metadata.properties }
    };
    
    // Add animation_url if present
    if (animationFile) {
      Object.assign(nftMetadata, { animation_url: animationFile });
    } else if (typeof metadata.animation_url === 'string' && metadata.animation_url.startsWith('ipfs://')) {
      // Use the existing IPFS URI
      Object.assign(nftMetadata, { animation_url: metadata.animation_url });
    }
    
    // Store the metadata on IPFS
    const metadataResult = await nftStorageClient.store(nftMetadata);
    
    return metadataResult.url;
  } catch (error) {
    console.error('Error storing NFT metadata to IPFS:', error);
    throw error;
  }
}

/**
 * Resolve an IPFS URI to an HTTP gateway URL
 * @param ipfsUri IPFS URI (ipfs://...)
 * @returns HTTP URL for the content
 */
export function resolveIPFSUri(ipfsUri: string): string {
  if (!ipfsUri) return '';
  
  if (ipfsUri.startsWith('ipfs://')) {
    return ipfsUri.replace('ipfs://', IPFS_CONFIG.ipfsGateway);
  }
  
  return ipfsUri;
}

/**
 * Fetch and parse NFT metadata from an IPFS URI
 * @param metadataUri IPFS or HTTP URI for the metadata
 * @returns Parsed metadata object
 */
export async function fetchNFTMetadata(metadataUri: string): Promise<any> {
  try {
    // Resolve IPFS URI to HTTP URL if needed
    const url = metadataUri.startsWith('ipfs://') 
      ? resolveIPFSUri(metadataUri)
      : metadataUri;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
    }
    
    const metadata = await response.json();
    
    // Resolve IPFS URIs in the metadata
    if (metadata.image && typeof metadata.image === 'string') {
      metadata.image = resolveIPFSUri(metadata.image);
    }
    
    if (metadata.animation_url && typeof metadata.animation_url === 'string') {
      metadata.animation_url = resolveIPFSUri(metadata.animation_url);
    }
    
    return metadata;
  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    throw error;
  }
} 