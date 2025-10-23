export interface PAPIConfig {
    nft: {
        collectionId: number;
    };
    endpoints: {
        assetHub: string;
    };
    server: {
        accountSeed?: string;
    };
}
export declare const PAPI_CONFIG: PAPIConfig;
export declare function validateConfig(): void;
//# sourceMappingURL=config.d.ts.map