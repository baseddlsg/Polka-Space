import React, { useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { fetchUserNFTs } from '@/services/mintingService';
import { useWallet } from '@/contexts/WalletContext';
import { useObjectStore } from '@/stores/objectStore';
import { toast } from 'sonner';

// NFT Display Grid Component
const NFTGrid = ({ nfts, onImport }: { 
  nfts: any[], 
  onImport: (nft: any) => void 
}) => {
  const { camera } = useThree();
  const gridSize = Math.ceil(Math.sqrt(nfts.length));
  const spacing = 2.5;
  
  // Calculate grid center offset for centering
  const centerOffset = ((gridSize - 1) * spacing) / 2;
  
  useEffect(() => {
    // Position camera to view the grid
    camera.position.set(0, gridSize * 1.5, gridSize * 2.5);
    camera.lookAt(0, 0, 0);
  }, [camera, gridSize]);
  
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[gridSize * spacing * 1.5, gridSize * spacing * 1.5]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      
      {/* NFT display pedestals */}
      {nfts.map((nft, index) => {
        // Calculate grid position
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const x = col * spacing - centerOffset;
        const z = row * spacing - centerOffset;
        
        return (
          <NFTPedestal 
            key={nft.id} 
            nft={nft} 
            position={[x, 0, z]} 
            onImport={onImport} 
          />
        );
      })}
    </group>
  );
};

// Individual NFT pedestal component
const NFTPedestal = ({ 
  nft, 
  position, 
  onImport 
}: { 
  nft: any, 
  position: [number, number, number], 
  onImport: (nft: any) => void 
}) => {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Model preview - handle errors gracefully
  const ModelPreview = () => {
    try {
      const gltf = useGLTF(nft.modelUrl);
      // Safely access scene property with type assertion
      const scene = Array.isArray(gltf) ? gltf[0].scene : gltf.scene;
      
      const model = React.useMemo(() => {
        const clone = scene.clone();
        
        // Scale the model to fit display
        const box = new THREE.Box3().setFromObject(clone);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.5 / maxDim;
        clone.scale.set(scale, scale, scale);
        
        return clone;
      }, [scene]);
      
      useEffect(() => {
        setModelLoaded(true);
      }, []);
      
      // Rotate model
      useFrame((state) => {
        model.rotation.y = state.clock.getElapsedTime() * 0.5;
      });
      
      return <primitive object={model} position={[0, 0.5, 0]} />;
    } catch (e) {
      useEffect(() => {
        setError(true);
      }, []);
      
      return null;
    }
  };
  
  // Hover and click effects
  const meshRef = React.useRef<THREE.Mesh>(null!);
  const textRef = React.useRef<any>(null!);
  
  useFrame(() => {
    if (hovered && meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.color.lerp(new THREE.Color('#9333ea'), 0.1);
      if (textRef.current && textRef.current.material) {
        const textMaterial = textRef.current.material as THREE.Material & { color: THREE.Color };
        textMaterial.color.lerp(new THREE.Color('#f3f4f6'), 0.1);
      }
    } else if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.color.lerp(new THREE.Color('#4b5563'), 0.1);
      if (textRef.current && textRef.current.material) {
        const textMaterial = textRef.current.material as THREE.Material & { color: THREE.Color };
        textMaterial.color.lerp(new THREE.Color('#d1d5db'), 0.1);
      }
    }
  });
  
  // Get chain color
  const getChainColor = (chain: string) => {
    switch (chain) {
      case 'unique': return '#ec4899';
      case 'moonbeam': return '#8b5cf6';
      case 'astar': return '#0ea5e9';
      default: return '#6b7280';
    }
  };
  
  return (
    <group position={position}>
      {/* Pedestal base */}
      <mesh 
        castShadow 
        receiveShadow 
        position={[0, 0, 0]}
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => setActive(!active)}
      >
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color={hovered ? '#9333ea' : '#4b5563'} />
      </mesh>
      
      {/* Model or fallback */}
      {!error ? (
        <React.Suspense fallback={
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color={getChainColor(nft.chain)} wireframe />
          </mesh>
        }>
          <ModelPreview />
        </React.Suspense>
      ) : (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color={getChainColor(nft.chain)} />
        </mesh>
      )}
      
      {/* NFT name */}
      <Text
        ref={textRef}
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.12}
        maxWidth={0.9}
        lineHeight={1}
        textAlign="center"
        color="#d1d5db"
      >
        {nft.name}
      </Text>
      
      {/* Interaction UI */}
      {active && (
        <Html position={[0, 1.2, 0]} center transform distanceFactor={8}>
          <div className="bg-gray-900/90 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-purple-500/20 w-40">
            <h3 className="text-white text-sm font-medium mb-1 truncate">{nft.name}</h3>
            <p className="text-gray-300 text-xs mb-2">
              Chain: <span className="font-medium" style={{color: getChainColor(nft.chain)}}>
                {nft.chain.charAt(0).toUpperCase() + nft.chain.slice(1)}
              </span>
            </p>
            <button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onImport(nft);
                setActive(false);
              }}
            >
              Import to Scene
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};

// Main VR Explorer Component
const VRExplorer: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<any[]>([]);
  const { selectedAccount } = useWallet();
  const { addObject } = useObjectStore();
  
  // Fetch NFTs when component mounts
  useEffect(() => {
    const loadNFTs = async () => {
      if (!selectedAccount) {
        setNfts([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userNfts = await fetchUserNFTs(selectedAccount.address);
        setNfts(userNfts);
      } catch (error) {
        console.error('Error loading NFTs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadNFTs();
  }, [selectedAccount]);
  
  // Handle importing NFT to main scene
  const handleImportNFT = (nft: any) => {
    const newObject = {
      id: `nft-instance-${nft.id}-${Date.now()}`,
      modelUrl: nft.modelUrl,
      position: [0, 0.5, -2] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      name: nft.name,
      metadata: {
        isNFT: true,
        nftChain: nft.chain,
        nftId: nft.id,
        tokenId: nft.tokenId
      }
    };
    
    addObject(newObject);
    toast.success(`NFT imported: ${nft.name}`, {
      description: `Added to your main scene`,
    });
  };
  
  // Loading state
  if (loading) {
    return (
      <group>
        <Text position={[0, 0, 0]} fontSize={0.5} color="#8b5cf6">
          Loading NFT Explorer...
        </Text>
      </group>
    );
  }
  
  // No NFTs state
  if (nfts.length === 0) {
    return (
      <group>
        <Text position={[0, 0.5, 0]} fontSize={0.5} color="#8b5cf6" textAlign="center">
          {selectedAccount 
            ? "No NFTs Found" 
            : "Connect Wallet to View NFTs"}
        </Text>
        <Text position={[0, 0, 0]} fontSize={0.2} color="#9ca3af" textAlign="center">
          {selectedAccount 
            ? "Create and mint 3D objects to get started" 
            : "Please connect your wallet first"}
        </Text>
      </group>
    );
  }
  
  // Render NFT grid
  return <NFTGrid nfts={nfts} onImport={handleImportNFT} />;
};

export default VRExplorer; 