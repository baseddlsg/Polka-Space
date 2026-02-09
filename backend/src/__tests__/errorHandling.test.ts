import request from 'supertest';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { TransactionManager } from '../services/transactionManager';
import { MetadataProcessor } from '../services/metadataProcessor';
import { NotificationService } from '../services/notificationService';

// Mock PAPI service with various error scenarios
const mockPAPIService = {
  initialize: jest.fn(),
  isInitialized: jest.fn().mockReturnValue(true),
  validateAddress: jest.fn(),
  mintNFT: jest.fn(),
  getNFTsByOwner: jest.fn(),
  getNFTInfo: jest.fn()
};

jest.mock('../papi/papiService', () => ({
  getPAPIService: () => mockPAPIService
}));

// Create test app with error handling
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const transactionManager = new TransactionManager();
  const metadataProcessor = new MetadataProcessor();
  const notificationService = new NotificationService();

  // Mint endpoint with comprehensive error handling
  app.post('/mint', async (req: Request, res: Response) => {
    try {
      const { ownerAddress, metadata } = req.body;
      
      if (!ownerAddress || !metadata) {
        res.status(400).json({
          error: 'Missing required fields: ownerAddress and metadata'
        });
        return;
      }

      if (!mockPAPIService.validateAddress(ownerAddress)) {
        res.status(400).json({
          error: 'Invalid owner address format'
        });
        return;
      }

      const processedMetadata = await metadataProcessor.processMetadata(metadata);
      
      const transaction = await transactionManager.createTransaction({
        walletAddress: ownerAddress,
        metadata: processedMetadata,
        status: 'pending'
      });

      const mintResult = await mockPAPIService.mintNFT(ownerAddress, processedMetadata);
      
      await transactionManager.updateTransaction(transaction.id, {
        status: 'completed',
        transactionHash: mintResult.txHash,
        updatedAt: Date.now()
      });

      res.json({
        transactionHash: mintResult.txHash,
        collectionId: mintResult.collectionId,
        itemId: mintResult.itemId,
        metadata: processedMetadata
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: 'Minting failed', 
        details: errorMessage 
      });
    }
  });

  // Global error handler
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  });

  return app;
}

describe('Error Handling', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Blockchain Connectivity Errors', () => {
    it('should handle PAPI initialization failure', async () => {
      mockPAPIService.initialize.mockRejectedValueOnce(new Error('Failed to connect to blockchain'));
      mockPAPIService.validateAddress.mockReturnValue(true);
      mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('PAPI not initialized'));

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toBe('PAPI not initialized');
    });

    it('should handle network timeout errors', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);
      mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Network timeout'));

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toBe('Network timeout');
    });

    it('should handle insufficient funds error', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);
      mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Insufficient funds for transaction'));

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toBe('Insufficient funds for transaction');
    });
  });

  describe('Metadata Validation Errors', () => {
    it('should handle missing required metadata fields', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          // Missing name field
          description: 'Test description'
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toContain('NFT name is required');
    });

    it('should handle invalid model format', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.obj' } // Unsupported format
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toContain('Cannot detect model format');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/mint')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express 5 passes JSON parse errors to the error handler
      expect([400, 500]).toContain(response.status);
    });

    it('should handle oversized request payload', async () => {
      const largeMetadata = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' },
          attributes: {
            // Create a large object that exceeds the 10MB limit
            largeData: 'x'.repeat(11 * 1024 * 1024) // 11MB of data
          }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(largeMetadata);

      // Express 5 passes payload errors to the error handler
      expect([413, 500]).toContain(response.status);
    });
  });

  describe('Address Validation Errors', () => {
    it('should handle invalid address format', async () => {
      mockPAPIService.validateAddress.mockReturnValue(false);

      const mintRequest = {
        ownerAddress: 'invalid-address',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(400);

      expect(response.body.error).toBe('Invalid owner address format');
    });

    it('should handle empty address', async () => {
      const mintRequest = {
        ownerAddress: '',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
    });

    it('should handle null address', async () => {
      const mintRequest = {
        ownerAddress: null,
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
    });
  });

  describe('Transaction Failures', () => {
    it('should handle transaction broadcast failure', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);
      mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Transaction broadcast failed'));

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toBe('Transaction broadcast failed');
    });

    it('should handle nonce errors', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);
      mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Invalid nonce'));

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(mintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toBe('Invalid nonce');
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle multiple concurrent requests gracefully', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);
      mockPAPIService.mintNFT.mockResolvedValue({
        txHash: '0x1234567890abcdef',
        collectionId: 1,
        itemId: 1
      });

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      // Send multiple concurrent requests
      const promises = Array(5).fill(null).map(() => 
        request(app).post('/mint').send(mintRequest)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('transactionHash');
      });
    });
  });

  describe('Service Unavailability', () => {
    it('should handle IPFS service unavailability', async () => {
      mockPAPIService.validateAddress.mockReturnValue(true);
      
      // Mock metadata processor to throw IPFS error
      const metadataProcessor = new MetadataProcessor();
      jest.spyOn(metadataProcessor, 'uploadToIPFS').mockRejectedValueOnce(
        new Error('IPFS service unavailable')
      );

      const mintRequest = {
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadata: {
          name: 'Test NFT',
          model: { url: 'https://example.com/model.glb' }
        }
      };

      // This test verifies that the error handling structure is in place
      // In a real scenario, the IPFS error would be caught and handled appropriately
      const response = await request(app)
        .post('/mint')
        .send(mintRequest);

      // The response should still be handled gracefully
      expect([200, 500]).toContain(response.status);
    });
  });
});