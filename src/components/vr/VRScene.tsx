import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, PerspectiveCamera, MeshReflectorMaterial, SoftShadows, TransformControls, Html, Sparkles } from "@react-three/drei";
import { useAvatar } from "@/contexts/AvatarContext";
import { useObjectStore } from "@/stores/objectStore";
import Model from "./Model";
import VRExplorer from "./VRExplorer";
import * as THREE from 'three';
import { PointerLockControls as THREEPointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// --- NEW Internal Component for Pointer Lock Logic ---
const PointerLockController = ({ onDeleteKeyPress }: { onDeleteKeyPress: () => void }) => {
  const { camera, gl, scene } = useThree();
  const [isLocked, setIsLocked] = useState(false);
  const controls = useMemo(() => new THREEPointerLockControls(camera, gl.domElement), [camera, gl.domElement]);
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const moveVelocity = useRef(new THREE.Vector3());

  // Pointer Lock Event Listeners & Controls Lifecycle
  useEffect(() => {
    scene.add(controls.object);
    const handleLock = () => setIsLocked(true);
    const handleUnlock = () => setIsLocked(false);
    const handleClick = () => {
      // Only lock if not already locked
      if (!controls.isLocked) {
        controls.lock();
      }
    };

    controls.addEventListener('lock', handleLock);
    controls.addEventListener('unlock', handleUnlock);
    gl.domElement.addEventListener('click', handleClick);

    return () => {
      controls.removeEventListener('lock', handleLock);
      controls.removeEventListener('unlock', handleUnlock);
      gl.domElement.removeEventListener('click', handleClick);
      if (controls && controls.object) {
          scene.remove(controls.object);
      }
    };
  }, [controls, gl.domElement, scene]);

  // Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': case 'ArrowUp': moveState.current.forward = true; break;
        case 'KeyA': case 'ArrowLeft': moveState.current.left = true; break;
        case 'KeyS': case 'ArrowDown': moveState.current.backward = true; break;
        case 'KeyD': case 'ArrowRight': moveState.current.right = true; break;
      }

      // --- NEW: Handle Delete Key Press ---
      if (event.code === 'KeyX' || event.code === 'Backspace') {
        onDeleteKeyPress(); // Call the handler passed from VRScene
      }
      // -----------------------------------
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': case 'ArrowUp': moveState.current.forward = false; break;
        case 'KeyA': case 'ArrowLeft': moveState.current.left = false; break;
        case 'KeyS': case 'ArrowDown': moveState.current.backward = false; break;
        case 'KeyD': case 'ArrowRight': moveState.current.right = false; break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [onDeleteKeyPress]);

  // Frame Loop for Movement
  useFrame((state, delta) => {
    if (!isLocked) return; 
    
    // --- Adjust Speed --- 
    const speed = 2.5; // Reduced from 5.0
    const impulseMultiplier = 3.0; // Reduced from 5.0
    const damping = 0.85; 
    // ---------------------

    const moveDirection = new THREE.Vector3();
    if (moveState.current.forward) moveDirection.z -= 1;
    if (moveState.current.backward) moveDirection.z += 1;
    if (moveState.current.left) moveDirection.x -= 1;
    if (moveState.current.right) moveDirection.x += 1;
    moveDirection.normalize();

    // Apply movement impulse based on direction and speed
    moveVelocity.current.x += moveDirection.x * speed * delta * impulseMultiplier;
    moveVelocity.current.z += moveDirection.z * speed * delta * impulseMultiplier;

    // Apply damping to velocity
    moveVelocity.current.multiplyScalar(damping);

    // Move the controls object
    controls.moveRight(moveVelocity.current.x * delta);
    controls.moveForward(moveVelocity.current.z * delta);

    // Stop tiny movements
    if (Math.abs(moveVelocity.current.x) < 0.01) moveVelocity.current.x = 0;
    if (Math.abs(moveVelocity.current.z) < 0.01) moveVelocity.current.z = 0;
  });

  return null; // This component doesn't render anything itself
};
// --- End Internal Component ---

// Object 3D Component for scene objects
const Object3D = React.forwardRef((
  { object, isSelected, onSelect }: { 
    object: any, 
    isSelected: boolean, 
    onSelect: () => void 
  }, 
  ref: React.Ref<THREE.Group>
) => {
  // Calculate adjusted position to place group origin just above floor
  const adjustedY = 0.01; // Place origin near floor
  const adjustedPosition: THREE.Vector3Tuple = [
    object.position?.[0] ?? 0,
    adjustedY,
    object.position?.[2] ?? 0,
  ];

  // Check if this is an XCM NFT
  const isXCMNFT = object.metadata?.isXCMNFT;

  return (
    <group 
      ref={ref}
      onClick={(e) => { 
        e.stopPropagation();
        onSelect();
      }}
      position={adjustedPosition}
      rotation={object.rotation}
      scale={object.scale}
    >
      {/* XCM NFT Special Effects */}
      {isXCMNFT && (
        <>
          <Sparkles count={20} scale={1.5} size={6} speed={0.4} color="#ff88ff" />
          <Html position={[0, 1.5, 0]} center distanceFactor={10}>
            <div className="bg-indigo-800 px-2 py-1 rounded text-white text-xs whitespace-nowrap">
              XCM: {object.metadata.originChain}
            </div>
          </Html>
        </>
      )}

      {object.modelUrl ? (
        <Model url={object.modelUrl} />
      ) : object.type === 'box' ? (
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={object.color || '#ffffff'} />
        </mesh>
      ) : object.type === 'sphere' ? (
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={object.color || '#ffffff'} />
        </mesh>
      ) : object.type === 'cylinder' ? (
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          <meshStandardMaterial color={object.color || '#ffffff'} />
        </mesh>
      ) : object.type === 'torus' ? (
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <torusGeometry args={[0.3, 0.2, 16, 32]} />
          <meshStandardMaterial color={object.color || '#ffffff'} />
        </mesh>
      ) : null}
    </group>
  );
});
Object3D.displayName = 'Object3D';

// Update the component props definition
interface VRSceneProps {
  showExplorer?: boolean;
  onExplorerChange?: (show: boolean) => void;
}

// Update component definition
const VRScene: React.FC<VRSceneProps> = ({ showExplorer: externalShowExplorer, onExplorerChange }) => {
  const { objects, updateObjectTransform, removeObject } = useObjectStore();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const objectRefs = useRef<Record<string, THREE.Group | null>>({});
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  // Update to sync with external state if provided
  const [internalShowExplorer, setInternalShowExplorer] = useState(false);
  
  // Use either the external or internal explorer state
  const showExplorer = externalShowExplorer !== undefined ? externalShowExplorer : internalShowExplorer;
  
  // Handle explorer mode toggle
  const toggleExplorer = useCallback(() => {
    const newValue = !showExplorer;
    // Update internal state
    setInternalShowExplorer(newValue);
    // Notify parent if callback is provided
    if (onExplorerChange) {
      onExplorerChange(newValue);
    }
  }, [showExplorer, onExplorerChange]);
  
  // Add a state dependency to force re-render and recomputation of selectedObject
  const [objectRefsUpdated, setObjectRefsUpdated] = useState(0);
  
  // Safely check if the selected object reference exists
  const selectedObject = useMemo(() => {
    if (selectedObjectId && objectRefs.current[selectedObjectId]) {
      return objectRefs.current[selectedObjectId];
    }
    return null;
  }, [selectedObjectId, objectRefsUpdated]);

  // Update object store when transform controls are dragged
  const handleTransformChange = useCallback(() => {
    if (selectedObjectId && objectRefs.current[selectedObjectId]) {
      const transformedObject = objectRefs.current[selectedObjectId]!;
      updateObjectTransform(
        selectedObjectId,
        transformedObject.position.toArray(),
        transformedObject.rotation.toArray().slice(0, 3) as THREE.EulerTuple, // Ensure it's EulerTuple [x, y, z]
        transformedObject.scale.toArray()
      );
    }
  }, [selectedObjectId, updateObjectTransform]);

  // --- Handler for Delete Key Press ---
  const handleDeleteSelected = useCallback(() => {
    if (selectedObjectId) {
      console.log(`Deleting object: ${selectedObjectId}`);
      removeObject(selectedObjectId);
      setSelectedObjectId(null); // Deselect after deleting
    }
  }, [selectedObjectId, removeObject]); // Dependencies
  // ---------------------------------------

  return (
    <div className="w-full h-full vr-canvas-container relative">
      {/* Mode Buttons Row - update to include explorer button */}
      <div className="absolute top-2 left-2 z-10 flex gap-1 p-1 bg-black/50 rounded">
        {/* Show transform controls when not in explorer mode */}
        {!showExplorer && (
          <>
            <button
              onClick={() => setTransformMode('translate')}
              className={`px-2 py-1 text-xs rounded ${transformMode === 'translate' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
            >
              Move
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              className={`px-2 py-1 text-xs rounded ${transformMode === 'rotate' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
            >
              Rotate
            </button>
            <button
              onClick={() => setTransformMode('scale')}
              className={`px-2 py-1 text-xs rounded ${transformMode === 'scale' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
            >
              Scale
            </button>
          </>
        )}
        
        {/* Explorer mode toggle button */}
        <button
          onClick={toggleExplorer}
          className={`px-2 py-1 text-xs rounded ${showExplorer ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
        >
          {showExplorer ? 'Exit Explorer' : 'NFT Explorer'}
        </button>
      </div>
      
      <Canvas className="bg-vr-dark">
        {/* Fog */}
        <fog attach="fog" args={['#a0a0a0', 10, 35]} />

        <SoftShadows size={25} focus={0} samples={10} />
        <PerspectiveCamera makeDefault position={[0, 1.6, 5]} fov={75} />
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[8, 12, 5]} 
          intensity={1.8} 
          castShadow
        />
        <Sky distance={450000} sunPosition={[5, 1, 8]} inclination={0} azimuth={0.25} />

        {/* Render the pointer lock only when not in explorer mode */}
        {!showExplorer && (
          <PointerLockController onDeleteKeyPress={handleDeleteSelected} />
        )}

        {/* Conditionally render explorer or normal scene */}
        {showExplorer ? (
          // Explorer mode
          <Suspense fallback={null}>
            <VRExplorer />
          </Suspense>
        ) : (
          // Normal scene mode - render objects and transform controls
          <>
            {/* Conditionally render TransformControls only when selectedObject exists */}
            {selectedObject && (
              <TransformControls 
                object={selectedObject} 
                onObjectChange={handleTransformChange}
                mode={transformMode}
              />
            )}

            {/* Add Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[50, 50]} />
              <MeshReflectorMaterial
                blur={[300, 100]}
                resolution={2048}
                mixBlur={1}
                mixStrength={80}
                roughness={1}
                depthScale={1.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color="#242424"
                metalness={0.5}
                mirror={0.75}
              />
            </mesh>

            {/* Using a REGULAR loop to render Scene Objects */}
            {objects.map(object => {
              const onSelect = () => setSelectedObjectId(object.id);
              return (
                <Object3D
                  key={object.id}
                  object={object}
                  isSelected={object.id === selectedObjectId}
                  onSelect={onSelect}
                  ref={ref => objectRefs.current[object.id] = ref}
                />
              );
            })}
          </>
        )}
      </Canvas>
    </div>
  );
};

export default VRScene;
