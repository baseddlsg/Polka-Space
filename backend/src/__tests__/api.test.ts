import request from 'supertest';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { TransactionManager } from '../services/transactionManager';
import { MetadataProcessor } from '../services/metadataProcessor';
import { NotificationService } from '../services/notificationService';
import { MintRequest, NFTMetadata } from '../types/nft';

// Mock PAPI service
const mockPAPIService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  isInitialized: jest.fn().mockReturnValue(true),
  validateAddress: jest.fn().mockReturnValue(true),
  mintNFT: jest.fn().mockResolvedValue({
    txHash: '0x1234567890abcdef',
    collectionId: 1,
    itemId: 1
  }),
  getNFTsByOwner: jest.fn().mockResolvedValue([]),
  getNFTInfo: jest.fn().mockResolvedValue({
    collectionId: 1,
    itemId: 1,
    owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  })
};

jest.mock('../papi/papiService', () => ({
  getPAPIService: () => mockPAPIService
}));

// Create test app
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const transactionManager = new TransactionManager();
  const metadataProcessor = new MetadataProcessor();
  const notificationService = new NotificationService();

  // Health check
  app.get('/', (req, res) => {
    res.json({ 
      status: 'online',
      services: {
        papi: mockPAPIService.isInitialized(),
        transactionManager: true,
        metadataProcessor: true
      }
    });
  });

  // Mint endpoint
  app.post('/mint', async (req: Request, res: Response) => {
    try {
      const mintRequest: MintRequest = req.body;
      
      if (!mintRequest.ownerAddress || !mintRequest.metadata) {
        res.status(400).json({
          error: 'Missing required fields: ownerAddress and metadata'
        });
        return;
      }

      if (!mockPAPIService.validateAddress(mintRequest.ownerAddress)) {
        res.status(400).json({
          error: 'Invalid owner address format'
        });
        return;
      }

      const processedMetadata = await metadataProcessor.processMetadata(mintRequest.metadata);
      
      const transaction = await transactionManager.createTransaction({
        walletAddress: mintRequest.ownerAddress,
        metadata: processedMetadata,
        status: 'pending'
      });

      const mintResult = await mockPAPIService.mintNFT(mintRequest.ownerAddress, processedMetadata);
      
      await transactionManager.updateTransaction(transaction.id, {
        status: 'completed',
        transactionHash: mintResult.txHash,
        updatedAt: Date.now()
      });

      await notificationService.notifyMintCompletion(transaction.id, mintResult);

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

  // Portfolio endpoint
  app.get('/portfolio/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      
      if (!mockPAPIService.validateAddress(address)) {
        res.status(400).json({
          error: 'Invalid address format'
        });
        return;
      }

      const nfts = await mockPAPIService.getNFTsByOwner(address);
      const portfolio = {
        walletAddress: address,
        nfts: nfts,
        totalValue: 0,
        createdCount: nfts.length,
        lastUpdated: Date.now()
      };

      res.json(portfolio);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: 'Failed to fetch portfolio', 
        details: errorMessage 
      });
    }
  });

  // Community endpoint
  app.get('/community', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const recentTransactions = await transactionManager.getRecentTransactions(limit, offset);
      const recentMints = recentTransactions
        .filter(tx => tx.status === 'completed')
        .map(tx => tx.metadata);

      const communityFeed = {
        recentMints,
        featuredCreators: [...new Set(recentTransactions.map(tx => tx.walletAddress))],
        totalNFTs: await transactionManager.getTotalCompletedTransactions()
      };

      res.json(communityFeed);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: 'Failed to fetch community feed', 
        details: errorMessage 
      });
    }
  });

  return app;
}

describe('NFT Minting API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toEqual({
        status: 'online',
        services: {
          papi: true,
          transactionManager: true,
          metadataProcessor: true
        }
      });
    });
  });

  describe('POST /mint', () => {
    const validMintRequest: MintRequest = {
      ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      metadata: {
        name: 'Test NFT',
        description: 'A test 3D NFT',
        model: {
          url: 'https://example.com/model.glb',
          format: 'glb' as const,
          size: 1000000,
          dimensions: {
            width: 1,
            height: 1,
            depth: 1
          }
        },
        materials: [],
        creator: 'Test Creator',
        attributes: {}
      }
    };

    it('should successfully mint an NFT with valid data', async () => {
      const response = await request(app)
        .post('/mint')
        .send(validMintRequest)
        .expect(200);

      expect(response.body).toHaveProperty('transactionHash');
      expect(response.body).toHaveProperty('collectionId', 1);
      expect(response.body).toHaveProperty('itemId', 1);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata.name).toBe('Test NFT');
    });

    it('should reject request without ownerAddress', async () => {
      const invalidRequest = { ...validMintRequest };
      delete (invalidRequest as any).ownerAddress;

      const response = await request(app)
        .post('/mint')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
    });

    it('should reject request without metadata', async () => {
      const invalidRequest = { ...validMintRequest };
      delete (invalidRequest as any).metadata;

      const response = await request(app)
        .post('/mint')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
    });

    it('should reject request with invalid address', async () => {
      mockPAPIService.validateAddress.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/mint')
        .send(validMintRequest)
        .expect(400);

      expect(response.body.error).toBe('Invalid owner address format');
    });

    it('should handle minting service errors', async () => {
      mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Blockchain connection failed'));

      const response = await request(app)
        .post('/mint')
        .send(validMintRequest)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toBe('Blockchain connection failed');
    });

    it('should handle metadata processing errors', async () => {
      const invalidMetadata = {
        ...validMintRequest,
        metadata: {
          // Missing required name field
          description: 'Invalid metadata'
        }
      };

      const response = await request(app)
        .post('/mint')
        .send(invalidMetadata)
        .expect(500);

      expect(response.body.error).toBe('Minting failed');
      expect(response.body.details).toContain('NFT name is required');
    });
  });

  describe('GET /portfolio/:address', () => {
    const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

    it('should return user portfolio', async () => {
      const mockNFTs = [
        {
          collectionId: 1,
          itemId: 1,
          owner: testAddress,
          metadata: {
            id: '1',
            name: 'Test NFT 1',
            description: 'First test NFT'
          }
        }
      ];

      mockPAPIService.getNFTsByOwner.mockResolvedValueOnce(mockNFTs);

      const response = await request(app)
        .get(`/portfolio/${testAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('walletAddress', testAddress);
      expect(response.body).toHaveProperty('nfts');
      expect(response.body).toHaveProperty('totalValue', 0);
      expect(response.body).toHaveProperty('createdCount', 1);
      expect(response.body).toHaveProperty('lastUpdated');
      expect(response.body.nfts).toEqual(mockNFTs);
    });

    it('should reject invalid address', async () => {
      mockPAPIService.validateAddress.mockReturnValueOnce(false);

      const response = await request(app)
        .get('/portfolio/invalid-address')
        .expect(400);

      expect(response.body.error).toBe('Invalid address format');
    });

    it('should handle service errors', async () => {
      mockPAPIService.getNFTsByOwner.mockRejectedValueOnce(new Error('Service unavailable'));

      const response = await request(app)
        .get(`/portfolio/${testAddress}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch portfolio');
      expect(response.body.details).toBe('Service unavailable');
    });
  });

  describe('GET /community', () => {
    it('should return community feed', async () => {
      const response = await request(app)
        .get('/community')
        .expect(200);

      expect(response.body).toHaveProperty('recentMints');
      expect(response.body).toHaveProperty('featuredCreators');
      expect(response.body).toHaveProperty('totalNFTs');
      expect(Array.isArray(response.body.recentMints)).toBe(true);
      expect(Array.isArray(response.body.featuredCreators)).toBe(true);
      expect(typeof response.body.totalNFTs).toBe('number');
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/community?limit=10&offset=5')
        .expect(200);

      expect(response.body).toHaveProperty('recentMints');
      expect(response.body).toHaveProperty('featuredCreators');
      expect(response.body).toHaveProperty('totalNFTs');
    });
  });
});