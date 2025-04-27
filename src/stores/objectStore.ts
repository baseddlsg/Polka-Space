import create from 'zustand';
import * as THREE from 'three';
import { persist } from 'zustand/middleware';

export interface SceneObject {
  id: string;
  position: THREE.Vector3Tuple;
  rotation: THREE.EulerTuple;
  scale: THREE.Vector3Tuple;
  modelUrl?: string; // URL for GLB/GLTF models like avatars
  type?: 'box' | 'sphere' | 'cylinder' | 'torus' | 'avatar'; // Type of object
  color?: string; // Color for primitive shapes
  // Add other properties like color, type ('box', 'avatar', etc.) if needed
}

interface ObjectState {
  objects: SceneObject[];
  addObject: (obj: SceneObject) => void;
  updateObjectTransform: (id: string, position: THREE.Vector3Tuple, rotation: THREE.EulerTuple, scale: THREE.Vector3Tuple) => void;
  removeObject: (id: string) => void;
  setObjects: (objects: SceneObject[]) => void; // For loading from storage
}

const STORAGE_KEY = 'vr-genesis-scene-objects';

// Create the store with explicit typing for Zustand v3.7.2
export const useObjectStore = create(
  persist<ObjectState>(
    (set) => ({
      objects: [], // Initial state if nothing in storage
      addObject: (obj) => set((state) => ({ 
        objects: [...state.objects, obj] 
      })),
      updateObjectTransform: (id, position, rotation, scale) =>
        set((state) => ({
          objects: state.objects.map((obj) =>
            obj.id === id ? { ...obj, position, rotation, scale } : obj
          ),
        })),
      removeObject: (id) => set((state) => ({ 
        objects: state.objects.filter((obj) => obj.id !== id) 
      })),
      setObjects: (objects) => set({ objects }), // Method to explicitly set state
    }),
    {
      name: STORAGE_KEY, // Name of the item in storage
      getStorage: () => localStorage,
    }
  )
);

// Optional: Load initial state when the app loads (if persist middleware doesn't handle it automatically)
// const initialState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{ "state": { "objects": [] } }').state.objects;
// useObjectStore.setState({ objects: initialState }); 