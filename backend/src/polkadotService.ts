import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

let api: ApiPromise | null = null;
let serverAccount: KeyringPair | null = null;

/**
 * Initializes the Polkadot API connection and loads the server account.
 * If already initialized, returns the existing API instance.
 */
export async function initializeApi(): Promise<ApiPromise> {
  if (api) {
    return api;
  }

  const endpoint = process.env.STATEMINT_ENDPOINT_URL;
  if (!endpoint) {
    throw new Error('STATEMINT_ENDPOINT_URL is not defined in .env file');
  }

  const provider = new WsProvider(endpoint);
  console.log(`Connecting to Statemint/Westmint node at ${endpoint}...`);

  try {
    api = await ApiPromise.create({ provider });

    await api.isReady;
    console.log('API connected and ready.');

    const serverSeed = process.env.SERVER_ACCOUNT_SEED;
    if (!serverSeed) {
      throw new Error('SERVER_ACCOUNT_SEED is not defined in .env file');
    }

    const keyring = new Keyring({ type: 'sr25519' });
    serverAccount = keyring.addFromUri(serverSeed);
    console.log('Server account loaded:', serverAccount.address);

    return api;
  } catch (error) {
    console.error('Failed to initialize Polkadot API:', error);
    api = null; // Reset api instance on failure
    serverAccount = null;
    throw error; // Re-throw the error after logging
  }
}

/**
 * Finds the next available itemId for the given collection by incrementing from 0
 * until an unused ID is found. This is simple and safe for small collections.
 */
async function getNextAvailableItemId(api: ApiPromise, collectionId: number): Promise<number> {
  let itemId = 0;
  while (true) {
    const item = await api.query.nfts.item(collectionId, itemId);
    // Check for Option type (isNone), or fallback to .isEmpty or null
    if ((item as any).isNone || (item as any).isEmpty || item === null) {
      return itemId;
    }
    itemId++;
    if (itemId > 2 ** 32 - 1) throw new Error('No available itemId found');
  }
}

/**
 * Mints an NFT in the configured collection for the specified owner.
 * Uses a simple timestamp for the item ID in this basic version.
 * 
 * @param ownerAddress The address of the intended owner of the new NFT.
 * @returns The transaction hash of the minting operation.
 */
export async function mintNft(ownerAddress: string, metadata?: any): Promise<{ txHash: string, collectionId: number, itemId: number }> {
  console.log(`Attempting to mint NFT for owner: ${ownerAddress}`);
  try {
    const currentApi = await initializeApi(); // Ensure API is connected
    if (!serverAccount) {
      throw new Error('Server account not initialized. Make sure initializeApi() was called successfully.');
    }
    const collectionIdStr = process.env.NFT_COLLECTION_ID;
    if (!collectionIdStr) {
      throw new Error('NFT_COLLECTION_ID is not defined in .env file');
    }
    const collectionId = parseInt(collectionIdStr, 10);
    if (isNaN(collectionId)) {
      throw new Error('Invalid NFT_COLLECTION_ID in .env file');
    }
    // Use the helper to get the next available itemId
    const itemId = await getNextAvailableItemId(currentApi, collectionId);
    console.log(`Minting NFT: Collection=${collectionId}, Item=${itemId}, Owner=${ownerAddress}`);
    const tx = currentApi.tx.nfts.mint(
      collectionId,
      itemId,
      ownerAddress,
      null // Add null for the potentially missing 4th argument (itemConfig)
    );
    console.log('Signing and sending mint transaction...');
    const hash = await tx.signAndSend(serverAccount);
    const txHashHex = hash.toHex();
    console.log('Mint transaction sent with hash:', txHashHex);
    return { txHash: txHashHex, collectionId, itemId };
  } catch (error) {
    console.error('Error minting NFT:', error);
    if (error instanceof Error) {
      throw new Error(`Minting failed: ${error.message}`);
    } else {
      throw new Error('Minting failed due to an unknown error.');
    }
  }
} 