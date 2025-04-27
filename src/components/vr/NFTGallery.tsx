import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { useObjectStore } from '@/stores/objectStore';
import { toast } from 'sonner';
import { MoveRight, Upload, RefreshCw } from 'lucide-react';
import { fetchUserNFTs } from '@/services/mintingService';
import { formatAddress } from '@/services/blockchainService';
import { BLOCKCHAIN_CONFIG } from '@/config/blockchainConfig';
import { resolveIPFSUri, fetchNFTMetadata } from '@/services/ipfsService';

// Improved placeholder image function with more aesthetically pleasing options
const getPlaceholderImage = (seed: string) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=6D28D9&color=fff&format=svg&bold=true`;

interface NFT {
  id: string;
  name: string;
  image: string;
  chain: string;
  modelUrl: string;
  tokenId?: string;
  dateCreated?: string;
  collectionName?: string;
  metadata?: any;
}

const NFTGallery = () => {
  const { selectedAccount, connectWallet } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const { addObject } = useObjectStore();
  const [selectedChain, setSelectedChain] = useState<string | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const chains = [
    { id: 'all', name: 'All Chains', color: 'bg-gradient-to-r from-purple-600 to-indigo-600' },
    { id: 'unique', name: 'Unique Network', color: 'bg-gradient-to-r from-pink-500 to-rose-500' },
    { id: 'astar', name: 'Astar', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { id: 'moonbeam', name: 'Moonbeam', color: 'bg-gradient-to-r from-purple-500 to-indigo-500' }
  ];

  const loadNFTs = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    try {
      // Fetch NFTs from all supported chains
      const userNFTs = await fetchUserNFTs(selectedAccount.address);
      
      // Process and normalize NFT data
      const processedNFTs = await Promise.all(
        userNFTs.map(async (nft) => {
          // Try to fetch and parse metadata if available
          let metadata = null;
          let modelUrl = nft.modelUrl;
          let image = nft.image;
          
          // If there's a metadata URL, fetch and parse it
          if (nft.metadataUrl) {
            try {
              metadata = await fetchNFTMetadata(nft.metadataUrl);
              
              // Use metadata image if available
              if (metadata.image) {
                image = resolveIPFSUri(metadata.image);
              }
              
              // Use metadata animation_url (3D model) if available
              if (metadata.animation_url) {
                modelUrl = resolveIPFSUri(metadata.animation_url);
              }
            } catch (error) {
              console.error("Error fetching NFT metadata:", error);
            }
          }
          
          // Use the chain's explorer URL if available
          const chainConfig = BLOCKCHAIN_CONFIG[nft.chain];
          const explorerUrl = chainConfig && nft.tokenId 
            ? `${chainConfig.explorerUrl}token/${nft.tokenId}`
            : undefined;
            
          return {
            ...nft,
            image: image || getPlaceholderImage(nft.name),
            modelUrl,
            metadata,
            explorerUrl
          };
        })
      );
      
      setNfts(processedNFTs);
    } catch (error) {
      console.error("Error loading NFTs:", error);
      toast.error("Failed to load NFTs", {
        description: "There was a problem connecting to the blockchain."
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh NFT list
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNFTs();
    setRefreshing(false);
  };

  useEffect(() => {
    if (selectedAccount) {
      loadNFTs();
    } else {
      setNfts([]);
    }
  }, [selectedAccount]);

  const filteredNfts = selectedChain === 'all' 
    ? nfts 
    : nfts.filter(nft => nft.chain === selectedChain);

  const importNFTToScene = (nft: NFT) => {
    console.log("Importing NFT to scene:", nft.name);
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
        tokenId: nft.tokenId,
        nftMetadata: nft.metadata
      }
    };
    addObject(newObject);
    toast.success(`NFT imported: ${nft.name}`, {
      description: `Added from ${chains.find(c => c.id === nft.chain)?.name || nft.chain}`
    });
  };

  const getChainColor = (chainId: string) => {
    const chain = chains.find(c => c.id === chainId);
    return chain ? chain.color : 'bg-gray-500';
  };

  const getChainName = (chainId: string) => {
    const chain = chains.find(c => c.id === chainId);
    return chain ? chain.name : chainId;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="space-y-4 overflow-hidden">
      {/* Header with refresh button */}
      {selectedAccount && (
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700">Your NFT Collection</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      )}
      
      {/* Chain filter tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
        {chains.map(chain => (
          <button
            key={chain.id}
            onClick={() => setSelectedChain(chain.id)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
              selectedChain === chain.id
                ? `${chain.color} text-white shadow-md`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {chain.name}
          </button>
        ))}
      </div>

      {!selectedAccount ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">Connect your wallet to view your NFTs</p>
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
          <p className="mt-4 text-gray-500">Loading your NFT collection...</p>
        </div>
      ) : filteredNfts.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No NFTs found on {selectedChain === 'all' ? 'any chains' : getChainName(selectedChain)}</p>
          <p className="text-xs text-gray-400 mb-4">Create and mint 3D objects to start your collection.</p>
          <Button
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 border-0"
            onClick={() => toast.info("Create objects in the Shape tab and use the Mint button to create NFTs.")}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Create Your First NFT
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto thin-scrollbar pr-2">
          {filteredNfts.map(nft => (
            <div 
              key={nft.id} 
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
            >
              <div 
                className={`h-28 ${getChainColor(nft.chain)} flex items-center justify-center relative`}
              >
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-20 h-20 object-contain"
                  onError={(e) => (e.currentTarget.src = getPlaceholderImage(nft.name))}
                />
                <span className="absolute top-2 right-2 bg-white text-xs px-2 py-0.5 rounded-full text-gray-700 font-medium">
                  {getChainName(nft.chain).split(' ')[0]}
                </span>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm mb-1 truncate">{nft.name}</h3>
                {nft.tokenId && (
                  <p className="text-xs text-gray-500 mb-2">
                    Token #{nft.tokenId.length > 8 ? `${nft.tokenId.slice(0,4)}...${nft.tokenId.slice(-4)}` : nft.tokenId}
                    {nft.dateCreated && <span className="block text-gray-400">{formatDate(nft.dateCreated)}</span>}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs py-1 font-medium border-purple-200 text-purple-600 hover:bg-purple-50"
                  onClick={() => importNFTToScene(nft)}
                >
                  <MoveRight className="h-3 w-3 mr-1" /> 
                  Import to Scene
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NFTGallery;
