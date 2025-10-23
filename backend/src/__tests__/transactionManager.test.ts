import { TransactionManager } from '../services/transactionManager';
import { NFTMetadata } from '../types/nft';

describe('TransactionManager', () => {
  let transactionManager: TransactionManager;
  
  const mockMetadata: NFTMetadata = {
    id: 'test-1',
    name: 'Test NFT',
    description: 'A test NFT',
    model: {
      url: 'https://example.com/model.glb',
      format: 'glb',
      size: 1000000,
      dimensions: { width: 1, height: 1, depth: 1 }
    },
    materials: [],
    creator: 'Test Creator',
    timestamp: Date.now(),
    attributes: {}
  };

  beforeEach(() => {
    transactionManager = new TransactionManager();
  });

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      const transaction = await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      expect(transaction).toHaveProperty('id');
      expect(transaction.status).toBe('pending');
      expect(transaction.walletAddress).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      expect(transaction.metadata).toEqual(mockMetadata);
      expect(transaction).toHaveProperty('createdAt');
      expect(transaction).toHaveProperty('updatedAt');
    });

    it('should generate unique transaction IDs', async () => {
      const tx1 = await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      const tx2 = await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      expect(tx1.id).not.toBe(tx2.id);
    });
  });

  describe('updateTransaction', () => {
    it('should update an existing transaction', async () => {
      const transaction = await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await transactionManager.updateTransaction(transaction.id, {
        status: 'completed',
        transactionHash: '0x1234567890abcdef'
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('completed');
      expect(updated!.transactionHash).toBe('0x1234567890abcdef');
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(transaction.updatedAt);
    });

    it('should return null for non-existent transaction', async () => {
      const result = await transactionManager.updateTransaction('non-existent', {
        status: 'completed'
      });

      expect(result).toBeNull();
    });
  });

  describe('getTransaction', () => {
    it('should retrieve a transaction by ID', async () => {
      const transaction = await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      const retrieved = await transactionManager.getTransaction(transaction.id);

      expect(retrieved).toEqual(transaction);
    });

    it('should return null for non-existent transaction', async () => {
      const result = await transactionManager.getTransaction('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getTransactionsByAddress', () => {
    it('should return transactions for a specific address', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      
      const tx1 = await transactionManager.createTransaction({
        walletAddress: address,
        metadata: mockMetadata,
        status: 'pending'
      });

      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const tx2 = await transactionManager.createTransaction({
        walletAddress: address,
        metadata: mockMetadata,
        status: 'completed'
      });

      // Create transaction for different address
      await transactionManager.createTransaction({
        walletAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        metadata: mockMetadata,
        status: 'pending'
      });

      const transactions = await transactionManager.getTransactionsByAddress(address);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].id).toBe(tx2.id); // Should be sorted by creation time (newest first)
      expect(transactions[1].id).toBe(tx1.id);
    });

    it('should return empty array for address with no transactions', async () => {
      const transactions = await transactionManager.getTransactionsByAddress('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');
      expect(transactions).toEqual([]);
    });
  });

  describe('getPendingTransactions', () => {
    it('should return only pending and processing transactions', async () => {
      await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'processing'
      });

      await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'completed'
      });

      const pending = await transactionManager.getPendingTransactions();

      expect(pending).toHaveLength(2);
      expect(pending.every(tx => tx.status === 'pending' || tx.status === 'processing')).toBe(true);
    });
  });

  describe('markTransactionCompleted', () => {
    it('should mark transaction as completed with blockchain data', async () => {
      const transaction = await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      const updated = await transactionManager.markTransactionCompleted(
        transaction.id,
        '0x1234567890abcdef',
        12345
      );

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('completed');
      expect(updated!.transactionHash).toBe('0x1234567890abcdef');
      expect(updated!.blockNumber).toBe(12345);
    });
  });

  describe('markTransactionFailed', () => {
    it('should mark transaction as failed with error message', async () => {
      const transaction = await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      const updated = await transactionManager.markTransactionFailed(
        transaction.id,
        'Insufficient funds'
      );

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('failed');
      expect(updated!.error).toBe('Insufficient funds');
    });
  });

  describe('getTransactionStats', () => {
    it('should return correct transaction statistics', async () => {
      await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'pending'
      });

      await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'processing'
      });

      await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'completed'
      });

      await transactionManager.createTransaction({
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: mockMetadata,
        status: 'failed'
      });

      const stats = await transactionManager.getTransactionStats();

      expect(stats).toEqual({
        total: 4,
        pending: 1,
        processing: 1,
        completed: 1,
        failed: 1
      });
    });
  });
});