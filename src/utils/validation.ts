/**
 * Validation utilities for NFT metadata and 3D models
 */

import { NFTMetadata, MaterialProperty, Model3D, MintRequest } from '../types';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates 3D model format and properties
 */
export function validateModel3D(model: Model3D): void {
  if (!model.url || typeof model.url !== 'string') {
    throw new ValidationError('Model URL is required and must be a string', 'model.url');
  }

  if (!model.format || !['glb', 'gltf'].includes(model.format)) {
    throw new ValidationError('Model format must be either "glb" or "gltf"', 'model.format');
  }

  if (!model.size || typeof model.size !== 'number' || model.size <= 0) {
    throw new ValidationError('Model size must be a positive number', 'model.size');
  }

  if (!model.dimensions) {
    throw new ValidationError('Model dimensions are required', 'model.dimensions');
  }

  const { width, height, depth } = model.dimensions;
  if (typeof width !== 'number' || width <= 0 ||
      typeof height !== 'number' || height <= 0 ||
      typeof depth !== 'number' || depth <= 0) {
    throw new ValidationError('Model dimensions must be positive numbers', 'model.dimensions');
  }
}

/**
 * Validates material properties
 */
export function validateMaterialProperty(material: MaterialProperty): void {
  if (!material.name || typeof material.name !== 'string') {
    throw new ValidationError('Material name is required and must be a string', 'material.name');
  }

  if (!material.type || !['PBR', 'Standard', 'Custom'].includes(material.type)) {
    throw new ValidationError('Material type must be "PBR", "Standard", or "Custom"', 'material.type');
  }

  if (!material.properties || typeof material.properties !== 'object') {
    throw new ValidationError('Material properties must be an object', 'material.properties');
  }
}

/**
 * Validates NFT metadata structure and returns validation result
 */
export function validateNFTMetadataWithResult(metadata: Partial<NFTMetadata>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    if (metadata.id) {
      validateNFTMetadata(metadata as NFTMetadata);
    } else {
      // Validate individual fields for partial metadata
      if (!metadata.name || typeof metadata.name !== 'string') {
        errors.push('NFT name is required and must be a string');
      }

      if (!metadata.description || typeof metadata.description !== 'string') {
        errors.push('NFT description is required and must be a string');
      }

      if (!metadata.creator || typeof metadata.creator !== 'string') {
        errors.push('NFT creator is required and must be a string');
      }

      if (metadata.model) {
        try {
          validateModel3D(metadata.model);
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(error.message);
          }
        }
      }

      if (metadata.materials && Array.isArray(metadata.materials)) {
        metadata.materials.forEach((material, index) => {
          try {
            validateMaterialProperty(material);
          } catch (error) {
            if (error instanceof ValidationError) {
              errors.push(`Material ${index}: ${error.message}`);
            }
          }
        });
      }
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message);
    } else {
      errors.push('Unknown validation error');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates NFT metadata structure
 */
export function validateNFTMetadata(metadata: NFTMetadata): void {
  if (!metadata.id || typeof metadata.id !== 'string') {
    throw new ValidationError('NFT ID is required and must be a string', 'id');
  }

  if (!metadata.name || typeof metadata.name !== 'string') {
    throw new ValidationError('NFT name is required and must be a string', 'name');
  }

  if (!metadata.description || typeof metadata.description !== 'string') {
    throw new ValidationError('NFT description is required and must be a string', 'description');
  }

  if (!metadata.creator || typeof metadata.creator !== 'string') {
    throw new ValidationError('NFT creator is required and must be a string', 'creator');
  }

  if (!metadata.timestamp || typeof metadata.timestamp !== 'number') {
    throw new ValidationError('NFT timestamp is required and must be a number', 'timestamp');
  }

  // Validate 3D model
  validateModel3D(metadata.model);

  // Validate materials
  if (!Array.isArray(metadata.materials)) {
    throw new ValidationError('Materials must be an array', 'materials');
  }

  metadata.materials.forEach((material, index) => {
    try {
      validateMaterialProperty(material);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Material ${index}: ${error.message}`, `materials[${index}].${error.field}`);
      }
      throw error;
    }
  });

  if (!metadata.attributes || typeof metadata.attributes !== 'object') {
    throw new ValidationError('Attributes must be an object', 'attributes');
  }
}

/**
 * Validates mint request data
 */
export function validateMintRequest(request: MintRequest): void {
  if (!request.walletAddress || typeof request.walletAddress !== 'string') {
    throw new ValidationError('Wallet address is required and must be a string', 'walletAddress');
  }

  if (!request.metadata) {
    throw new ValidationError('Metadata is required', 'metadata');
  }

  // Create a temporary NFT metadata object for validation
  const tempMetadata: NFTMetadata = {
    ...request.metadata,
    id: 'temp-id',
    timestamp: Date.now()
  };

  validateNFTMetadata(tempMetadata);
}

/**
 * Sanitizes metadata by removing potentially harmful content
 */
export function sanitizeMetadata(metadata: Partial<NFTMetadata>): Partial<NFTMetadata> {
  const sanitized = { ...metadata };

  // Sanitize string fields
  if (sanitized.name) {
    sanitized.name = sanitized.name.trim().substring(0, 100);
  }

  if (sanitized.description) {
    sanitized.description = sanitized.description.trim().substring(0, 1000);
  }

  if (sanitized.creator) {
    sanitized.creator = sanitized.creator.trim();
  }

  // Ensure attributes don't contain functions or dangerous content
  if (sanitized.attributes) {
    sanitized.attributes = JSON.parse(JSON.stringify(sanitized.attributes));
  }

  return sanitized;
}

/**
 * Checks if a file URL has a valid 3D model extension
 */
export function isValid3DModelUrl(url: string): boolean {
  const validExtensions = ['.glb', '.gltf'];
  const lowercaseUrl = url.toLowerCase();
  return validExtensions.some(ext => lowercaseUrl.endsWith(ext));
}

/**
 * Validates file size constraints for 3D models
 */
export function validateModelSize(sizeInBytes: number): void {
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB limit
  
  if (sizeInBytes > MAX_SIZE) {
    throw new ValidationError(`Model size ${sizeInBytes} bytes exceeds maximum allowed size of ${MAX_SIZE} bytes`, 'model.size');
  }
}