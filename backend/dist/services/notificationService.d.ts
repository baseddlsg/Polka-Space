import { MintTransaction } from '../types/nft';
export interface NotificationChannel {
    type: 'webhook' | 'websocket' | 'email';
    endpoint?: string;
    enabled: boolean;
}
export declare class NotificationService {
    private channels;
    private webhookEndpoints;
    registerChannels(walletAddress: string, channels: NotificationChannel[]): void;
    addWebhookEndpoint(endpoint: string): void;
    notifyMintCompletion(transactionId: string, mintResult: {
        txHash: string;
        collectionId: number;
        itemId: number;
    }): Promise<void>;
    notifyMintFailure(transactionId: string, walletAddress: string, error: string): Promise<void>;
    notifyStatusUpdate(transaction: MintTransaction): Promise<void>;
    private sendToChannels;
    private sendWebhookNotifications;
    private sendWebhook;
    getStats(): {
        registeredWallets: number;
        totalChannels: number;
        webhookEndpoints: number;
    };
    removeChannels(walletAddress: string): boolean;
    removeWebhookEndpoint(endpoint: string): boolean;
}
//# sourceMappingURL=notificationService.d.ts.map