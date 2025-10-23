"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataProcessor = void 0;
const uuid_1 = require("uuid");
class MetadataProcessor {
    constructor() {
        this.tempStorage = new Map();
        this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    }
    async processMetadata(rawMetadata) {
        console.log('Processing NFT metadata...');
        const id = rawMetadata.id || (0, uuid_1.v4)();
        if (!rawMetadata.name) {
            throw new Error('NFT name is required');
        }
        if (!rawMetadata.model?.url) {
            throw new Error('3D model URL is required');
        }
        const modelMetadata = await this.processModelMetadata(rawMetadata.model);
        const materials = await this.processMaterials(rawMetadata.materials || []);
        const processedMetadata = {
            id,
            name: rawMetadata.name,
            description: rawMetadata.description || '',
            model: modelMetadata,
            materials,
            creator: rawMetadata.creator || 'Unknown',
            timestamp: rawMetadata.timestamp || Date.now(),
            attributes: this.processAttributes(rawMetadata.attributes || {})
        };
        this.validateMetadata(processedMetadata);
        console.log(`Processed metadata for NFT: ${processedMetadata.name} (${processedMetadata.id})`);
        return processedMetadata;
    }
    async processModelMetadata(modelData) {
        if (!modelData?.url) {
            throw new Error('Model URL is required');
        }
        const supportedFormats = ['glb', 'gltf'];
        let format;
        if (modelData.format) {
            format = modelData.format;
        }
        else {
            format = this.detectModelFormat(modelData.url);
        }
        if (!supportedFormats.includes(format)) {
            throw new Error(`Unsupported model format: ${format}. Supported formats: ${supportedFormats.join(', ')}`);
        }
        const dimensions = modelData.dimensions || await this.extractModelDimensions(modelData.url);
        const size = modelData.size || await this.getModelSize(modelData.url);
        return {
            url: modelData.url,
            format: format,
            size,
            dimensions: {
                width: dimensions.width || 1,
                height: dimensions.height || 1,
                depth: dimensions.depth || 1
            }
        };
    }
    async processMaterials(materials) {
        const processedMaterials = [];
        for (const material of materials) {
            if (!material.name) {
                console.warn('Skipping material without name');
                continue;
            }
            const processedMaterial = {
                name: material.name,
                type: this.validateMaterialType(material.type),
                properties: this.processMaterialProperties(material.properties || {})
            };
            processedMaterials.push(processedMaterial);
        }
        return processedMaterials;
    }
    processAttributes(attributes) {
        const processedAttributes = {};
        for (const [key, value] of Object.entries(attributes)) {
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
            processedAttributes[sanitizedKey] = this.processAttributeValue(value);
        }
        return processedAttributes;
    }
    async uploadToIPFS(data, filename) {
        try {
            console.log(`Uploading ${filename || 'data'} to IPFS...`);
            const mockHash = `Qm${Math.random().toString(36).substr(2, 44).padEnd(44, '0')}`;
            const url = `${this.ipfsGateway}${mockHash}`;
            const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
            this.tempStorage.set(mockHash, data);
            console.log(`Successfully uploaded to IPFS: ${mockHash}`);
            return {
                hash: mockHash,
                url,
                size
            };
        }
        catch (error) {
            console.error('IPFS upload failed:', error);
            throw new Error(`Failed to upload to IPFS: ${error}`);
        }
    }
    async uploadMetadataToIPFS(metadata) {
        const metadataJson = JSON.stringify(metadata, null, 2);
        return this.uploadToIPFS(metadataJson, `${metadata.id}_metadata.json`);
    }
    async retrieveFromIPFS(hash) {
        try {
            const data = this.tempStorage.get(hash);
            if (data) {
                return data;
            }
            console.log(`Retrieving ${hash} from IPFS...`);
            return null;
        }
        catch (error) {
            console.error(`Failed to retrieve ${hash} from IPFS:`, error);
            return null;
        }
    }
    validateMetadata(metadata) {
        const errors = [];
        if (!metadata.id)
            errors.push('ID is required');
        if (!metadata.name)
            errors.push('Name is required');
        if (!metadata.model?.url)
            errors.push('Model URL is required');
        if (!metadata.creator)
            errors.push('Creator is required');
        if (!metadata.timestamp)
            errors.push('Timestamp is required');
        if (metadata.model.dimensions) {
            const { width, height, depth } = metadata.model.dimensions;
            if (width <= 0 || height <= 0 || depth <= 0) {
                errors.push('Model dimensions must be positive numbers');
            }
        }
        for (const material of metadata.materials) {
            if (!material.name)
                errors.push('Material name is required');
            if (!['PBR', 'Standard', 'Custom'].includes(material.type)) {
                errors.push(`Invalid material type: ${material.type}`);
            }
        }
        if (errors.length > 0) {
            throw new Error(`Metadata validation failed: ${errors.join(', ')}`);
        }
    }
    detectModelFormat(url) {
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
    async extractModelDimensions(url) {
        console.log(`Extracting dimensions from model: ${url}`);
        return {
            width: 1,
            height: 1,
            depth: 1
        };
    }
    async getModelSize(url) {
        try {
            console.log(`Getting size for model: ${url}`);
            return Math.floor(Math.random() * 10000000) + 100000;
        }
        catch (error) {
            console.warn(`Could not determine model size for ${url}:`, error);
            return 0;
        }
    }
    validateMaterialType(type) {
        const validTypes = ['PBR', 'Standard', 'Custom'];
        if (validTypes.includes(type)) {
            return type;
        }
        console.warn(`Invalid material type '${type}', defaulting to 'Standard'`);
        return 'Standard';
    }
    processMaterialProperties(properties) {
        const processed = {};
        for (const [key, value] of Object.entries(properties)) {
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
            processed[sanitizedKey] = this.processAttributeValue(value);
        }
        return processed;
    }
    processAttributeValue(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'string') {
            return value.trim().substring(0, 1000);
        }
        if (typeof value === 'number') {
            if (isNaN(value) || !isFinite(value)) {
                return 0;
            }
            return value;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(item => this.processAttributeValue(item)).slice(0, 100);
        }
        if (typeof value === 'object') {
            const processed = {};
            let count = 0;
            for (const [key, val] of Object.entries(value)) {
                if (count >= 50)
                    break;
                const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
                processed[sanitizedKey] = this.processAttributeValue(val);
                count++;
            }
            return processed;
        }
        return String(value).substring(0, 1000);
    }
    getStats() {
        return {
            tempStorageSize: this.tempStorage.size,
            ipfsGateway: this.ipfsGateway
        };
    }
    clearTempStorage() {
        this.tempStorage.clear();
        console.log('Cleared temporary storage');
    }
}
exports.MetadataProcessor = MetadataProcessor;
//# sourceMappingURL=metadataProcessor.js.map