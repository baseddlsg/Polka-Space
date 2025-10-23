import { NFTMetadata } from '../types/nft';
export interface IPFSUploadResult {
    hash: string;
    url: string;
    size: number;
}
export declare class MetadataProcessor {
    private ipfsGateway;
    private tempStorage;
    constructor();
    processMetadata(rawMetadata: Partial<NFTMetadata>): Promise<NFTMetadata>;
    private processModelMetadata;
    private processMaterials;
    private processAttributes;
    uploadToIPFS(data: Buffer | string, filename?: string): Promise<IPFSUploadResult>;
    uploadMetadataToIPFS(metadata: NFTMetadata): Promise<IPFSUploadResult>;
    retrieveFromIPFS(hash: string): Promise<Buffer | string | null>;
    private validateMetadata;
    private detectModelFormat;
    private extractModelDimensions;
    private getModelSize;
    private validateMaterialType;
    private processMaterialProperties;
    private processAttributeValue;
    getStats(): {
        tempStorageSize: number;
        ipfsGateway: string;
    };
    clearTempStorage(): void;
}
//# sourceMappingURL=metadataProcessor.d.ts.map