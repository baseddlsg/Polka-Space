import { MintTransaction, NFTMetadata } from '../types/nft';
export declare class TransactionManager {
    private transactions;
    private transactionsByAddress;
    createTransaction(data: {
        walletAddress: string;
        metadata: NFTMetadata;
        status: 'pending' | 'processing' | 'completed' | 'failed';
    }): Promise<MintTransaction>;
    updateTransaction(transactionId: string, updates: Partial<MintTransaction>): Promise<MintTransaction | null>;
    getTransaction(transactionId: string): Promise<MintTransaction | null>;
    getTransactionsByAddress(walletAddress: string): Promise<MintTransaction[]>;
    getRecentTransactions(limit?: number, offset?: number): Promise<MintTransaction[]>;
    getPendingTransactions(): Promise<MintTransaction[]>;
    markTransactionFailed(transactionId: string, error: string): Promise<MintTransaction | null>;
    markTransactionCompleted(transactionId: string, transactionHash: string, blockNumber?: number): Promise<MintTransaction | null>;
    getTransactionStats(): Promise<{
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }>;
    getTotalCompletedTransactions(): Promise<number>;
    cleanupOldTransactions(maxAge?: number): Promise<number>;
    startStatusPolling(intervalMs?: number): void;
    private pollPendingTransactions;
}
//# sourceMappingURL=transactionManager.d.ts.map