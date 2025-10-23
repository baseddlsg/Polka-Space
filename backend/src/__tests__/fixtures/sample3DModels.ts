// Sample 3D model data for testing
// These are minimal GLB file structures for testing purposes

export interface Sample3DModel {
  name: string;
  filename: string;
  size: number;
  format: 'glb' | 'gltf';
  buffer: ArrayBuffer;
  metadata: {
    vertices: number;
    faces: number;
    materials: number;
    textures: number;
  };
}

// Minimal GLB header structure for testing
function createMinimalGLBBuffer(size: number): ArrayBuffer {
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  
  // GLB header
  view.setUint32(0, 0x46546C67, true); // 'glTF' magic
  view.setUint32(4, 2, true); // version
  view.setUint32(8, size, true); // total length
  
  return buffer;
}

export const sampleModels: Sample3DModel[] = [
  {
    name: 'Simple Cube',
    filename: 'cube.glb',
    size: 1024,
    format: 'glb',
    buffer: createMinimalGLBBuffer(1024),
    metadata: {
      vertices: 8,
      faces: 12,
      materials: 1,
      textures: 0,
    },
  },
  {
    name: 'Abstract Sculpture',
    filename: 'sculpture.glb',
    size: 2048576, // 2MB
    format: 'glb',
    buffer: createMinimalGLBBuffer(2048576),
    metadata: {
      vertices: 1024,
      faces: 2048,
      materials: 3,
      textures: 2,
    },
  },
  {
    name: 'Geometric Vase',
    filename: 'vase.glb',
    size: 1536000, // 1.5MB
    format: 'glb',
    buffer: createMinimalGLBBuffer(1536000),
    metadata: {
      vertices: 512,
      faces: 1024,
      materials: 2,
      textures: 1,
    },
  },
  {
    name: 'Minimalist Chair',
    filename: 'chair.glb',
    size: 1024000, // 1MB
    format: 'glb',
    buffer: createMinimalGLBBuffer(1024000),
    metadata: {
      vertices: 256,
      faces: 512,
      materials: 1,
      textures: 1,
    },
  },
];

// Helper function to get model by name
export function getSampleModel(name: string): Sample3DModel | undefined {
  return sampleModels.find(model => model.name === name);
}

// Helper function to create a File object from sample model
export function createModelFile(model: Sample3DModel): File {
  const blob = new Blob([model.buffer], { type: 'model/gltf-binary' });
  return new File([blob], model.filename, { type: 'model/gltf-binary' });
}

// Mock FormData for file uploads
export function createMockFormData(model: Sample3DModel, additionalData: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const file = createModelFile(model);
  
  formData.append('model', file);
  formData.append('name', model.name);
  formData.append('format', model.format);
  
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  return formData;
}

// Validation helpers
export function isValidGLBBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  
  return magic === 0x46546C67 && version === 2;
}

export function getModelDimensions(modelName: string): { width: number; height: number; depth: number } {
  const dimensionsMap: Record<string, { width: number; height: number; depth: number }> = {
    'Simple Cube': { width: 2, height: 2, depth: 2 },
    'Abstract Sculpture': { width: 10, height: 15, depth: 8 },
    'Geometric Vase': { width: 6, height: 12, depth: 6 },
    'Minimalist Chair': { width: 18, height: 32, depth: 20 },
  };
  
  return dimensionsMap[modelName] || { width: 1, height: 1, depth: 1 };
}