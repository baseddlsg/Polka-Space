import { ApiPromise } from '@polkadot/api';
export declare function initializeApi(): Promise<ApiPromise>;
export declare function mintNft(ownerAddress: string, metadata?: any): Promise<{
    txHash: string;
    collectionId: number;
    itemId: number;
}>;
//# sourceMappingURL=polkadotService.d.ts.map