"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainQueries = void 0;
class ChainQueries {
    constructor(client) {
        this.client = client;
    }
    async getNFTItem(collectionId, itemId) {
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
        }
        catch (error) {
            console.error(`Failed to get NFT item ${collectionId}:${itemId}:`, error);
            throw error;
        }
    }
    async getCollection(collectionId) {
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
        }
        catch (error) {
            console.error(`Failed to get collection ${collectionId}:`, error);
            throw error;
        }
    }
    async getNFTsByOwner(ownerAddress) {
        try {
            const client = this.client.getClient();
            const ownedNFTs = [];
            const collectionId = parseInt(process.env.NFT_COLLECTION_ID || '0');
            for (let itemId = 0; itemId < 1000; itemId++) {
                try {
                    const item = await this.getNFTItem(collectionId, itemId);
                    if (item && item.owner === ownerAddress) {
                        ownedNFTs.push(item);
                    }
                }
                catch {
                    break;
                }
            }
            return ownedNFTs;
        }
        catch (error) {
            console.error(`Failed to get NFTs for owner ${ownerAddress}:`, error);
            throw error;
        }
    }
    async nftExists(collectionId, itemId) {
        try {
            const item = await this.getNFTItem(collectionId, itemId);
            return item !== null;
        }
        catch {
            return false;
        }
    }
    async getNextAvailableItemId(collectionId) {
        let itemId = 0;
        while (itemId < 2 ** 32 - 1) {
            const exists = await this.nftExists(collectionId, itemId);
            if (!exists) {
                return itemId;
            }
            itemId++;
        }
        throw new Error('No available item ID found');
    }
    async getChainInfo() {
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
        }
        catch (error) {
            console.error('Failed to get chain info:', error);
            throw error;
        }
    }
    async getBalance(address) {
        try {
            const client = this.client.getClient();
            const accountInfo = await client.query.System.Account.getValue(address);
            return {
                free: accountInfo.data.free.toString(),
                reserved: accountInfo.data.reserved.toString(),
                frozen: accountInfo.data.frozen.toString()
            };
        }
        catch (error) {
            console.error(`Failed to get balance for ${address}:`, error);
            throw error;
        }
    }
}
exports.ChainQueries = ChainQueries;
//# sourceMappingURL=chainQueries.js.map