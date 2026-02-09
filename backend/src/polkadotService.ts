import { getAssetHubClient, PAPIClient } from './papi/papiClient';
import { WalletAdapter } from './papi/walletAdapter';
import { ChainQueries } from './papi/chainQueries';
import dotenv from 'dotenv';

dotenv.config();

let papiClient: PAPIClient | null = null;
let walletAdapter: WalletAdapter | null = null;
let chainQueries: ChainQueries | null = null;

/**
 * Initializes the PAPI client connection and loads the server account.
 * If already initialized, returns the existing client instance.
 */
export async function initializeApi(): Promise<PAPIClient> {
  if (papiClient && papiClient.isClientConnected()) {
    return papiClient;
  }

  try {
    console.log('Initializing PAPI client...');
    
    // Get AssetHub PAPI client
    papiClient = await getAssetHubClient();
    
    // Initialize wallet adapter
    walletAdapter = new WalletAdapter(papiClient);
    await walletAdapter.initialize();
    
    // Initialize chain queries
    chainQueries = new ChainQueries(papiClient);
    
    const serverAccount = walletAdapter.getServerAccount();
    console.log('PAPI client connected and server account loaded:', serverAccount.address);

    return papiClient;
  } catch (error) {
    console.error('Failed to initialize PAPI client:', error);
    papiClient = null;
    walletAdapter = null;
    chainQueries = null;
    throw error;
  }
}

/**
 * Get the wallet adapter instance
 */
export function getWalletAdapter(): WalletAdapter {
  if (!walletAdapter) {
    throw new Error('Wallet adapter not initialized. Call initializeApi() first.');
  }
  return walletAdapter;
}

/**
 * Get the chain queries instance
 */
export function getChainQueries(): ChainQueries {
  if (!chainQueries) {
    throw new Error('Chain queries not initialized. Call initializeApi() first.');
  }
  return chainQueries;
}

/**
 * Finds the next available itemId for the given collection by incrementing from 0
 * until an unused ID is found. This is simple and safe for small collections.
 */
async function getNextAvailableItemId(collectionId: number): Promise<number> {
  const queries = getChainQueries();
  return await queries.getNextAvailableItemId(collectionId);
}

/**
 * Mints an NFT using PAPI integration.
 * 
 * @param ownerAddress The address of the intended owner of the new NFT.
 * @param metadata Optional metadata for the NFT.
 * @returns The transaction hash of the minting operation.
 */
export async function mintNft(
  ownerAddress: string, 
  metadata?: any
): Promise<{ txHash: string; collectionId: number; itemId: number }> {
  console.log(`Attempting to mint NFT for owner: ${ownerAddress}`);
  
  try {
    // Ensure PAPI is initialized
    await initializeApi();
    
    const wallet = getWalletAdapter();
    const queries = getChainQueries();
    
    const serverAccount = wallet.getServerAccount();
    
    const collectionIdStr = process.env.NFT_COLLECTION_ID;
    if (!collectionIdStr) {
      throw new Error('NFT_COLLECTION_ID is not defined in .env file');
    }
    
    const collectionId = parseInt(collectionIdStr, 10);
    if (isNaN(collectionId)) {
      throw new Error('Invalid NFT_COLLECTION_ID in .env file');
    }
    
    // Get the next available itemId using PAPI
    const itemId = await getNextAvailableItemId(collectionId);
    
    console.log(`Minting NFT via PAPI: Collection=${collectionId}, Item=${itemId}, Owner=${ownerAddress}`);
    
    // Mint the NFT using PAPI chain queries
    const result = await queries.mintNFT({
      collectionId,
      itemId,
      owner: ownerAddress,
      metadata: metadata ? JSON.stringify(metadata) : '',
      signer: serverAccount
    });
    
    console.log('Mint transaction sent via PAPI with hash:', result.txHash);
    
    // If metadata is provided, set it in a separate transaction
    if (metadata) {
      try {
        const metadataStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
        await queries.setNFTMetadata({
          collectionId,
          itemId,
          metadata: metadataStr,
          signer: serverAccount
        });
        console.log('NFT metadata set successfully');
      } catch (metadataError) {
        console.warn('Failed to set NFT metadata, but mint succeeded:', metadataError);
        // Don't fail the whole operation if metadata setting fails
      }
    }
    
    return { 
      txHash: result.txHash, 
      collectionId, 
      itemId: result.itemId 
    };
  } catch (error) {
    console.error('Minting failed:', error);
    if (error instanceof Error) {
      throw new Error(`Minting failed: ${error.message}`);
    } else {
      throw new Error('Minting failed due to an unknown error.');
    }
  }
}

/**
 * Get NFT information using PAPI
 */
export async function getNFTInfo(
  collectionId: number, 
  itemId: number
): Promise<any> {
  try {
    await initializeApi();
    const queries = getChainQueries();
    
    return await queries.getNFTItem(collectionId, itemId);
  } catch (error) {
    console.error(`Failed to get NFT info for ${collectionId}:${itemId}:`, error);
    throw error;
  }
}

/**
 * Get all NFTs owned by an address using PAPI
 */
export async function getNFTsByOwner(ownerAddress: string): Promise<any[]> {
  try {
    await initializeApi();
    const queries = getChainQueries();
    
    return await queries.getNFTsByOwner(ownerAddress);
  } catch (error) {
    console.error(`Failed to get NFTs for owner ${ownerAddress}:`, error);
    throw error;
  }
}

/**
 * Get account balance using PAPI
 */
export async function getAccountBalance(address: string): Promise<{
  free: string;
  reserved: string;
  frozen: string;
}> {
  try {
    await initializeApi();
    const queries = getChainQueries();
    
    return await queries.getAccountBalance(address);
  } catch (error) {
    console.error(`Failed to get balance for ${address}:`, error);
    throw error;
  }
}

/**
 * Transfer an NFT using PAPI
 */
export async function transferNFT(
  fromAddress: string,
  toAddress: string,
  collectionId: number,
  itemId: number
): Promise<{ txHash: string }> {
  try {
    await initializeApi();
    const wallet = getWalletAdapter();
    const queries = getChainQueries();
    
    const serverAccount = wallet.getServerAccount();
    
    return await queries.transferNFT({
      fromAddress,
      toAddress,
      collectionId,
      itemId,
      signer: serverAccount
    });
  } catch (error) {
    console.error('Transfer failed:', error);
    throw error;
  }
}

/**
 * Cleanup PAPI connections
 */
export async function cleanup(): Promise<void> {
  if (papiClient) {
    await papiClient.disconnect();
    papiClient = null;
    walletAdapter = null;
    chainQueries = null;
  }
}
