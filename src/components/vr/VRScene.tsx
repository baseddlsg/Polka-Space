
import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, PerspectiveCamera } from "@react-three/drei";
import { Vector3, Mesh } from "three";

interface BoxProps {
  position: [number, number, number];
  color: string;
  scale?: [number, number, number];
}

const Box: React.FC<BoxProps> = ({ position, color, scale = [1, 1, 1] }) => {
  const mesh = useRef<Mesh>(null!);
  
  useFrame(() => {
    mesh.current.rotation.x += 0.005;
    mesh.current.rotation.y += 0.008;
  });

  return (
    <mesh position={new Vector3(...position)} ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

const VRScene: React.FC = () => {
  return (
    <div className="w-full h-full vr-canvas-container">
      <Canvas className="bg-vr-dark">
        <PerspectiveCamera makeDefault position={[0, 1, 5]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Box position={[-1.5, 0, 0]} color="#8B5CF6" />
          <Box position={[1.5, 0, 0]} color="#0EA5E9" />
          <Environment preset="city" />
          <gridHelper args={[20, 20, "#8B5CF6", "#4B5563"]} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default VRScene;
