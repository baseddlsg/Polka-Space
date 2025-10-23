export interface PAPIClientConfig {
    endpoint: string;
    chainName: string;
    reconnectAttempts?: number;
    reconnectDelay?: number;
}
export declare class PAPIClient {
    private client;
    private provider;
    private config;
    private isConnected;
    private reconnectAttempts;
    constructor(config: PAPIClientConfig);
    connect(): Promise<void>;
    private waitForConnection;
    private setupConnectionMonitoring;
    private handleConnectionError;
    private attemptReconnection;
    getClient(): any;
    isClientConnected(): boolean;
    disconnect(): Promise<void>;
    getChainInfo(): Promise<any>;
}
export declare function getAssetHubClient(): Promise<PAPIClient>;
export declare function initializePAPIClients(): Promise<void>;
export declare function cleanupPAPIClients(): Promise<void>;
//# sourceMappingURL=papiClient.d.ts.map