import { PAPIClient } from './papiClient';

export interface NFTInfo {
  collectionId: number;
  itemId: number;
  owner: string;
  metadata?: any;
}

export interface CollectionInfo {
  id: number;
  owner: string;
  admin: string;
  items: number;
  metadata?: any;
}

export class ChainQueries {
  private client: PAPIClient;

  constructor(client: PAPIClient) {
    this.client = client;
  }

  /**
   * Get NFT item information
   */
  async getNFTItem(collectionId: number, itemId: number): Promise<NFTInfo | null> {
    try {
      const client = this.client.getClient();
      const item = await client.query.Nfts.Item.getValue(collectionId, itemId);
      
      if (!item) {
        return null;
      }

      return {
        collectionId,
        itemId,
        owner: item.owner,
        metadata: item.data
      };
    } catch (error) {
      console.error(`Failed to get NFT item ${collectionId}:${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get collection information
   */
  async getCollection(collectionId: number): Promise<CollectionInfo | null> {
    try {
      const client = this.client.getClient();
      const collection = await client.query.Nfts.Collection.getValue(collectionId);
      
      if (!collection) {
        return null;
      }

      return {
        id: collectionId,
        owner: collection.owner,
        admin: collection.admin,
        items: collection.items,
        metadata: collection.data
      };
    } catch (error) {
      console.error(`Failed to get collection ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all NFTs owned by an address
   */
  async getNFTsByOwner(ownerAddress: string): Promise<NFTInfo[]> {
    try {
      const client = this.client.getClient();
      const ownedNFTs: NFTInfo[] = [];

      // This is a simplified implementation
      // In practice, you'd need to iterate through collections and items
      // or use indexing services for better performance
      
      // For now, we'll check a known collection range
      const collectionId = parseInt(process.env.NFT_COLLECTION_ID || '0');
      
      for (let itemId = 0; itemId < 1000; itemId++) {
        try {
          const item = await this.getNFTItem(collectionId, itemId);
          if (item && item.owner === ownerAddress) {
            ownedNFTs.push(item);
          }
        } catch {
          // Item doesn't exist, continue
          break;
        }
      }

      return ownedNFTs;
    } catch (error) {
      console.error(`Failed to get NFTs for owner ${ownerAddress}:`, error);
      throw error;
    }
  }

  /**
   * Check if an NFT exists
   */
  async nftExists(collectionId: number, itemId: number): Promise<boolean> {
    try {
      const item = await this.getNFTItem(collectionId, itemId);
      return item !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get next available item ID in a collection
   */
  async getNextAvailableItemId(collectionId: number): Promise<number> {
    let itemId = 0;
    
    while (itemId < 2**32 - 1) {
      const exists = await this.nftExists(collectionId, itemId);
      if (!exists) {
        return itemId;
      }
      itemId++;
    }
    
    throw new Error('No available item ID found');
  }

  /**
   * Get chain information
   */
  async getChainInfo(): Promise<any> {
    try {
      const client = this.client.getClient();
      
      const [chainName, chainVersion] = await Promise.all([
        client.constants.System.Version.spec_name(),
        client.constants.System.Version.spec_version()
      ]);

      return {
        name: chainName,
        version: chainVersion,
        endpoint: this.client.isClientConnected()
      };
    } catch (error) {
      console.error('Failed to get chain info:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<{
    free: string;
    reserved: string;
    frozen: string;
  }> {
    try {
      const client = this.client.getClient();
      const accountInfo = await client.query.System.Account.getValue(address);
      
      return {
        free: accountInfo.data.free.toString(),
        reserved: accountInfo.data.reserved.toString(),
        frozen: accountInfo.data.frozen.toString()
      };
    } catch (error) {
      console.error(`Failed to get balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get account balance (alias for compatibility)
   */
  async getAccountBalance(address: string): Promise<{
    free: string;
    reserved: string;
    frozen: string;
  }> {
    return this.getBalance(address);
  }

  /**
   * Get account nonce
   */
  async getAccountNonce(address: string): Promise<number> {
    try {
      const client = this.client.getClient();
      const accountInfo = await client.query.System.Account.getValue(address);
      
      return accountInfo.nonce;
    } catch (error) {
      console.error(`Failed to get nonce for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Mint an NFT using PAPI
   */
  async mintNFT(params: {
    collectionId: number;
    itemId: number;
    owner: string;
    metadata: string;
    signer: any;
  }): Promise<{
    txHash: string;
    itemId: number;
  }> {
    try {
      const client = this.client.getClient();
      const { collectionId, itemId, owner, metadata, signer } = params;

      console.log(`Minting NFT: Collection=${collectionId}, Item=${itemId}, Owner=${owner}`);

      // Create the mint transaction using PAPI
      const tx = client.tx.Nfts.mint({
        collection: collectionId,
        item: itemId,
        mint_to: owner,
        witness_data: null
      });

      // Sign and send the transaction
      const txHash = await tx.signAndSubmit(signer);

      console.log('Mint transaction sent with hash:', txHash);

      return {
        txHash,
        itemId
      };
    } catch (error) {
      console.error('Failed to mint NFT via PAPI:', error);
      throw error;
    }
  }

  /**
   * Transfer an NFT using PAPI
   */
  async transferNFT(params: {
    fromAddress: string;
    toAddress: string;
    collectionId: number;
    itemId: number;
    signer: any;
  }): Promise<{
    txHash: string;
  }> {
    try {
      const client = this.client.getClient();
      const { collectionId, itemId, toAddress, signer } = params;

      console.log(`Transferring NFT: Collection=${collectionId}, Item=${itemId}, To=${toAddress}`);

      // Create the transfer transaction using PAPI
      const tx = client.tx.Nfts.transfer({
        collection: collectionId,
        item: itemId,
        dest: toAddress
      });

      // Sign and send the transaction
      const txHash = await tx.signAndSubmit(signer);

      console.log('Transfer transaction sent with hash:', txHash);

      return {
        txHash
      };
    } catch (error) {
      console.error('Failed to transfer NFT via PAPI:', error);
      throw error;
    }
  }

  /**
   * Set NFT metadata using PAPI
   */
  async setNFTMetadata(params: {
    collectionId: number;
    itemId: number;
    metadata: string;
    signer: any;
  }): Promise<{
    txHash: string;
  }> {
    try {
      const client = this.client.getClient();
      const { collectionId, itemId, metadata, signer } = params;

      console.log(`Setting NFT metadata: Collection=${collectionId}, Item=${itemId}`);

      // Create the set metadata transaction using PAPI
      const tx = client.tx.Nfts.setMetadata({
        collection: collectionId,
        item: itemId,
        data: metadata
      });

      // Sign and send the transaction
      const txHash = await tx.signAndSubmit(signer);

      console.log('Set metadata transaction sent with hash:', txHash);

      return {
        txHash
      };
    } catch (error) {
      console.error('Failed to set NFT metadata via PAPI:', error);
      throw error;
    }
  }
}