import { NFTMetadata, MaterialProperty } from '../types/nft';
import { v4 as uuidv4 } from 'uuid';

export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
}

export class MetadataProcessor {
  private ipfsGateway: string;
  private tempStorage: Map<string, any> = new Map();

  constructor() {
    this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
  }

  /**
   * Process and validate NFT metadata
   */
  async processMetadata(rawMetadata: Partial<NFTMetadata>): Promise<NFTMetadata> {
    console.log('Processing NFT metadata...');

    // Generate ID if not provided
    const id = rawMetadata.id || uuidv4();

    // Validate required fields
    if (!rawMetadata.name) {
      throw new Error('NFT name is required');
    }

    if (!rawMetadata.model?.url) {
      throw new Error('3D model URL is required');
    }

    // Process 3D model metadata
    const modelMetadata = await this.processModelMetadata(rawMetadata.model);

    // Process materials
    const materials = await this.processMaterials(rawMetadata.materials || []);

    // Create complete metadata object
    const processedMetadata: NFTMetadata = {
      id,
      name: rawMetadata.name,
      description: rawMetadata.description || '',
      model: modelMetadata,
      materials,
      creator: rawMetadata.creator || 'Unknown',
      timestamp: rawMetadata.timestamp || Date.now(),
      attributes: this.processAttributes(rawMetadata.attributes || {})
    };

    // Validate final metadata
    this.validateMetadata(processedMetadata);

    console.log(`Processed metadata for NFT: ${processedMetadata.name} (${processedMetadata.id})`);
    return processedMetadata;
  }

  /**
   * Process 3D model metadata and extract information
   */
  private async processModelMetadata(modelData: any): Promise<NFTMetadata['model']> {
    if (!modelData?.url) {
      throw new Error('Model URL is required');
    }

    // Validate model format
    const supportedFormats = ['glb', 'gltf'];
    let format: string;
    
    if (modelData.format) {
      format = modelData.format;
    } else {
      format = this.detectModelFormat(modelData.url);
    }
    
    if (!supportedFormats.includes(format)) {
      throw new Error(`Unsupported model format: ${format}. Supported formats: ${supportedFormats.join(', ')}`);
    }

    // Extract or validate dimensions
    const dimensions = modelData.dimensions || await this.extractModelDimensions(modelData.url);

    // Get model size
    const size = modelData.size || await this.getModelSize(modelData.url);

    return {
      url: modelData.url,
      format: format as 'glb' | 'gltf',
      size,
      dimensions: {
        width: dimensions.width || 1,
        height: dimensions.height || 1,
        depth: dimensions.depth || 1
      }
    };
  }

  /**
   * Process and validate material properties
   */
  private async processMaterials(materials: any[]): Promise<MaterialProperty[]> {
    const processedMaterials: MaterialProperty[] = [];

    for (const material of materials) {
      if (!material.name) {
        console.warn('Skipping material without name');
        continue;
      }

      const processedMaterial: MaterialProperty = {
        name: material.name,
        type: this.validateMaterialType(material.type),
        properties: this.processMaterialProperties(material.properties || {})
      };

      processedMaterials.push(processedMaterial);
    }

    return processedMaterials;
  }

  /**
   * Process custom attributes
   */
  private processAttributes(attributes: Record<string, any>): Record<string, any> {
    const processedAttributes: Record<string, any> = {};

    for (const [key, value] of Object.entries(attributes)) {
      // Sanitize attribute keys
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Process attribute values
      processedAttributes[sanitizedKey] = this.processAttributeValue(value);
    }

    return processedAttributes;
  }

  /**
   * Upload model to IPFS
   */
  async uploadToIPFS(data: Buffer | string, filename?: string): Promise<IPFSUploadResult> {
    try {
      console.log(`Uploading ${filename || 'data'} to IPFS...`);

      // In a real implementation, you would use an IPFS client like ipfs-http-client
      // For now, we'll simulate the upload
      const mockHash = `Qm${Math.random().toString(36).substr(2, 44).padEnd(44, '0')}`;
      const url = `${this.ipfsGateway}${mockHash}`;
      const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');

      // Store in temporary storage for testing
      this.tempStorage.set(mockHash, data);

      console.log(`Successfully uploaded to IPFS: ${mockHash}`);
      
      return {
        hash: mockHash,
        url,
        size
      };
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error(`Failed to upload to IPFS: ${error}`);
    }
  }

  /**
   * Upload metadata JSON to IPFS
   */
  async uploadMetadataToIPFS(metadata: NFTMetadata): Promise<IPFSUploadResult> {
    const metadataJson = JSON.stringify(metadata, null, 2);
    return this.uploadToIPFS(metadataJson, `${metadata.id}_metadata.json`);
  }

  /**
   * Retrieve data from IPFS
   */
  async retrieveFromIPFS(hash: string): Promise<Buffer | string | null> {
    try {
      // In a real implementation, you would fetch from IPFS
      // For now, check temporary storage
      const data = this.tempStorage.get(hash);
      if (data) {
        return data;
      }

      // Simulate IPFS retrieval
      console.log(`Retrieving ${hash} from IPFS...`);
      return null;
    } catch (error) {
      console.error(`Failed to retrieve ${hash} from IPFS:`, error);
      return null;
    }
  }

  /**
   * Validate complete metadata object
   */
  private validateMetadata(metadata: NFTMetadata): void {
    const errors: string[] = [];

    if (!metadata.id) errors.push('ID is required');
    if (!metadata.name) errors.push('Name is required');
    if (!metadata.model?.url) errors.push('Model URL is required');
    if (!metadata.creator) errors.push('Creator is required');
    if (!metadata.timestamp) errors.push('Timestamp is required');

    // Validate model dimensions
    if (metadata.model.dimensions) {
      const { width, height, depth } = metadata.model.dimensions;
      if (width <= 0 || height <= 0 || depth <= 0) {
        errors.push('Model dimensions must be positive numbers');
      }
    }

    // Validate materials
    for (const material of metadata.materials) {
      if (!material.name) errors.push('Material name is required');
      if (!['PBR', 'Standard', 'Custom'].includes(material.type)) {
        errors.push(`Invalid material type: ${material.type}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Metadata validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Detect model format from URL
   */
  private detectModelFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'glb':
        return 'glb';
      case 'gltf':
        return 'gltf';
      default:
        throw new Error(`Cannot detect model format from URL: ${url}`);
    }
  }

  /**
   * Extract model dimensions (simulated)
   */
  private async extractModelDimensions(url: string): Promise<{ width: number; height: number; depth: number }> {
    // In a real implementation, you would load and analyze the 3D model
    // For now, return default dimensions
    console.log(`Extracting dimensions from model: ${url}`);
    return {
      width: 1,
      height: 1,
      depth: 1
    };
  }

  /**
   * Get model file size (simulated)
   */
  private async getModelSize(url: string): Promise<number> {
    try {
      // In a real implementation, you would fetch the model and get its size
      console.log(`Getting size for model: ${url}`);
      return Math.floor(Math.random() * 10000000) + 100000; // Random size between 100KB and 10MB
    } catch (error) {
      console.warn(`Could not determine model size for ${url}:`, error);
      return 0;
    }
  }

  /**
   * Validate material type
   */
  private validateMaterialType(type: string): 'PBR' | 'Standard' | 'Custom' {
    const validTypes = ['PBR', 'Standard', 'Custom'];
    if (validTypes.includes(type)) {
      return type as 'PBR' | 'Standard' | 'Custom';
    }
    console.warn(`Invalid material type '${type}', defaulting to 'Standard'`);
    return 'Standard';
  }

  /**
   * Process material properties
   */
  private processMaterialProperties(properties: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Sanitize property keys
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
      processed[sanitizedKey] = this.processAttributeValue(value);
    }

    return processed;
  }

  /**
   * Process attribute values with type validation
   */
  private processAttributeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      // Sanitize strings
      return value.trim().substring(0, 1000); // Limit string length
    }

    if (typeof value === 'number') {
      // Validate numbers
      if (isNaN(value) || !isFinite(value)) {
        return 0;
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      // Process arrays recursively
      return value.map(item => this.processAttributeValue(item)).slice(0, 100); // Limit array size
    }

    if (typeof value === 'object') {
      // Process objects recursively
      const processed: Record<string, any> = {};
      let count = 0;
      for (const [key, val] of Object.entries(value)) {
        if (count >= 50) break; // Limit object properties
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        processed[sanitizedKey] = this.processAttributeValue(val);
        count++;
      }
      return processed;
    }

    // Convert other types to string
    return String(value).substring(0, 1000);
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    tempStorageSize: number;
    ipfsGateway: string;
  } {
    return {
      tempStorageSize: this.tempStorage.size,
      ipfsGateway: this.ipfsGateway
    };
  }

  /**
   * Clear temporary storage
   */
  clearTempStorage(): void {
    this.tempStorage.clear();
    console.log('Cleared temporary storage');
  }
}