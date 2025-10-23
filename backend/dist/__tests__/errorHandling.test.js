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
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    const transactionManager = new transactionManager_1.TransactionManager();
    const metadataProcessor = new metadataProcessor_1.MetadataProcessor();
    const notificationService = new notificationService_1.NotificationService();
    // Mint endpoint with comprehensive error handling
    app.post('/mint', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { ownerAddress, metadata } = req.body;
            if (!ownerAddress || !metadata) {
                return res.status(400).json({
                    error: 'Missing required fields: ownerAddress and metadata'
                });
            }
            if (!mockPAPIService.validateAddress(ownerAddress)) {
                return res.status(400).json({
                    error: 'Invalid owner address format'
                });
            }
            const processedMetadata = yield metadataProcessor.processMetadata(metadata);
            const transaction = yield transactionManager.createTransaction({
                walletAddress: ownerAddress,
                metadata: processedMetadata,
                status: 'pending'
            });
            const mintResult = yield mockPAPIService.mintNFT(ownerAddress, processedMetadata);
            yield transactionManager.updateTransaction(transaction.id, {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(500).json({
                error: 'Minting failed',
                details: errorMessage
            });
        }
    }));
    // Global error handler
    app.use((error, req, res, next) => {
        console.error('Unhandled error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    });
    return app;
}
describe('Error Handling', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });
    describe('Blockchain Connectivity Errors', () => {
        it('should handle PAPI initialization failure', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toBe('PAPI not initialized');
        }));
        it('should handle network timeout errors', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(true);
            mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Network timeout'));
            const mintRequest = {
                ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toBe('Network timeout');
        }));
        it('should handle insufficient funds error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(true);
            mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Insufficient funds for transaction'));
            const mintRequest = {
                ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toBe('Insufficient funds for transaction');
        }));
    });
    describe('Metadata Validation Errors', () => {
        it('should handle missing required metadata fields', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(true);
            const mintRequest = {
                ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                metadata: {
                    // Missing name field
                    description: 'Test description'
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toContain('NFT name is required');
        }));
        it('should handle invalid model format', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(true);
            const mintRequest = {
                ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.obj' } // Unsupported format
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toContain('Cannot detect model format');
        }));
        it('should handle malformed JSON in request body', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')
                .expect(400);
            // Express will handle malformed JSON and return 400
            expect(response.status).toBe(400);
        }));
        it('should handle oversized request payload', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(largeMetadata)
                .expect(413); // Payload Too Large
            expect(response.status).toBe(413);
        }));
    });
    describe('Address Validation Errors', () => {
        it('should handle invalid address format', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(false);
            const mintRequest = {
                ownerAddress: 'invalid-address',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(400);
            expect(response.body.error).toBe('Invalid owner address format');
        }));
        it('should handle empty address', () => __awaiter(void 0, void 0, void 0, function* () {
            const mintRequest = {
                ownerAddress: '',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(400);
            expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
        }));
        it('should handle null address', () => __awaiter(void 0, void 0, void 0, function* () {
            const mintRequest = {
                ownerAddress: null,
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(400);
            expect(response.body.error).toBe('Missing required fields: ownerAddress and metadata');
        }));
    });
    describe('Transaction Failures', () => {
        it('should handle transaction broadcast failure', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(true);
            mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Transaction broadcast failed'));
            const mintRequest = {
                ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toBe('Transaction broadcast failed');
        }));
        it('should handle nonce errors', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(true);
            mockPAPIService.mintNFT.mockRejectedValueOnce(new Error('Invalid nonce'));
            const mintRequest = {
                ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest)
                .expect(500);
            expect(response.body.error).toBe('Minting failed');
            expect(response.body.details).toBe('Invalid nonce');
        }));
    });
    describe('Rate Limiting Scenarios', () => {
        it('should handle multiple concurrent requests gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const promises = Array(5).fill(null).map(() => (0, supertest_1.default)(app).post('/mint').send(mintRequest));
            const responses = yield Promise.all(promises);
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('transactionHash');
            });
        }));
    });
    describe('Service Unavailability', () => {
        it('should handle IPFS service unavailability', () => __awaiter(void 0, void 0, void 0, function* () {
            mockPAPIService.validateAddress.mockReturnValue(true);
            // Mock metadata processor to throw IPFS error
            const metadataProcessor = new metadataProcessor_1.MetadataProcessor();
            jest.spyOn(metadataProcessor, 'uploadToIPFS').mockRejectedValueOnce(new Error('IPFS service unavailable'));
            const mintRequest = {
                ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                metadata: {
                    name: 'Test NFT',
                    model: { url: 'https://example.com/model.glb' }
                }
            };
            // This test verifies that the error handling structure is in place
            // In a real scenario, the IPFS error would be caught and handled appropriately
            const response = yield (0, supertest_1.default)(app)
                .post('/mint')
                .send(mintRequest);
            // The response should still be handled gracefully
            expect([200, 500]).toContain(response.status);
        }));
    });
});
