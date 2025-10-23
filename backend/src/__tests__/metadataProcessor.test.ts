import { MetadataProcessor } from '../services/metadataProcessor';
import { NFTMetadata } from '../types/nft';

describe('MetadataProcessor', () => {
  let metadataProcessor: MetadataProcessor;

  beforeEach(() => {
    metadataProcessor = new MetadataProcessor();
  });

  describe('processMetadata', () => {
    const validRawMetadata = {
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
      materials: [
        {
          name: 'TestMaterial',
          type: 'PBR' as const,
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

    it('should process valid metadata successfully', async () => {
      const result = await metadataProcessor.processMetadata(validRawMetadata);

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
    });

    it('should generate ID if not provided', async () => {
      const result = await metadataProcessor.processMetadata(validRawMetadata);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('should use provided ID', async () => {
      const metadataWithId = { ...validRawMetadata, id: 'custom-id' };
      const result = await metadataProcessor.processMetadata(metadataWithId);
      expect(result.id).toBe('custom-id');
    });

    it('should set timestamp if not provided', async () => {
      const result = await metadataProcessor.processMetadata(validRawMetadata);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    });

    it('should throw error for missing name', async () => {
      const invalidMetadata = { ...validRawMetadata };
      delete (invalidMetadata as any).name;

      await expect(metadataProcessor.processMetadata(invalidMetadata))
        .rejects.toThrow('NFT name is required');
    });

    it('should throw error for missing model URL', async () => {
      const invalidMetadata = {
        ...validRawMetadata,
        model: { ...validRawMetadata.model }
      };
      delete (invalidMetadata.model as any).url;

      await expect(metadataProcessor.processMetadata(invalidMetadata))
        .rejects.toThrow('3D model URL is required');
    });

    it('should detect model format from URL', async () => {
      const metadataWithoutFormat = {
        ...validRawMetadata,
        model: {
          url: 'https://example.com/model.gltf',
          size: 1000000,
          dimensions: { width: 1, height: 1, depth: 1 }
        } as any
      };

      const result = await metadataProcessor.processMetadata(metadataWithoutFormat);
      expect(result.model.format).toBe('gltf');
    });

    it('should throw error for unsupported model format', async () => {
      const invalidMetadata = {
        ...validRawMetadata,
        model: {
          url: 'https://example.com/model.obj',
          size: 1000000,
          dimensions: { width: 1, height: 1, depth: 1 }
        }
      } as any;

      await expect(metadataProcessor.processMetadata(invalidMetadata))
        .rejects.toThrow();
    });

    it('should validate material types', async () => {
      const metadataWithInvalidMaterial = {
        ...validRawMetadata,
        materials: [
          {
            name: 'TestMaterial',
            type: 'InvalidType',
            properties: {}
          }
        ] as any
      };

      const result = await metadataProcessor.processMetadata(metadataWithInvalidMaterial);
      expect(result.materials[0].type).toBe('Standard'); // Should default to Standard
    });

    it('should sanitize attribute keys', async () => {
      const metadataWithSpecialChars = {
        ...validRawMetadata,
        attributes: {
          'special-key!@#': 'value1',
          'normal_key': 'value2'
        }
      };

      const result = await metadataProcessor.processMetadata(metadataWithSpecialChars);
      expect(result.attributes).toHaveProperty('special_key___');
      expect(result.attributes).toHaveProperty('normal_key');
    });

    it('should handle empty materials array', async () => {
      const metadataWithoutMaterials = {
        ...validRawMetadata,
        materials: []
      };

      const result = await metadataProcessor.processMetadata(metadataWithoutMaterials);
      expect(result.materials).toEqual([]);
    });

    it('should set default values for missing optional fields', async () => {
      const minimalMetadata = {
        name: 'Test NFT',
        model: {
          url: 'https://example.com/model.glb'
        }
      } as any;

      const result = await metadataProcessor.processMetadata(minimalMetadata);
      expect(result.description).toBe('');
      expect(result.creator).toBe('Unknown');
      expect(result.materials).toEqual([]);
      expect(result.attributes).toEqual({});
    });
  });

  describe('uploadToIPFS', () => {
    it('should simulate IPFS upload for buffer data', async () => {
      const testData = Buffer.from('test data');
      const result = await metadataProcessor.uploadToIPFS(testData, 'test.txt');

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.hash).toMatch(/^Qm[a-zA-Z0-9]+$/);
      expect(result.url).toContain(result.hash);
      expect(result.size).toBe(testData.length);
    });

    it('should simulate IPFS upload for string data', async () => {
      const testData = 'test string data';
      const result = await metadataProcessor.uploadToIPFS(testData);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.size).toBe(Buffer.byteLength(testData, 'utf8'));
    });
  });

  describe('uploadMetadataToIPFS', () => {
    it('should upload metadata JSON to IPFS', async () => {
      const metadata: NFTMetadata = {
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

      const result = await metadataProcessor.uploadMetadataToIPFS(metadata);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe('retrieveFromIPFS', () => {
    it('should retrieve data from temporary storage', async () => {
      const testData = 'test data';
      const uploadResult = await metadataProcessor.uploadToIPFS(testData);
      
      const retrievedData = await metadataProcessor.retrieveFromIPFS(uploadResult.hash);
      expect(retrievedData).toBe(testData);
    });

    it('should return null for non-existent hash', async () => {
      const result = await metadataProcessor.retrieveFromIPFS('QmNonExistentHash');
      expect(result).toBeNull();
    });
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
    it('should clear temporary storage', async () => {
      // Upload some data first
      await metadataProcessor.uploadToIPFS('test data');
      
      let stats = metadataProcessor.getStats();
      expect(stats.tempStorageSize).toBeGreaterThan(0);
      
      metadataProcessor.clearTempStorage();
      
      stats = metadataProcessor.getStats();
      expect(stats.tempStorageSize).toBe(0);
    });
  });
});