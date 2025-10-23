import { MintTransaction, NFTMetadata } from '../types/nft';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './errorHandler';

export class TransactionManager {
  private transactions: Map<string, MintTransaction> = new Map();
  private transactionsByAddress: Map<string, string[]> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Create a new transaction record
   */
  async createTransaction(data: {
    walletAddress: string;
    metadata: NFTMetadata;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }): Promise<MintTransaction> {
    const transaction: MintTransaction = {
      id: uuidv4(),
      status: data.status,
      metadata: data.metadata,
      walletAddress: data.walletAddress,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.transactions.set(transaction.id, transaction);
    
    // Index by wallet address
    const addressTransactions = this.transactionsByAddress.get(data.walletAddress) || [];
    addressTransactions.push(transaction.id);
    this.transactionsByAddress.set(data.walletAddress, addressTransactions);

    this.logger.info('Transaction created', {
      transactionId: transaction.id,
      walletAddress: data.walletAddress,
      status: data.status,
      metadataName: data.metadata.name
    });
    
    return transaction;
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    transactionId: string, 
    updates: Partial<MintTransaction>
  ): Promise<MintTransaction | null> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      this.logger.error('Transaction not found for update', null, { transactionId });
      return null;
    }

    const updatedTransaction = {
      ...transaction,
      ...updates,
      updatedAt: Date.now()
    };

    this.transactions.set(transactionId, updatedTransaction);
    
    this.logger.info('Transaction updated', {
      transactionId,
      previousStatus: transaction.status,
      newStatus: updatedTransaction.status,
      updates: Object.keys(updates)
    });
    
    return updatedTransaction;
  }

  /**
   * Get a transaction by ID
   */
  async getTransaction(transactionId: string): Promise<MintTransaction | null> {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Get all transactions for a wallet address
   */
  async getTransactionsByAddress(walletAddress: string): Promise<MintTransaction[]> {
    const transactionIds = this.transactionsByAddress.get(walletAddress) || [];
    return transactionIds
      .map(id => this.transactions.get(id))
      .filter((tx): tx is MintTransaction => tx !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get recent transactions for community feed
   */
  async getRecentTransactions(limit: number = 50, offset: number = 0): Promise<MintTransaction[]> {
    const allTransactions = Array.from(this.transactions.values())
      .sort((a, b) => b.createdAt - a.createdAt);
    
    return allTransactions.slice(offset, offset + limit);
  }

  /**
   * Get pending transactions that need status updates
   */
  async getPendingTransactions(): Promise<MintTransaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === 'pending' || tx.status === 'processing')
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Mark transaction as failed with error message
   */
  async markTransactionFailed(transactionId: string, error: string): Promise<MintTransaction | null> {
    return this.updateTransaction(transactionId, {
      status: 'failed',
      error
    });
  }

  /**
   * Mark transaction as completed with blockchain data
   */
  async markTransactionCompleted(
    transactionId: string, 
    transactionHash: string, 
    blockNumber?: number
  ): Promise<MintTransaction | null> {
    return this.updateTransaction(transactionId, {
      status: 'completed',
      transactionHash,
      blockNumber
    });
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const transactions = Array.from(this.transactions.values());
    
    return {
      total: transactions.length,
      pending: transactions.filter(tx => tx.status === 'pending').length,
      processing: transactions.filter(tx => tx.status === 'processing').length,
      completed: transactions.filter(tx => tx.status === 'completed').length,
      failed: transactions.filter(tx => tx.status === 'failed').length
    };
  }

  /**
   * Get total number of completed transactions
   */
  async getTotalCompletedTransactions(): Promise<number> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === 'completed').length;
  }

  /**
   * Clean up old transactions (optional - for memory management)
   */
  async cleanupOldTransactions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.createdAt < cutoffTime && transaction.status !== 'pending' && transaction.status !== 'processing') {
        this.transactions.delete(id);
        
        // Remove from address index
        const addressTransactions = this.transactionsByAddress.get(transaction.walletAddress) || [];
        const filteredTransactions = addressTransactions.filter(txId => txId !== id);
        if (filteredTransactions.length === 0) {
          this.transactionsByAddress.delete(transaction.walletAddress);
        } else {
          this.transactionsByAddress.set(transaction.walletAddress, filteredTransactions);
        }
        
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old transactions`);
    }

    return cleanedCount;
  }

  /**
   * Start background polling for transaction status updates
   */
  startStatusPolling(intervalMs: number = 30000): void {
    setInterval(async () => {
      try {
        await this.pollPendingTransactions();
      } catch (error) {
        console.error('Error during transaction status polling:', error);
      }
    }, intervalMs);

    console.log(`Started transaction status polling every ${intervalMs}ms`);
  }

  /**
   * Poll pending transactions for status updates
   */
  private async pollPendingTransactions(): Promise<void> {
    const pendingTransactions = await this.getPendingTransactions();
    
    if (pendingTransactions.length === 0) {
      return;
    }

    console.log(`Polling ${pendingTransactions.length} pending transactions`);

    for (const transaction of pendingTransactions) {
      try {
        // In a real implementation, you would check the blockchain for transaction status
        // For now, we'll simulate status updates based on age
        const age = Date.now() - transaction.createdAt;
        
        if (transaction.status === 'pending' && age > 5000) {
          // After 5 seconds, mark as processing
          await this.updateTransaction(transaction.id, { status: 'processing' });
        } else if (transaction.status === 'processing' && age > 30000) {
          // After 30 seconds, mark as completed (in real implementation, check blockchain)
          await this.updateTransaction(transaction.id, { 
            status: 'completed',
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
          });
        }
      } catch (error) {
        console.error(`Error polling transaction ${transaction.id}:`, error);
        await this.markTransactionFailed(transaction.id, `Polling error: ${error}`);
      }
    }
  }
}