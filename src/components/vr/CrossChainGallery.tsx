import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { useObjectStore } from '@/stores/objectStore';
import { toast } from 'sonner';
import { MoveRight, ArrowLeftRight, Loader } from 'lucide-react';
import { formatAddress } from '@/services/blockchainService';
import { xcmService } from '@/services/xcmService';

// Mock data structure for cross-chain NFTs
interface CrossChainNFT {
  id: string;
  name: string;
  image: string;
  originChain: string;
  originChainId: string;
  modelUrl: string;
  tokenId: string;
  txHash: string;
}

const CrossChainGallery = () => {
  const { selectedAccount, connectWallet } = useWallet();
  const [nfts, setNfts] = useState<CrossChainNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [xcmProcessing, setXcmProcessing] = useState<string | null>(null);
  const { addObject } = useObjectStore();
  
  // Fetch NFTs from other parachains
  const fetchCrossChainNFTs = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    
    try {
      console.log("Initiating cross-chain NFT query...");
      
      // Connect to Moonbeam endpoint (can be simulated)
      console.log("Connecting to Moonbeam parachain...");
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock NFT data from other parachains
      const mockNFTs: CrossChainNFT[] = [
        {
          id: "moonbeam-1",
          name: "Cosmic Explorer",
          image: "https://ui-avatars.com/api/?name=CosmicExplorer&background=6D28D9&color=fff",
          originChain: "Moonbeam",
          originChainId: "2004",
          modelUrl: "/models/stylized_tree.glb", // Use an existing model
          tokenId: "23582",
          txHash: "0x3a8d7a132a882563b144a8d392a8c5e11756c6fe7c6fbbc6f2b4ae9f17507c68"
        },
        {
          id: "assethub-1",
          name: "Digital Sculpture",
          image: "https://ui-avatars.com/api/?name=DigitalSculpture&background=EF4444&color=fff",
          originChain: "Asset Hub",
          originChainId: "1000",
          modelUrl: "/models/abstract_sculpture_1.glb",
          tokenId: "58921",
          txHash: "0x5c6b98fe82a3f1f3a8ceb59d5fe12936a3b3129c9b7da47afaf13fdc07cba94c"
        },
        {
          id: "astar-1",
          name: "Virtual Artifact",
          image: "https://ui-avatars.com/api/?name=VirtualArtifact&background=3B82F6&color=fff",
          originChain: "Astar Network",
          originChainId: "2006",
          modelUrl: "/models/lamp.glb",
          tokenId: "8731",
          txHash: "0x2e4bb17c9d3c31c8e37c65166d8d25a3987c7aceb13b8b90ffae87b41e38cbf1"
        }
      ];
      
      console.log("Found cross-chain NFTs:", mockNFTs.length);
      setNfts(mockNFTs);
      
    } catch (error) {
      console.error("Failed to fetch cross-chain NFTs:", error);
      toast.error("Failed to fetch cross-chain NFTs", {
        description: "Could not connect to remote parachains."
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Effect to load NFTs when account is connected
  useEffect(() => {
    if (selectedAccount) {
      fetchCrossChainNFTs();
    } else {
      setNfts([]);
    }
  }, [selectedAccount]);
  
  // Handle XCM import
  const handleXCMImport = async (nft: CrossChainNFT) => {
    setXcmProcessing(nft.id);
    
    try {
      // Log XCM process steps for demo
      console.log(`[XCM] Initiating XCM transfer for NFT ${nft.id} from ${nft.originChain}`);
      toast.loading(`Initiating XCM transfer from ${nft.originChain}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`[XCM] Calculating XCM fees and message format`);
      console.log(`[XCM] Fee estimate: 0.152 ${nft.originChain === "Moonbeam" ? "GLMR" : "ASTR"}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`[XCM] Formatting XCM message for ${nft.originChain} → VR Genesis`);
      console.log(`[XCM] Message format: V3 with DescendOrigin, WithdrawAsset, BuyExecution, and TransferAsset`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`[XCM] Transfer in progress...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`[XCM] Received confirmation from destination chain`);
      toast.success(`NFT successfully transferred via XCM`, {
        description: `${nft.name} has been imported from ${nft.originChain}`
      });
      
      // Add imported NFT to the scene
      const newObject = {
        id: `xcm-import-${nft.id}-${Date.now()}`,
        modelUrl: nft.modelUrl,
        position: [0, 0.5, -2] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        name: nft.name,
        metadata: {
          isXCMNFT: true,
          originChain: nft.originChain,
          originChainId: nft.originChainId,
          tokenId: nft.tokenId,
          txHash: nft.txHash
        }
      };
      
      addObject(newObject);
      
    } catch (error) {
      console.error("XCM import failed:", error);
      toast.error("XCM import failed", {
        description: "There was an error processing the cross-chain message."
      });
    } finally {
      setXcmProcessing(null);
    }
  };
  
  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">Cross-Chain NFT Gallery</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={fetchCrossChainNFTs}
          disabled={loading}
        >
          <Loader className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
      
      {/* Explanation of XCM */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
        <p className="text-xs text-blue-700">
          <span className="font-medium">XCM Demo:</span> This gallery demonstrates Cross-Consensus Messaging (XCM) 
          to import NFTs from other Polkadot parachains into your VR environment.
        </p>
      </div>
      
      {!selectedAccount ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">Connect your wallet to view cross-chain NFTs</p>
          <Button
            variant="outline" 
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 border-0"
            onClick={() => connectWallet()}
          >
            Connect Wallet
          </Button>
        </div>
      ) : loading ? (
        <div className="py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-4 text-gray-500">Querying parachains for NFTs...</p>
        </div>
      ) : nfts.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No cross-chain NFTs found</p>
          <p className="text-xs text-gray-400 mb-4">No NFTs found on connected parachains.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 max-h-[360px] overflow-y-auto thin-scrollbar pr-2">
          {nfts.map(nft => (
            <div 
              key={nft.id} 
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
            >
              <div className="p-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-sm mb-1">{nft.name}</h3>
                  <div className="flex items-center mb-2">
                    <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      <ArrowLeftRight className="w-3 h-3 mr-1" />
                      {nft.originChain}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ID: {nft.tokenId}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Tx: {nft.txHash.slice(0, 10)}...{nft.txHash.slice(-8)}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs py-1 font-medium border-purple-200 text-purple-600 hover:bg-purple-50"
                  onClick={() => handleXCMImport(nft)}
                  disabled={!!xcmProcessing}
                >
                  {xcmProcessing === nft.id ? (
                    <>
                      <Loader className="h-3 w-3 mr-1 animate-spin" /> 
                      Processing XCM...
                    </>
                  ) : (
                    <>
                      <MoveRight className="h-3 w-3 mr-1" /> 
                      Import via XCM
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrossChainGallery; 