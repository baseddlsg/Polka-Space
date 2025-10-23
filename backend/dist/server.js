"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const transactionManager_1 = require("./services/transactionManager");
const metadataProcessor_1 = require("./services/metadataProcessor");
const notificationService_1 = require("./services/notificationService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
const transactionManager = new transactionManager_1.TransactionManager();
const metadataProcessor = new metadataProcessor_1.MetadataProcessor();
const notificationService = new notificationService_1.NotificationService();
const mockPAPIService = {
    validateAddress: (address) => {
        return Boolean(address && address.length > 10);
    },
    mintNFT: async (ownerAddress, metadata) => {
        return {
            txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            collectionId: 1,
            itemId: Math.floor(Math.random() * 1000) + 1
        };
    },
    getNFTsByOwner: async (address) => {
        return [];
    },
    getNFTInfo: async (collectionId, itemId) => {
        return {
            collectionId,
            itemId,
            owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        };
    }
};
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        services: {
            papi: true,
            transactionManager: true,
            metadataProcessor: true
        }
    });
});
app.post('/mint', async (req, res) => {
    try {
        const mintRequest = req.body;
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
        const response = {
            transactionHash: mintResult.txHash,
            collectionId: mintResult.collectionId,
            itemId: mintResult.itemId,
            metadata: processedMetadata
        };
        res.json(response);
    }
    catch (error) {
        console.error('Minting failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            error: 'Minting failed',
            details: errorMessage
        });
    }
});
app.get('/portfolio/:address', async (req, res) => {
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
    }
    catch (error) {
        console.error('Failed to fetch portfolio:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            error: 'Failed to fetch portfolio',
            details: errorMessage
        });
    }
});
app.get('/community', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
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
    }
    catch (error) {
        console.error('Failed to fetch community feed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            error: 'Failed to fetch community feed',
            details: errorMessage
        });
    }
});
app.get('/transaction/:id', async (req, res) => {
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
    }
    catch (error) {
        console.error('Failed to fetch transaction:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            error: 'Failed to fetch transaction',
            details: errorMessage
        });
    }
});
app.get('/nft/:collectionId/:itemId', async (req, res) => {
    try {
        const collectionId = parseInt(req.params.collectionId);
        const itemId = parseInt(req.params.itemId);
        if (isNaN(collectionId) || isNaN(itemId)) {
            res.status(400).json({
                error: 'Invalid collection ID or item ID'
            });
            return;
        }
        const nftInfo = await mockPAPIService.getNFTInfo(collectionId, itemId);
        if (!nftInfo) {
            res.status(404).json({
                error: 'NFT not found'
            });
            return;
        }
        res.json(nftInfo);
    }
    catch (error) {
        console.error('Failed to fetch NFT info:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            error: 'Failed to fetch NFT info',
            details: errorMessage
        });
    }
});
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: error.message
    });
});
app.listen(port, () => {
    console.log(`NFT Minting Service listening at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('  POST /mint - Mint new NFT');
    console.log('  GET /portfolio/:address - Get user portfolio');
    console.log('  GET /community - Get community feed');
    console.log('  GET /transaction/:id - Get transaction status');
    console.log('  GET /nft/:collectionId/:itemId - Get NFT info');
});
//# sourceMappingURL=server.js.map