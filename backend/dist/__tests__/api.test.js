"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const transactionManager_1 = require("../services/transactionManager");
const metadataProcessor_1 = require("../services/metadataProcessor");
const notificationService_1 = require("../services/notificationService");
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
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    const transactionManager = new transactionManager_1.TransactionManager();
    const metadataProcessor = new metadataProcessor_1.MetadataProcessor();
    const notificationService = new notificationService_1.NotificationService();
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
    app.post('/mint', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const mintRequest = req.body;
            if (!mintRequest.ownerAddress || !mintRequest.metadata) {
                return res.status(400).json({
                    error: 'Missing required fields: ownerAddress and metadata'
                });
            }
            if (!mockPAPIService.validateAddress(mintRequest.ownerAddress)) {
                return res.status(400).json({
                    error: 'Invalid owner address format'
                });
            }
            const processedMetadata = yield metadataProcessor.processMetadata(mintRequest.metadata);
            const transaction = yield transactionManager.createTransaction({
                walletAddress: mintRequest.ownerAddress,
                metadata: processedMetadata,
                status: 'pending'
            });
            const mintResult = yield mockPAPIService.mintNFT(mintRequest.ownerAddress, processedMetadata);
            yield transactionManager.updateTransaction(transaction.id, {
                status: 'completed',
                transactionHash: mintResult.txHash,
                updatedAt: Date.now()
            });
            yield notificationService.notifyMintCompletion(transaction.id, mintResult);
            res.json({
                transactionHash: mintResult.txHash,
                collectionId: mintResult.collectionId,
                itemId: mintResult.itemId,
                metadata: processedMetadata
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({
                error: 'Minting failed',
                details: errorMessage
            });
        }
    }));
    // Portfolio endpoint
    app.get('/portfolio/:address', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { address } = req.params;
            if (!mockPAPIService.validateAddress(address)) {
                return res.status(400).json({
                    error: 'Invalid address format'
                });
            }
            const nfts = yield mockPAPIService.getNFTsByOwner(address);
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({
                error: 'Failed to fetch portfolio',
                details: errorMessage
            });
        }
    }));
    // Community endpoint
    app.get('/community', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const recentTransactions = yield transactionManager.getRecentTransactions(limit, offset);
            const recentMints = recentTransactions
                .filter(tx => tx.status === 'completed')
                .map(tx => tx.metadata);
            const communityFeed = {
                recentMints,
                featuredCreators: [...new Set(recentTransactions.map(tx => tx.walletAddress))],
                totalNFTs: yield transactionManager.getTotalCompletedTransactions()
            };
            res.json(communityFeed);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({
                error: 'Failed to fetch community feed',
                details: errorMessage
            });
        }
    }));
    return app;
}
describe('NFT Minting API', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });
    describe('GET /', () => {
        it('should return health check status', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
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
        }));
    });
    describe('POST /mint', () => {
        const validMintRequest = {
            ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            metadata: {
                name: 'Test NFT',
                description: 'A test 3D NFT',
                model: {
                    url: 'https://example.com/model.glb',
                    format: 'glb',
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
        it('should successfully mint an NFT with valid data', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(validMintRequest)
                .expect(200);
            expect(response.body).toHaveProperty('transactionHash');
            expect(response.body).toHaveProperty('collectionId', 1);
            expect(response.body).toHaveProperty('itemId', 1);
            expect(response.body).toHaveProperty('metadata');
            expect(response.body.metadata.name).toBe('Test NFT');
        }));
        it('should reject request without ownerAddress', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidRequest = Object.assign({}, validMintRequest);
            delete invalidRequest.ownerAddress;
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(invalidRequest)
                .expect(400);
            expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
        }));
        it('should reject request without metadata', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidRequest = Object.assign({}, validMintRequest);
            delete invalidRequest.metadata;
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(invalidRequest)
                .expect(400);
            expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
        }));
        it('should reject request with invalid address', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValueOnce(false);
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(validMintRequest)
                .expect(400);
            expect(response.body.error).toBe('Invalid owner address format');
        }));
        it('should handle minting service errors', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Blockchain connection failed'));
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(validMintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toBe('Blockchain connection failed');
        }));
        it('should handle metadata processing errors', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidMetadata = Object.assign(Object.assign({}, validMintRequest), { metadata: {
                    // Missing required name field
                    description: 'Invalid metadata'
                } });
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(invalidMetadata)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toContain('NFT name is required');
        }));
    });
    describe('GET /portfolio/:address', () => {
        const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        it('should return user portfolio', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const response = yield (0, supertest_1.default)(app)
                .get(`/portfolio/${testAddress}`)
                .expect(200);
            expect(response.body).toHaveProperty('walletAddress', testAddress);
            expect(response.body).toHaveProperty('nfts');
            expect(response.body).toHaveProperty('totalValue', 0);
            expect(response.body).toHaveProperty('createdCount', 1);
            expect(response.body).toHaveProperty('lastUpdated');
            expect(response.body.nfts).toEqual(mockNFTs);
        }));
        it('should reject invalid address', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValueOnce(false);
            const response = yield (0, supertest_1.default)(app)
                .get('/portfolio/invalid-address')
                .expect(400);
            expect(response.body.error).toBe('Invalid address format');
        }));
        it('should handle service errors', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.getNFTsByOwner.mockRejectedValueOnce(new Error('Service unavailable'));
            const response = yield (0, supertest_1.default)(app)
                .get(`/portfolio/${testAddress}`)
                .expect(500);
            expect(response.body.error).toBe('Failed to fetch portfolio');
            expect(response.body.details).toBe('Service unavailable');
        }));
    });
    describe('GET /community', () => {
        it('should return community feed', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .get('/community')
                .expect(200);
            expect(response.body).toHaveProperty('recentMints');
            expect(response.body).toHaveProperty('featuredCreators');
            expect(response.body).toHaveProperty('totalNFTs');
            expect(Array.isArray(response.body.recentMints)).toBe(true);
            expect(Array.isArray(response.body.featuredCreators)).toBe(true);
            expect(typeof response.body.totalNFTs).toBe('number');
        }));
        it('should handle query parameters', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .get('/community?limit=10&offset=5')
                .expect(200);
            expect(response.body).toHaveProperty('recentMints');
            expect(response.body).toHaveProperty('featuredCreators');
            expect(response.body).toHaveProperty('totalNFTs');
        }));
    });
});
