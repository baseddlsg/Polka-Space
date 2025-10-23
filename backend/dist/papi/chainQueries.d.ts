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
export declare class ChainQueries {
    private client;
    constructor(client: PAPIClient);
    getNFTItem(collectionId: number, itemId: number): Promise<NFTInfo | null>;
    getCollection(collectionId: number): Promise<CollectionInfo | null>;
    getNFTsByOwner(ownerAddress: string): Promise<NFTInfo[]>;
    nftExists(collectionId: number, itemId: number): Promise<boolean>;
    getNextAvailableItemId(collectionId: number): Promise<number>;
    getChainInfo(): Promise<any>;
    getBalance(address: string): Promise<{
        free: string;
        reserved: string;
        frozen: string;
    }>;
}
//# sourceMappingURL=chainQueries.d.ts.map