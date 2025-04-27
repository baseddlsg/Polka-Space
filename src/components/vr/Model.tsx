import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
  url: string;
  position?: THREE.Vector3Tuple;
  rotation?: THREE.EulerTuple;
  scale?: THREE.Vector3Tuple;
}

const Model: React.FC<ModelProps> = ({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  // Use effect to set up shadows on the loaded model
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation} 
      scale={scale}
    >
      <primitive object={scene} />
    </group>
  );
};

// Preload the model if needed, though often handled by Suspense
// useGLTF.preload(url); 

export default Model; 