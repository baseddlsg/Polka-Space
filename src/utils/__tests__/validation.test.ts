/**
 * Unit tests for metadata validation utilities
 * These tests can be run with any testing framework (Jest, Vitest, etc.)
 */

import {
  validateModel3D,
  validateMaterialProperty,
  validateNFTMetadata,
  validateMintRequest,
  sanitizeMetadata,
  isValid3DModelUrl,
  validateModelSize,
  ValidationError
} from '../validation';
import { NFTMetadata, MaterialProperty, Model3D, MintRequest } from '../../types';

// Test data fixtures
const validModel3D: Model3D = {
  url: 'https://example.com/model.glb',
  format: 'glb',
  size: 1024000,
  dimensions: {
    width: 10,
    height: 15,
    depth: 8
  }
};

const validMaterialProperty: MaterialProperty = {
  name: 'Metal',
  type: 'PBR',
  properties: {
    metallic: 0.8,
    roughness: 0.2
  }
};

const validNFTMetadata: NFTMetadata = {
  id: 'nft-123',
  name: 'Test NFT',
  description: 'A test NFT for validation',
  model: validModel3D,
  materials: [validMaterialProperty],
  creator: 'test-creator',
  timestamp: Date.now(),
  attributes: {
    rarity: 'common',
    category: 'art'
  }
};

// Test helper functions
function expectThrows(fn: () => void, expectedMessage?: string): void {
  let threw = false;
  let error: Error | null = null;
  
  try {
    fn();
  } catch (e) {
    threw = true;
    error = e as Error;
  }
  
  if (!threw) {
    throw new Error('Expected function to throw an error');
  }
  
  if (expectedMessage && error && !error.message.includes(expectedMessage)) {
    throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
  }
}

function expectNoThrow(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    throw new Error(`Expected function not to throw, but got: ${(e as Error).message}`);
  }
}

// Test suite for validateModel3D
export function testValidateModel3D(): void {
  console.log('Testing validateModel3D...');
  
  // Valid model should not throw
  expectNoThrow(() => validateModel3D(validModel3D));
  
  // Invalid URL
  expectThrows(() => validateModel3D({ ...validModel3D, url: '' }), 'Model URL is required');
  expectThrows(() => validateModel3D({ ...validModel3D, url: null as any }), 'Model URL is required');
  
  // Invalid format
  expectThrows(() => validateModel3D({ ...validModel3D, format: 'obj' as any }), 'Model format must be');
  expectThrows(() => validateModel3D({ ...validModel3D, format: '' as any }), 'Model format must be');
  
  // Invalid size
  expectThrows(() => validateModel3D({ ...validModel3D, size: 0 }), 'Model size must be a positive number');
  expectThrows(() => validateModel3D({ ...validModel3D, size: -100 }), 'Model size must be a positive number');
  
  // Invalid dimensions
  expectThrows(() => validateModel3D({ ...validModel3D, dimensions: null as any }), 'Model dimensions are required');
  expectThrows(() => validateModel3D({ 
    ...validModel3D, 
    dimensions: { width: 0, height: 10, depth: 10 } 
  }), 'Model dimensions must be positive numbers');
  
  console.log('✓ validateModel3D tests passed');
}

// Test suite for validateMaterialProperty
export function testValidateMaterialProperty(): void {
  console.log('Testing validateMaterialProperty...');
  
  // Valid material should not throw
  expectNoThrow(() => validateMaterialProperty(validMaterialProperty));
  
  // Invalid name
  expectThrows(() => validateMaterialProperty({ ...validMaterialProperty, name: '' }), 'Material name is required');
  expectThrows(() => validateMaterialProperty({ ...validMaterialProperty, name: null as any }), 'Material name is required');
  
  // Invalid type
  expectThrows(() => validateMaterialProperty({ ...validMaterialProperty, type: 'Invalid' as any }), 'Material type must be');
  expectThrows(() => validateMaterialProperty({ ...validMaterialProperty, type: '' as any }), 'Material type must be');
  
  // Invalid properties
  expectThrows(() => validateMaterialProperty({ ...validMaterialProperty, properties: null as any }), 'Material properties must be an object');
  expectThrows(() => validateMaterialProperty({ ...validMaterialProperty, properties: 'invalid' as any }), 'Material properties must be an object');
  
  console.log('✓ validateMaterialProperty tests passed');
}

// Test suite for validateNFTMetadata
export function testValidateNFTMetadata(): void {
  console.log('Testing validateNFTMetadata...');
  
  // Valid metadata should not throw
  expectNoThrow(() => validateNFTMetadata(validNFTMetadata));
  
  // Invalid ID
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, id: '' }), 'NFT ID is required');
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, id: null as any }), 'NFT ID is required');
  
  // Invalid name
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, name: '' }), 'NFT name is required');
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, name: null as any }), 'NFT name is required');
  
  // Invalid description
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, description: '' }), 'NFT description is required');
  
  // Invalid creator
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, creator: '' }), 'NFT creator is required');
  
  // Invalid timestamp
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, timestamp: null as any }), 'NFT timestamp is required');
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, timestamp: 'invalid' as any }), 'NFT timestamp is required');
  
  // Invalid materials array
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, materials: null as any }), 'Materials must be an array');
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, materials: 'invalid' as any }), 'Materials must be an array');
  
  // Invalid attributes
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, attributes: null as any }), 'Attributes must be an object');
  expectThrows(() => validateNFTMetadata({ ...validNFTMetadata, attributes: 'invalid' as any }), 'Attributes must be an object');
  
  console.log('✓ validateNFTMetadata tests passed');
}

// Test suite for validateMintRequest
export function testValidateMintRequest(): void {
  console.log('Testing validateMintRequest...');
  
  const validMintRequest: MintRequest = {
    walletAddress: '0x1234567890abcdef',
    metadata: {
      name: validNFTMetadata.name,
      description: validNFTMetadata.description,
      model: validNFTMetadata.model,
      materials: validNFTMetadata.materials,
      creator: validNFTMetadata.creator,
      attributes: validNFTMetadata.attributes
    }
  };
  
  // Valid request should not throw
  expectNoThrow(() => validateMintRequest(validMintRequest));
  
  // Invalid wallet address
  expectThrows(() => validateMintRequest({ ...validMintRequest, walletAddress: '' }), 'Wallet address is required');
  expectThrows(() => validateMintRequest({ ...validMintRequest, walletAddress: null as any }), 'Wallet address is required');
  
  // Invalid metadata
  expectThrows(() => validateMintRequest({ ...validMintRequest, metadata: null as any }), 'Metadata is required');
  
  console.log('✓ validateMintRequest tests passed');
}

// Test suite for sanitizeMetadata
export function testSanitizeMetadata(): void {
  console.log('Testing sanitizeMetadata...');
  
  const dirtyMetadata = {
    name: '  Test NFT with extra spaces  ',
    description: '  A very long description that should be trimmed  ',
    creator: '  creator-name  ',
    attributes: {
      rarity: 'common',
      nested: {
        value: 'test'
      }
    }
  };
  
  const sanitized = sanitizeMetadata(dirtyMetadata);
  
  // Check that strings are trimmed
  if (sanitized.name !== 'Test NFT with extra spaces') {
    throw new Error('Name should be trimmed');
  }
  
  if (sanitized.description !== 'A very long description that should be trimmed') {
    throw new Error('Description should be trimmed');
  }
  
  if (sanitized.creator !== 'creator-name') {
    throw new Error('Creator should be trimmed');
  }
  
  // Check that attributes are properly serialized
  if (!sanitized.attributes || typeof sanitized.attributes !== 'object') {
    throw new Error('Attributes should be preserved as object');
  }
  
  console.log('✓ sanitizeMetadata tests passed');
}

// Test suite for isValid3DModelUrl
export function testIsValid3DModelUrl(): void {
  console.log('Testing isValid3DModelUrl...');
  
  // Valid URLs
  if (!isValid3DModelUrl('https://example.com/model.glb')) {
    throw new Error('Should accept .glb files');
  }
  
  if (!isValid3DModelUrl('https://example.com/model.gltf')) {
    throw new Error('Should accept .gltf files');
  }
  
  if (!isValid3DModelUrl('https://example.com/MODEL.GLB')) {
    throw new Error('Should accept uppercase extensions');
  }
  
  // Invalid URLs
  if (isValid3DModelUrl('https://example.com/model.obj')) {
    throw new Error('Should reject .obj files');
  }
  
  if (isValid3DModelUrl('https://example.com/model.fbx')) {
    throw new Error('Should reject .fbx files');
  }
  
  if (isValid3DModelUrl('https://example.com/model')) {
    throw new Error('Should reject files without extension');
  }
  
  console.log('✓ isValid3DModelUrl tests passed');
}

// Test suite for validateModelSize
export function testValidateModelSize(): void {
  console.log('Testing validateModelSize...');
  
  // Valid sizes should not throw
  expectNoThrow(() => validateModelSize(1024)); // 1KB
  expectNoThrow(() => validateModelSize(1024 * 1024)); // 1MB
  expectNoThrow(() => validateModelSize(10 * 1024 * 1024)); // 10MB
  
  // Invalid sizes should throw
  expectThrows(() => validateModelSize(100 * 1024 * 1024), 'exceeds maximum allowed size'); // 100MB
  
  console.log('✓ validateModelSize tests passed');
}

// Main test runner
export function runAllTests(): void {
  console.log('Running metadata validation tests...\n');
  
  try {
    testValidateModel3D();
    testValidateMaterialProperty();
    testValidateNFTMetadata();
    testValidateMintRequest();
    testSanitizeMetadata();
    testIsValid3DModelUrl();
    testValidateModelSize();
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', (error as Error).message);
    throw error;
  }
}

// Export for potential use with testing frameworks
export const tests = {
  testValidateModel3D,
  testValidateMaterialProperty,
  testValidateNFTMetadata,
  testValidateMintRequest,
  testSanitizeMetadata,
  testIsValid3DModelUrl,
  testValidateModelSize,
  runAllTests
};