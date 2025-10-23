import { TransactionManager } from '../services/transactionManager';
import { MetadataProcessor } from '../services/metadataProcessor';
import { NotificationService } from '../services/notificationService';
import { NFTMetadata } from '../types/nft';

describe('Integration Tests', () => {
  let transactionManager: TransactionManager;
  let metadataProcessor: MetadataProcessor;
  let notificationService: NotificationService;

  beforeEach(() => {
    transactionManager = new TransactionManager();
    metadataProcessor = new MetadataProcessor();
    notificationService = new NotificationService();
  });

  describe('Complete Minting Workflow', () => {
    it('should process a complete minting workflow', async () => {
      // Step 1: Process metadata
      const rawMetadata = {
        name: 'Integration Test NFT',
        description: 'A test NFT for integration testing',
        model: {
          url: 'https://example.com/test-model.glb',
          format: 'glb' as const,
          size: 2000000,
          dimensions: {
            width: 2,
            height: 2,
            depth: 2
          }
        },
        materials: [
          {
            name: 'TestMaterial',
            type: 'PBR' as const,
            properties: {
              color: '#00ff00',
              metallic: 0.8,
              roughness: 0.2
            }
          }
        ],
        creator: 'Integration Test Creator',
        attributes: {
          category: 'Test',
          rarity: 'Common'
        }
      };

      const processedMetadata = await metadataProcessor.processMetadata(rawMetadata);
      
      expect(processedMetadata.name).toBe('Integration Test NFT');
      expect(processedMetadata.model.format).toBe('glb');
      expect(processedMetadata.materials).toHaveLength(1);
      expect(processedMetadata.attributes.category).toBe('Test');

      // Step 2: Create transaction
      const walletAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const transaction = await transactionManager.createTransaction({
        walletAddress,
        metadata: processedMetadata,
        status: 'pending'
      });

      expect(transaction.status).toBe('pending');
      expect(transaction.walletAddress).toBe(walletAddress);
      expect(transaction.metadata.name).toBe('Integration Test NFT');

      // Step 3: Simulate successful minting
      const mockMintResult = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        collectionId: 1,
        itemId: 42
      };

      const updatedTransaction = await transactionManager.markTransactionCompleted(
        transaction.id,
        mockMintResult.txHash,
        12345
      );

      expect(updatedTransaction).not.toBeNull();
      expect(updatedTransaction!.status).toBe('completed');
      expect(updatedTransaction!.transactionHash).toBe(mockMintResult.txHash);
      expect(updatedTransaction!.blockNumber).toBe(12345);

      // Step 4: Send notification
      await notificationService.notifyMintCompletion(transaction.id, mockMintResult);

      // Step 5: Verify transaction can be retrieved
      const retrievedTransaction = await transactionManager.getTransaction(transaction.id);
      expect(retrievedTransaction).not.toBeNull();
      expect(retrievedTransaction!.status).toBe('completed');

      // Step 6: Verify transaction appears in user's transactions
      const userTransactions = await transactionManager.getTransactionsByAddress(walletAddress);
      expect(userTransactions).toHaveLength(1);
      expect(userTransactions[0].id).toBe(transaction.id);

      // Step 7: Verify transaction appears in recent transactions
      const recentTransactions = await transactionManager.getRecentTransactions(10, 0);
      expect(recentTransactions).toHaveLength(1);
      expect(recentTransactions[0].id).toBe(transaction.id);
    });

    it('should handle minting failure workflow', async () => {
      const rawMetadata = {
        name: 'Failed Test NFT',
        model: {
          url: 'https://example.com/test-model.glb'
        }
      } as any;

      const processedMetadata = await metadataProcessor.processMetadata(rawMetadata);
      
      const walletAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const transaction = await transactionManager.createTransaction({
        walletAddress,
        metadata: processedMetadata,
        status: 'pending'
      });

      // Simulate minting failure
      const errorMessage = 'Insufficient funds for transaction';
      const failedTransaction = await transactionManager.markTransactionFailed(
        transaction.id,
        errorMessage
      );

      expect(failedTransaction).not.toBeNull();
      expect(failedTransaction!.status).toBe('failed');
      expect(failedTransaction!.error).toBe(errorMessage);

      // Send failure notification
      await notificationService.notifyMintFailure(transaction.id, walletAddress, errorMessage);

      // Verify transaction statistics
      const stats = await transactionManager.getTransactionStats();
      expect(stats.failed).toBeGreaterThan(0);
    });
  });

  describe('IPFS Integration', () => {
    it('should upload and retrieve metadata from IPFS', async () => {
      const testMetadata: NFTMetadata = {
        id: 'ipfs-test-1',
        name: 'IPFS Test NFT',
        description: 'Testing IPFS functionality',
        model: {
          url: 'https://example.com/ipfs-test.glb',
          format: 'glb',
          size: 1500000,
          dimensions: { width: 1.5, height: 1.5, depth: 1.5 }
        },
        materials: [],
        creator: 'IPFS Tester',
        timestamp: Date.now(),
        attributes: {}
      };

      // Upload metadata to IPFS
      const uploadResult = await metadataProcessor.uploadMetadataToIPFS(testMetadata);
      
      expect(uploadResult.hash).toMatch(/^Qm[a-zA-Z0-9]+$/);
      expect(uploadResult.url).toContain(uploadResult.hash);
      expect(uploadResult.size).toBeGreaterThan(0);

      // Retrieve metadata from IPFS
      const retrievedData = await metadataProcessor.retrieveFromIPFS(uploadResult.hash);
      expect(retrievedData).not.toBeNull();
      
      if (typeof retrievedData === 'string') {
        const parsedMetadata = JSON.parse(retrievedData);
        expect(parsedMetadata.name).toBe('IPFS Test NFT');
        expect(parsedMetadata.id).toBe('ipfs-test-1');
      }
    });
  });

  describe('Service Statistics', () => {
    it('should provide accurate service statistics', async () => {
      // Create multiple transactions with different statuses
      const walletAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      
      const metadata1 = await metadataProcessor.processMetadata({
        name: 'Stats Test NFT 1',
        model: { url: 'https://example.com/model1.glb' }
      } as any);

      const metadata2 = await metadataProcessor.processMetadata({
        name: 'Stats Test NFT 2',
        model: { url: 'https://example.com/model2.glb' }
      } as any);

      // Create transactions
      const tx1 = await transactionManager.createTransaction({
        walletAddress,
        metadata: metadata1,
        status: 'pending'
      });

      const tx2 = await transactionManager.createTransaction({
        walletAddress,
        metadata: metadata2,
        status: 'processing'
      });

      await transactionManager.markTransactionCompleted(tx1.id, '0xabc123', 100);
      await transactionManager.markTransactionFailed(tx2.id, 'Test failure');

      // Check transaction statistics
      const stats = await transactionManager.getTransactionStats();
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);

      // Check metadata processor statistics
      const metadataStats = metadataProcessor.getStats();
      expect(metadataStats.tempStorageSize).toBeGreaterThanOrEqual(0);
      expect(typeof metadataStats.ipfsGateway).toBe('string');

      // Check notification service statistics
      const notificationStats = notificationService.getStats();
      expect(notificationStats.registeredWallets).toBe(0);
      expect(notificationStats.totalChannels).toBe(0);
      expect(notificationStats.webhookEndpoints).toBe(0);
    });
  });
});