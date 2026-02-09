import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  requestLogger, 
  errorHandler, 
  notFoundHandler, 
  setupProcessErrorHandlers,
  asyncHandler,
  ValidationError,
  BlockchainError,
  Logger
} from './services/errorHandler';
import { createRateLimiters } from './services/rateLimiter';
import { retryUtils } from './services/retryService';
import { TransactionManager } from './services/transactionManager';
import { MetadataProcessor } from './services/metadataProcessor';
import { NotificationService } from './services/notificationService';
import { nftCache, portfolioCache, communityCache, withCache, cacheKeys } from './services/cacheService';
import { MintRequest, MintResponse, NFTInfo } from './types/nft';
import { initializePAPIService, getPAPIService } from './papi/papiService';
import * as polkadotService from './polkadotService';
import analyticsRoutes from './routes/analytics';

// Load environment variables from .env file
dotenv.config();

export const app = express();
const port = process.env.PORT || 3001;

// Initialize logger and error handlers
const logger = Logger.getInstance();
setupProcessErrorHandlers();

// Initialize rate limiters
const rateLimiters = createRateLimiters();

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for 3D model metadata

// Request logging
app.use(requestLogger);

// General rate limiting
app.use(rateLimiters.general);

// --- Services ---
const transactionManager = new TransactionManager();
const metadataProcessor = new MetadataProcessor();
const notificationService = new NotificationService();

// Initialize PAPI service and polkadot service
let papiService: any = null;

// Validate required environment variables
const requiredEnvVars = ['SERVER_ACCOUNT_SEED', 'ASSETHUB_ENDPOINT_URL'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.warn(`WARNING: Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Blockchain operations will be unavailable. Copy .env.example to .env and configure.');
}

// Only initialize blockchain services if env vars are present
if (process.env.SERVER_ACCOUNT_SEED && process.env.ASSETHUB_ENDPOINT_URL) {
  Promise.all([
    initializePAPIService(),
    polkadotService.initializeApi()
  ]).then(([papi, _]) => {
    papiService = papi;
    console.log('PAPI Service and Polkadot Service initialized successfully');
  }).catch(error => {
    console.error('Failed to initialize services:', error);
    console.error('Server will continue but blockchain operations may fail');
  });
} else {
  console.warn('Skipping blockchain initialization due to missing environment variables');
}

// --- Routes ---
app.use('/api/analytics', analyticsRoutes);

// --- Route Handlers ---

// Health check
app.get('/', (req: Request, res: Response): void => {
  res.json({ 
    status: 'online',
    services: {
      papi: true,
      transactionManager: true,
      metadataProcessor: true
    }
  });
});

// POST /mint - NFT minting endpoint
app.post('/mint', rateLimiters.minting, rateLimiters.walletMinting, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const mintRequest: MintRequest = req.body;
  
  // Validate required fields
  if (!mintRequest.ownerAddress || !mintRequest.metadata) {
    throw new ValidationError('Missing required fields: ownerAddress and metadata');
  }

  // Validate address format using wallet adapter
  const wallet = polkadotService.getWalletAdapter();
  if (!wallet.validateAddress(mintRequest.ownerAddress)) {
    throw new ValidationError('Invalid owner address format');
  }

  logger.info('Starting NFT minting process', {
    ownerAddress: mintRequest.ownerAddress,
    metadataName: mintRequest.metadata.name
  });

  // Process and validate metadata with retry
  const processedMetadata = await retryUtils.retryAPICall(
    () => metadataProcessor.processMetadata(mintRequest.metadata),
    'metadata processing'
  );
  
  // Create transaction record
  const transaction = await transactionManager.createTransaction({
    walletAddress: mintRequest.ownerAddress,
    metadata: processedMetadata,
    status: 'pending'
  });

  try {
    // Initiate minting with blockchain retry logic using real PAPI service
    const mintResult = await retryUtils.retryBlockchainOperation(
      () => polkadotService.mintNft(mintRequest.ownerAddress, processedMetadata),
      'NFT minting'
    );
    
    // Update transaction with results
    await transactionManager.updateTransaction(transaction.id, {
      status: 'completed',
      transactionHash: mintResult.txHash,
      updatedAt: Date.now()
    });

    // Send notification (non-blocking)
    notificationService.notifyMintCompletion(transaction.id, mintResult).catch(error => {
      logger.warn('Failed to send mint completion notification', error);
    });

    const response: MintResponse = {
      transactionHash: mintResult.txHash,
      collectionId: mintResult.collectionId,
      itemId: mintResult.itemId,
      metadata: processedMetadata
    };

    logger.info('NFT minting completed successfully', {
      transactionId: transaction.id,
      transactionHash: mintResult.txHash,
      ownerAddress: mintRequest.ownerAddress
    });

    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });

  } catch (error) {
    // Mark transaction as failed
    await transactionManager.markTransactionFailed(transaction.id, error instanceof Error ? error.message : 'Unknown error');
    
    // Determine error type and throw appropriate error
    if (error instanceof Error) {
      if (error.message.includes('insufficient') || error.message.includes('balance')) {
        throw new BlockchainError('Insufficient funds for minting transaction', { originalError: error.message });
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new BlockchainError('Network error during minting', { originalError: error.message });
      }
    }
    
    throw new BlockchainError('Minting failed', { originalError: error });
  }
}));

// GET /portfolio/:address - Get user's NFT portfolio
app.get('/portfolio/:address', rateLimiters.query, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  
  const wallet = polkadotService.getWalletAdapter();
  if (!wallet.validateAddress(address)) {
    throw new ValidationError('Invalid address format');
  }

  logger.debug('Fetching portfolio for address', { address });

  // Use caching for portfolio data with retry logic
  const portfolio = await withCache(
    cacheKeys.portfolio(address),
    async () => {
      const nfts = await retryUtils.retryBlockchainOperation(
        () => polkadotService.getNFTsByOwner(address),
        'fetch user NFTs'
      );
      
      return {
        walletAddress: address,
        nfts: nfts,
        totalValue: 0, // Could be calculated based on market data
        createdCount: nfts.length,
        lastUpdated: Date.now()
      };
    },
    portfolioCache,
    300 // 5 minutes cache
  );

  logger.info('Portfolio fetched successfully', {
    address,
    nftCount: portfolio.nfts.length
  });

  res.json({
    success: true,
    data: portfolio,
    timestamp: Date.now()
  });
}));

// GET /community - Get public NFT discovery feed
app.get('/community', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Use caching for community feed
    const communityFeed = await withCache(
      cacheKeys.communityFeed(limit, offset),
      async () => {
        // Get recent transactions for community feed
        const recentTransactions = await transactionManager.getRecentTransactions(limit, offset);
        const recentMints = recentTransactions
          .filter(tx => tx.status === 'completed')
          .map(tx => tx.metadata);

        return {
          recentMints,
          featuredCreators: [...new Set(recentTransactions.map(tx => tx.walletAddress))],
          totalNFTs: await transactionManager.getTotalCompletedTransactions()
        };
      },
      communityCache,
      120 // 2 minutes cache
    );

    res.json(communityFeed);

  } catch (error) {
    console.error('Failed to fetch community feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to fetch community feed', 
      details: errorMessage 
    });
  }
});

// GET /transaction/:id - Get transaction status
app.get('/transaction/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const transaction = await transactionManager.getTransaction(id);
    
    if (!transaction) {
      res.status(404).json({ 
        error: 'Transaction not found' 
      });
      return;
    }

    res.json(transaction);

  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to fetch transaction', 
      details: errorMessage 
    });
  }
});

// GET /nft/:collectionId/:itemId - Get specific NFT info
app.get('/nft/:collectionId/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const collectionId = parseInt(req.params.collectionId);
    const itemId = parseInt(req.params.itemId);

    if (isNaN(collectionId) || isNaN(itemId)) {
      res.status(400).json({ 
        error: 'Invalid collection ID or item ID' 
      });
      return;
    }

    // Use caching for NFT info
    const nftInfo = await withCache(
      cacheKeys.nft(collectionId, itemId),
      async () => {
        return await polkadotService.getNFTInfo(collectionId, itemId);
      },
      nftCache,
      600 // 10 minutes cache
    );
    
    if (!nftInfo) {
      res.status(404).json({ 
        error: 'NFT not found' 
      });
      return;
    }

    res.json(nftInfo);

  } catch (error) {
    console.error('Failed to fetch NFT info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to fetch NFT info', 
      details: errorMessage 
    });
  }
});

// --- PAPI Routes ---

// POST /api/papi/connect - Connect to PAPI services
app.post('/api/papi/connect', async (req: Request, res: Response): Promise<void> => {
  try {
    const { account, chainType } = req.body;

    if (!account) {
      res.status(400).json({ 
        error: 'Account address is required' 
      });
      return;
    }

    if (!papiService) {
      res.status(503).json({ 
        error: 'PAPI service not available' 
      });
      return;
    }

    const result = await papiService.connectAccount(account, chainType);
    
    if (!result.success) {
      res.status(400).json({ 
        error: 'Failed to connect to PAPI' 
      });
      return;
    }

    res.json({
      success: true,
      accountInfo: result.accountInfo,
      supportedChains: result.supportedChains
    });

  } catch (error) {
    console.error('PAPI connect error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'PAPI connection failed', 
      details: errorMessage 
    });
  }
});

// POST /api/papi/disconnect - Disconnect from PAPI services
app.post('/api/papi/disconnect', async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true });
  } catch (error) {
    console.error('PAPI disconnect error:', error);
    res.status(500).json({ 
      error: 'PAPI disconnection failed' 
    });
  }
});

// GET /api/papi/account/:address/nfts - Get NFTs via PAPI
app.get('/api/papi/account/:address/nfts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    if (!papiService) {
      res.status(503).json({ 
        error: 'PAPI service not available' 
      });
      return;
    }

    const nfts = await papiService.getAccountNFTs(address);
    res.json({ nfts });

  } catch (error) {
    console.error('Failed to fetch NFTs via PAPI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to fetch NFTs', 
      details: errorMessage 
    });
  }
});

// POST /api/papi/mint - Mint NFT via PAPI
app.post('/api/papi/mint', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerAddress, metadataUrl, collectionId, chainId } = req.body;

    if (!ownerAddress || !metadataUrl) {
      res.status(400).json({ 
        error: 'Owner address and metadata URL are required' 
      });
      return;
    }

    if (!papiService) {
      res.status(503).json({ 
        error: 'PAPI service not available' 
      });
      return;
    }

    const result = await papiService.mintNFT({
      ownerAddress,
      metadataUrl,
      collectionId,
      chainId
    });

    if (!result.success) {
      res.status(400).json({ 
        error: result.error || 'Minting failed' 
      });
      return;
    }

    res.json({
      success: true,
      transactionHash: result.transactionHash,
      tokenId: result.tokenId
    });

  } catch (error) {
    console.error('PAPI mint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Minting failed', 
      details: errorMessage 
    });
  }
});

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// --- Graceful Shutdown ---
function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  rateLimiters.destroy();
  transactionManager.stopStatusPolling();

  polkadotService.cleanup().catch(err => {
    console.error('Error during polkadot service cleanup:', err);
  });

  setTimeout(() => {
    console.log('Shutdown complete.');
    process.exit(0);
  }, 2000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// --- Server Start ---
if (require.main === module) {
  app.listen(port, () => {
    console.log(`NFT Minting Service listening at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('  POST /mint - Mint new NFT');
    console.log('  GET /portfolio/:address - Get user portfolio');
    console.log('  GET /community - Get community feed');
    console.log('  GET /transaction/:id - Get transaction status');
    console.log('  GET /nft/:collectionId/:itemId - Get NFT info');
  });
}