import { useState, useEffect } from "react";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useWallet } from "@/contexts/WalletContext";
import { mintNFT } from "@/services/mintingService";
import { useObjectStore } from "@/stores/objectStore";
import NFTGallery from './NFTGallery';
import VirtualLandPlots from './VirtualLandPlots';
import CrossChainGallery from './CrossChainGallery';

interface ObjectControlsProps {
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
}

type ShapeType = 'box' | 'sphere' | 'cylinder' | 'torus';

const SHAPES: ShapeType[] = ["box", "sphere", "cylinder", "torus"];
const COLORS = [
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#0EA5E9" },
  { name: "Green", value: "#10B981" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
];

// --- Library Asset Definitions
const LIBRARY_ASSETS = [
  { id: 'lib-chair', name: 'Chair', modelUrl: '/models/simple_chair.glb' },
  { id: 'lib-table', name: 'Table', modelUrl: '/models/small_table.glb' },
  { id: 'lib-lamp', name: 'Lamp', modelUrl: '/models/lamp.glb' },
  { id: 'lib-plant', name: 'Plant', modelUrl: '/models/potted_plant.glb' },
  { id: 'lib-rock', name: 'Rock', modelUrl: '/models/rock_formation.glb' },
  { id: 'lib-tree', name: 'Tree', modelUrl: '/models/stylized_tree.glb' },
  { id: 'lib-sculpt1', name: 'Sculpture 1', modelUrl: '/models/abstract_sculpture_1.glb' },
  { id: 'lib-sculpt2', name: 'Sculpture 2', modelUrl: '/models/abstract_sculpture_2.glb' },
  { id: 'lib-vase', name: 'Vase', modelUrl: '/models/vase.glb' },
  { id: 'lib-frame', name: 'Frame', modelUrl: '/models/frame.glb' },
  { id: 'lib-duck', name: 'Duck', modelUrl: '/models/rubber_duck.glb' },
  { id: 'lib-monitor', name: 'Monitor', modelUrl: '/models/computer_monitor.glb' },
  { id: 'lib-car', name: 'Car', modelUrl: '/models/simple_car.glb' },
  // Ensure you have 13 distinct items with correct paths
];
// ----------- 

const ObjectControls: React.FC<ObjectControlsProps> = ({ activeTab, onTabChange }) => {
  const { selectedAccount } = useWallet();
  const [selectedShape, setSelectedShape] = useState<ShapeType>("box");
  const [selectedColor, setSelectedColor] = useState("#8B5CF6");
  const [scale, setScale] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const { addObject } = useObjectStore();
  const [selectedMintChain, setSelectedMintChain] = useState<string>('unique');
  const [currentTab, setCurrentTab] = useState<string>("shape");
  
  // Sync the local tab state with the parent's activeTab prop
  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);
  
  // Handle tab changes and propagate them to the parent if onTabChange is provided
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    if (onTabChange) {
      onTabChange(value);
    }
  };
  
  const handleCreateObject = () => {
    console.log("Adding object to scene:", { shape: selectedShape, color: selectedColor, scale });
    const newObject = {
      id: `primitive-${Date.now()}`,
      type: selectedShape,
      color: selectedColor,
      position: [0, 0.5, -2] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [scale, scale, scale] as [number, number, number],
    };
    addObject(newObject);
    toast.info(`${selectedShape.charAt(0).toUpperCase() + selectedShape.slice(1)} added to scene`);
  };
  
  // --- Function to add library objects
  const handleAddLibraryObject = (asset: typeof LIBRARY_ASSETS[0]) => {
    console.log("Adding library object to scene:", asset.name);
    const newObject = {
      id: `instance-${asset.id}-${Date.now()}`, // Unique instance ID
      modelUrl: asset.modelUrl,
      // No need for type/color if modelUrl is present
      position: [0, 0.5, -2] as [number, number, number], // Default position
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number], // Start with default scale
      name: asset.name, // Store the name for potential future use
    };
    addObject(newObject);
    toast.info(`${asset.name} added to scene`);
  };
  // ----------- 
  
  const handleMintNFT = async () => {
    if (!selectedAccount) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to mint NFTs"
      });
      return;
    }

    setIsMinting(true);
    
    try {
      const chainId = selectedMintChain || 'unique';
      
      const response = await mintNFT({
        ownerAddress: selectedAccount.address,
        objectDetails: {
          shape: selectedShape,
          color: selectedColor,
          scale: scale,
          name: `${selectedShape.charAt(0).toUpperCase() + selectedShape.slice(1)} NFT`
        },
        chainId,
        account: selectedAccount
      });

      toast.success("NFT Minted Successfully", {
        description: (
          <div className="text-xs">
            <p className="truncate">Token ID: {response.tokenId}</p>
            <a 
              href={response.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-500 underline block mt-1 truncate"
            >
              View on {chainId.charAt(0).toUpperCase() + chainId.slice(1)} Explorer
            </a>
          </div>
        ),
        duration: 5000,
      });
      
      // Switch to the NFT Gallery tab after minting
      handleTabChange('nft-gallery');
      
    } catch (error) {
      toast.error("Failed to mint NFT", {
        description: error instanceof Error ? error.message : "Please try again later"
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l6.5 3.75a1 1 0 01.004 1.736l-6.5 3.75a1 1 0 01-.996 0l-6.5-3.75a1 1 0 01.004-1.736l6.5-3.75z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Object Creator</h2>
      </div>
      
      <div className="space-y-4">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <div className="relative mb-4">
            <TabsList className="flex mb-4 bg-gray-100 p-1 rounded-lg w-full overflow-x-auto scrollbar-none">
              <TabsTrigger value="shape" className="flex-1 py-1.5 px-2 text-xs sm:text-sm whitespace-nowrap">
                Shape
              </TabsTrigger>
              <TabsTrigger value="color" className="flex-1 py-1.5 px-2 text-xs sm:text-sm whitespace-nowrap">
                Color
              </TabsTrigger>
              <TabsTrigger value="size" className="flex-1 py-1.5 px-2 text-xs sm:text-sm whitespace-nowrap">
                Size
              </TabsTrigger>
              <TabsTrigger value="library" className="flex-1 py-1.5 px-2 text-xs sm:text-sm whitespace-nowrap">
                Library
              </TabsTrigger>
              <TabsTrigger value="nft-gallery" className="flex-1 py-1.5 px-2 text-xs sm:text-sm whitespace-nowrap">
                NFTs
              </TabsTrigger>
              <TabsTrigger value="cross-chain" className="flex-1 py-1.5 px-2 text-xs sm:text-sm whitespace-nowrap">
                Cross-Chain
              </TabsTrigger>
              <TabsTrigger value="land-plots" className="flex-1 py-1.5 px-2 text-xs sm:text-sm whitespace-nowrap">
                Plots
              </TabsTrigger>
            </TabsList>
            
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>
          
          <div className="overflow-x-hidden">
            <TabsContent value="shape" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Shape</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {SHAPES.map((shape) => (
                    <div 
                      key={shape} 
                      className={`h-24 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                        selectedShape === shape
                          ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 shadow-md'
                          : 'bg-white border border-gray-200 hover:border-purple-200 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedShape(shape as any)}
                    >
                      <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${
                        selectedShape === shape ? 'bg-gradient-to-r from-purple-100 to-indigo-100' : 'bg-gray-50'
                      }`}>
                        {shape === 'box' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="16" height="16" x="4" y="4" rx="1" />
                          </svg>
                        )}
                        {shape === 'sphere' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        )}
                        {shape === 'cylinder' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <ellipse cx="12" cy="6" rx="8" ry="3" />
                            <line x1="4" y1="6" x2="4" y2="18" />
                            <line x1="20" y1="6" x2="20" y2="18" />
                            <ellipse cx="12" cy="18" rx="8" ry="3" />
                          </svg>
                        )}
                        {shape === 'torus' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${selectedShape === shape ? 'text-purple-700' : 'text-gray-600'}`}>
                        {shape.charAt(0).toUpperCase() + shape.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="color" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Color</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {COLORS.map((color) => (
                    <div
                      key={color.name}
                      className={`h-16 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer hover:shadow-sm ${
                        selectedColor === color.value
                          ? 'ring-2 ring-purple-400 shadow'
                          : 'hover:ring-1 hover:ring-gray-200'
                      }`}
                      onClick={() => setSelectedColor(color.value)}
                    >
                      <div 
                        className="w-8 h-8 rounded-full mb-1 transform transition-transform hover:scale-110"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-xs font-medium text-gray-700">{color.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm">Preview</Label>
                  </div>
                  <div className="h-20 rounded-lg border border-gray-200 flex items-center justify-center">
                    <div
                      className="w-12 h-12 rounded transition-all"
                      style={{ backgroundColor: selectedColor }}
                    ></div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="size" className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm font-medium">Scale Factor</Label>
                  <span className="text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">{scale.toFixed(1)}x</span>
                </div>
                
                <div className="py-4 px-2">
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[scale]}
                    onValueChange={(values) => setScale(values[0])}
                    className="mb-6"
                  />
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>1.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm">Preview</Label>
                  </div>
                  <div className="h-40 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                    <div
                      className="bg-purple-500 rounded transition-all"
                      style={{ 
                        width: `${Math.max(16, 32 * scale)}px`, 
                        height: `${Math.max(16, 32 * scale)}px`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="library" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Asset</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {LIBRARY_ASSETS.map((asset) => (
                    <div
                      key={asset.id}
                      className="h-24 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer bg-white border border-gray-200 hover:border-purple-300 hover:shadow-sm p-2 btn-hover-effect"
                      onClick={() => handleAddLibraryObject(asset)}
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center mb-2">
                        {/* Icon based on asset type */}
                        {asset.id.includes('chair') && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-purple-600">
                            <path d="M6 19v2M18 19v2M4 11v4h16v-4M4 11a3 3 0 0 1-3-3c0-1.1.9-2 2-2h18c1.1 0 2 .9 2 2a3 3 0 0 1-3 3M5 11V6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v5"/>
                          </svg>
                        )}
                        {asset.id.includes('table') && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-500">
                            <rect x="4" y="6" width="16" height="2" rx="1"/>
                            <path d="M6 8v10M18 8v10"/>
                          </svg>
                        )}
                        {asset.id.includes('lamp') && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-yellow-500">
                            <path d="M9 2h6l3 7H6l3-7z"/>
                            <path d="M12 9v13M9 22h6"/>
                          </svg>
                        )}
                        {!asset.id.includes('chair') && !asset.id.includes('table') && !asset.id.includes('lamp') && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-500">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-center text-gray-700">{asset.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="nft-gallery">
              <NFTGallery />
            </TabsContent>
            
            <TabsContent value="cross-chain">
              <CrossChainGallery />
            </TabsContent>
            
            <TabsContent value="land-plots">
              <VirtualLandPlots />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Only show action buttons for shape, color, and size tabs */}
      {(currentTab === 'shape' || currentTab === 'color' || currentTab === 'size') && (
        <div className="flex justify-between mt-4">
          <Button 
            variant="outline" 
            onClick={handleCreateObject}
            className="flex-1 mr-2 btn-hover-effect text-xs sm:text-sm"
          >
            Add Shape
          </Button>
          <Button 
            className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 btn-hover-effect text-xs sm:text-sm"
            onClick={handleMintNFT}
            disabled={isMinting || !selectedAccount}
          >
            {isMinting ? "Minting..." : "Mint NFT"}
          </Button>
        </div>
      )}
      
      {/* Only show blockchain selection for shape, color, and size tabs */}
      {(currentTab === 'shape' || currentTab === 'color' || currentTab === 'size') && (
        <div className="mt-4">
          <Label className="text-sm font-medium mb-2 block">Choose Blockchain</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              {id: 'unique', name: 'Unique', color: 'bg-gradient-to-r from-pink-500 to-rose-500'},
              {id: 'moonbeam', name: 'Moonbeam', color: 'bg-gradient-to-r from-purple-500 to-indigo-500'},
              {id: 'astar', name: 'Astar', color: 'bg-gradient-to-r from-blue-500 to-cyan-500'},
            ].map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedMintChain(chain.id)}
                className={`px-3 py-1 rounded-full text-xs ${
                  selectedMintChain === chain.id
                    ? `${chain.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectControls;
