"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = void 0;
const uuid_1 = require("uuid");
class TransactionManager {
    constructor() {
        this.transactions = new Map();
        this.transactionsByAddress = new Map();
    }
    async createTransaction(data) {
        const transaction = {
            id: (0, uuid_1.v4)(),
            status: data.status,
            metadata: data.metadata,
            walletAddress: data.walletAddress,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.transactions.set(transaction.id, transaction);
        const addressTransactions = this.transactionsByAddress.get(data.walletAddress) || [];
        addressTransactions.push(transaction.id);
        this.transactionsByAddress.set(data.walletAddress, addressTransactions);
        console.log(`Created transaction ${transaction.id} for ${data.walletAddress}`);
        return transaction;
    }
    async updateTransaction(transactionId, updates) {
        const transaction = this.transactions.get(transactionId);
        if (!transaction) {
            console.error(`Transaction ${transactionId} not found`);
            return null;
        }
        const updatedTransaction = {
            ...transaction,
            ...updates,
            updatedAt: Date.now()
        };
        this.transactions.set(transactionId, updatedTransaction);
        console.log(`Updated transaction ${transactionId} with status: ${updatedTransaction.status}`);
        return updatedTransaction;
    }
    async getTransaction(transactionId) {
        return this.transactions.get(transactionId) || null;
    }
    async getTransactionsByAddress(walletAddress) {
        const transactionIds = this.transactionsByAddress.get(walletAddress) || [];
        return transactionIds
            .map(id => this.transactions.get(id))
            .filter((tx) => tx !== undefined)
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    async getRecentTransactions(limit = 50, offset = 0) {
        const allTransactions = Array.from(this.transactions.values())
            .sort((a, b) => b.createdAt - a.createdAt);
        return allTransactions.slice(offset, offset + limit);
    }
    async getPendingTransactions() {
        return Array.from(this.transactions.values())
            .filter(tx => tx.status === 'pending' || tx.status === 'processing')
            .sort((a, b) => a.createdAt - b.createdAt);
    }
    async markTransactionFailed(transactionId, error) {
        return this.updateTransaction(transactionId, {
            status: 'failed',
            error
        });
    }
    async markTransactionCompleted(transactionId, transactionHash, blockNumber) {
        return this.updateTransaction(transactionId, {
            status: 'completed',
            transactionHash,
            blockNumber
        });
    }
    async getTransactionStats() {
        const transactions = Array.from(this.transactions.values());
        return {
            total: transactions.length,
            pending: transactions.filter(tx => tx.status === 'pending').length,
            processing: transactions.filter(tx => tx.status === 'processing').length,
            completed: transactions.filter(tx => tx.status === 'completed').length,
            failed: transactions.filter(tx => tx.status === 'failed').length
        };
    }
    async getTotalCompletedTransactions() {
        return Array.from(this.transactions.values())
            .filter(tx => tx.status === 'completed').length;
    }
    async cleanupOldTransactions(maxAge = 7 * 24 * 60 * 60 * 1000) {
        const cutoffTime = Date.now() - maxAge;
        let cleanedCount = 0;
        for (const [id, transaction] of this.transactions.entries()) {
            if (transaction.createdAt < cutoffTime && transaction.status !== 'pending' && transaction.status !== 'processing') {
                this.transactions.delete(id);
                const addressTransactions = this.transactionsByAddress.get(transaction.walletAddress) || [];
                const filteredTransactions = addressTransactions.filter(txId => txId !== id);
                if (filteredTransactions.length === 0) {
                    this.transactionsByAddress.delete(transaction.walletAddress);
                }
                else {
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
    startStatusPolling(intervalMs = 30000) {
        setInterval(async () => {
            try {
                await this.pollPendingTransactions();
            }
            catch (error) {
                console.error('Error during transaction status polling:', error);
            }
        }, intervalMs);
        console.log(`Started transaction status polling every ${intervalMs}ms`);
    }
    async pollPendingTransactions() {
        const pendingTransactions = await this.getPendingTransactions();
        if (pendingTransactions.length === 0) {
            return;
        }
        console.log(`Polling ${pendingTransactions.length} pending transactions`);
        for (const transaction of pendingTransactions) {
            try {
                const age = Date.now() - transaction.createdAt;
                if (transaction.status === 'pending' && age > 5000) {
                    await this.updateTransaction(transaction.id, { status: 'processing' });
                }
                else if (transaction.status === 'processing' && age > 30000) {
                    await this.updateTransaction(transaction.id, {
                        status: 'completed',
                        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
                    });
                }
            }
            catch (error) {
                console.error(`Error polling transaction ${transaction.id}:`, error);
                await this.markTransactionFailed(transaction.id, `Polling error: ${error}`);
            }
        }
    }
}
exports.TransactionManager = TransactionManager;
//# sourceMappingURL=transactionManager.js.map