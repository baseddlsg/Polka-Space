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
Object.defineProperty(exports, "__esModule", { value: true });
const metadataProcessor_1 = require("../services/metadataProcessor");
describe('MetadataProcessor', () => {
    let metadataProcessor;
    beforeEach(() => {
        metadataProcessor = new metadataProcessor_1.MetadataProcessor();
    });
    describe('processMetadata', () => {
        const validRawMetadata = {
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
            materials: [
                {
                    name: 'TestMaterial',
                    type: 'PBR',
                    properties: {
                        color: '#ff0000',
                        metallic: 0.5
                    }
                }
            ],
            creator: 'Test Creator',
            attributes: {
                category: 'Art',
                style: 'Modern'
            }
        };
        it('should process valid metadata successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield metadataProcessor.processMetadata(validRawMetadata);
            expect(result).toHaveProperty('id');
            expect(result.name).toBe('Test NFT');
            expect(result.description).toBe('A test 3D NFT');
            expect(result.creator).toBe('Test Creator');
            expect(result).toHaveProperty('timestamp');
            expect(result.model.url).toBe('https://example.com/model.glb');
            expect(result.model.format).toBe('glb');
            expect(result.materials).toHaveLength(1);
            expect(result.materials[0].name).toBe('TestMaterial');
            expect(result.attributes.category).toBe('Art');
        }));
        it('should generate ID if not provided', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield metadataProcessor.processMetadata(validRawMetadata);
            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('string');
        }));
        it('should use provided ID', () => __awaiter(void 0, void 0, void 0, function* () {
            const metadataWithId = Object.assign(Object.assign({}, validRawMetadata), { id: 'custom-id' });
            const result = yield metadataProcessor.processMetadata(metadataWithId);
            expect(result.id).toBe('custom-id');
        }));
        it('should set timestamp if not provided', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield metadataProcessor.processMetadata(validRawMetadata);
            expect(result.timestamp).toBeDefined();
            expect(typeof result.timestamp).toBe('number');
        }));
        it('should throw error for missing name', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidMetadata = Object.assign({}, validRawMetadata);
            delete invalidMetadata.name;
            yield expect(metadataProcessor.processMetadata(invalidMetadata))
                .rejects.toThrow('NFT name is required');
        }));
        it('should throw error for missing model URL', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidMetadata = Object.assign(Object.assign({}, validRawMetadata), { model: Object.assign({}, validRawMetadata.model) });
            delete invalidMetadata.model.url;
            yield expect(metadataProcessor.processMetadata(invalidMetadata))
                .rejects.toThrow('3D model URL is required');
        }));
        it('should detect model format from URL', () => __awaiter(void 0, void 0, void 0, function* () {
            const metadataWithoutFormat = Object.assign(Object.assign({}, validRawMetadata), { model: {
                    url: 'https://example.com/model.gltf',
                    size: 1000000,
                    dimensions: { width: 1, height: 1, depth: 1 }
                } });
            const result = yield metadataProcessor.processMetadata(metadataWithoutFormat);
            expect(result.model.format).toBe('gltf');
        }));
        it('should throw error for unsupported model format', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidMetadata = Object.assign(Object.assign({}, validRawMetadata), { model: {
                    url: 'https://example.com/model.obj',
                    size: 1000000,
                    dimensions: { width: 1, height: 1, depth: 1 }
                } });
            yield expect(metadataProcessor.processMetadata(invalidMetadata))
                .rejects.toThrow();
        }));
        it('should validate material types', () => __awaiter(void 0, void 0, void 0, function* () {
            const metadataWithInvalidMaterial = Object.assign(Object.assign({}, validRawMetadata), { materials: [
                    {
                        name: 'TestMaterial',
                        type: 'InvalidType',
                        properties: {}
                    }
                ] });
            const result = yield metadataProcessor.processMetadata(metadataWithInvalidMaterial);
            expect(result.materials[0].type).toBe('Standard'); // Should default to Standard
        }));
        it('should sanitize attribute keys', () => __awaiter(void 0, void 0, void 0, function* () {
            const metadataWithSpecialChars = Object.assign(Object.assign({}, validRawMetadata), { attributes: {
                    'special-key!@#': 'value1',
                    'normal_key': 'value2'
                } });
            const result = yield metadataProcessor.processMetadata(metadataWithSpecialChars);
            expect(result.attributes).toHaveProperty('special_key___');
            expect(result.attributes).toHaveProperty('normal_key');
        }));
        it('should handle empty materials array', () => __awaiter(void 0, void 0, void 0, function* () {
            const metadataWithoutMaterials = Object.assign(Object.assign({}, validRawMetadata), { materials: [] });
            const result = yield metadataProcessor.processMetadata(metadataWithoutMaterials);
            expect(result.materials).toEqual([]);
        }));
        it('should set default values for missing optional fields', () => __awaiter(void 0, void 0, void 0, function* () {
            const minimalMetadata = {
                name: 'Test NFT',
                model: {
                    url: 'https://example.com/model.glb'
                }
            };
            const result = yield metadataProcessor.processMetadata(minimalMetadata);
            expect(result.description).toBe('');
            expect(result.creator).toBe('Unknown');
            expect(result.materials).toEqual([]);
            expect(result.attributes).toEqual({});
        }));
    });
    describe('uploadToIPFS', () => {
        it('should simulate IPFS upload for buffer data', () => __awaiter(void 0, void 0, void 0, function* () {
            const testData = Buffer.from('test data');
            const result = yield metadataProcessor.uploadToIPFS(testData, 'test.txt');
            expect(result).toHaveProperty('hash');
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('size');
            expect(result.hash).toMatch(/^Qm[a-zA-Z0-9]+$/);
            expect(result.url).toContain(result.hash);
            expect(result.size).toBe(testData.length);
        }));
        it('should simulate IPFS upload for string data', () => __awaiter(void 0, void 0, void 0, function* () {
            const testData = 'test string data';
            const result = yield metadataProcessor.uploadToIPFS(testData);
            expect(result).toHaveProperty('hash');
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('size');
            expect(result.size).toBe(Buffer.byteLength(testData, 'utf8'));
        }));
    });
    describe('uploadMetadataToIPFS', () => {
        it('should upload metadata JSON to IPFS', () => __awaiter(void 0, void 0, void 0, function* () {
            const metadata = {
                id: 'test-1',
                name: 'Test NFT',
                description: 'Test description',
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
            const result = yield metadataProcessor.uploadMetadataToIPFS(metadata);
            expect(result).toHaveProperty('hash');
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('size');
            expect(result.size).toBeGreaterThan(0);
        }));
    });
    describe('retrieveFromIPFS', () => {
        it('should retrieve data from temporary storage', () => __awaiter(void 0, void 0, void 0, function* () {
            const testData = 'test data';
            const uploadResult = yield metadataProcessor.uploadToIPFS(testData);
            const retrievedData = yield metadataProcessor.retrieveFromIPFS(uploadResult.hash);
            expect(retrievedData).toBe(testData);
        }));
        it('should return null for non-existent hash', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield metadataProcessor.retrieveFromIPFS('QmNonExistentHash');
            expect(result).toBeNull();
        }));
    });
    describe('getStats', () => {
        it('should return processor statistics', () => {
            const stats = metadataProcessor.getStats();
            expect(stats).toHaveProperty('tempStorageSize');
            expect(stats).toHaveProperty('ipfsGateway');
            expect(typeof stats.tempStorageSize).toBe('number');
            expect(typeof stats.ipfsGateway).toBe('string');
        });
    });
    describe('clearTempStorage', () => {
        it('should clear temporary storage', () => __awaiter(void 0, void 0, void 0, function* () {
            // Upload some data first
            yield metadataProcessor.uploadToIPFS('test data');
            let stats = metadataProcessor.getStats();
            expect(stats.tempStorageSize).toBeGreaterThan(0);
            metadataProcessor.clearTempStorage();
            stats = metadataProcessor.getStats();
            expect(stats.tempStorageSize).toBe(0);
        }));
    });
});
