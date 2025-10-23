import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  RefreshCw, 
  Wallet,
  Eye,
  Calendar,
  Hash,
  ExternalLink
} from 'lucide-react';
import { NFTMetadata, UserPortfolio } from '@/types/nft';
import { fetchUserNFTs } from '@/services/mintingService';

interface NFTDisplayItem extends NFTMetadata {
  chain: string;
  tokenId: string;
  dateCreated: string;
  explorerUrl?: string;
}

interface PortfolioViewProps {
  className?: string;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ className = '' }) => {
  const { selectedAccount, connectWallet, isWalletConnected } = useWallet();
  const [nfts, setNfts] = useState<NFTDisplayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'chain'>('date');
  const [filterChain, setFilterChain] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNFT, setSelectedNFT] = useState<NFTDisplayItem | null>(null);

  // Available chains for filtering
  const chains = [
    { id: 'all', name: 'All Chains', color: 'bg-gradient-to-r from-purple-600 to-indigo-600' },
    { id: 'unique', name: 'Unique Network', color: 'bg-gradient-to-r from-pink-500 to-rose-500' },
    { id: 'astar', name: 'Astar', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { id: 'moonbeam', name: 'Moonbeam', color: 'bg-gradient-to-r from-purple-500 to-indigo-500' }
  ];

  // Load user's NFT portfolio
  const loadPortfolio = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    try {
      const userNFTs = await fetchUserNFTs(selectedAccount.address);
      
      // Transform to display format
      const displayNFTs: NFTDisplayItem[] = userNFTs.map(nft => ({
        id: nft.id,
        name: nft.name,
        description: `3D NFT created in VR Genesis Frame`,
        model: {
          url: nft.modelUrl,
          format: 'glb' as const,
          size: 0,
          dimensions: { width: 1, height: 1, depth: 1 }
        },
        materials: [],
        creator: selectedAccount.address,
        timestamp: new Date(nft.dateCreated).getTime(),
        attributes: {},
        chain: nft.chain,
        tokenId: nft.tokenId,
        dateCreated: nft.dateCreated,
        explorerUrl: nft.explorerUrl
      }));
      
      setNfts(displayNFTs);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      toast.error('Failed to load portfolio', {
        description: 'There was a problem fetching your NFTs from the blockchain.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh portfolio
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  };

  // Filter and sort NFTs
  const filteredAndSortedNFTs = React.useMemo(() => {
    let filtered = nfts;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(nft => 
        nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.tokenId.includes(searchTerm)
      );
    }

    // Apply chain filter
    if (filterChain !== 'all') {
      filtered = filtered.filter(nft => nft.chain === filterChain);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.timestamp - a.timestamp;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'chain':
          return a.chain.localeCompare(b.chain);
        default:
          return 0;
      }
    });

    return filtered;
  }, [nfts, searchTerm, filterChain, sortBy]);

  // Load portfolio on wallet connection
  useEffect(() => {
    if (isWalletConnected) {
      loadPortfolio();
    } else {
      setNfts([]);
    }
  }, [isWalletConnected, selectedAccount]);

  // Get chain display info
  const getChainInfo = (chainId: string) => {
    return chains.find(c => c.id === chainId) || { name: chainId, color: 'bg-gray-500' };
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Render NFT card for grid view
  const renderNFTCard = (nft: NFTDisplayItem) => {
    const chainInfo = getChainInfo(nft.chain);
    
    return (
      <Card 
        key={nft.id} 
        className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-gray-200"
        onClick={() => setSelectedNFT(nft)}
      >
        <CardHeader className="p-0">
          <div className={`h-48 ${chainInfo.color} flex items-center justify-center relative overflow-hidden rounded-t-lg`}>
            {/* 3D Model Preview - placeholder for now */}
            <div className="w-32 h-32 bg-white/20 rounded-lg flex items-center justify-center">
              <div className="text-white text-4xl">🎨</div>
            </div>
            <Badge className="absolute top-2 right-2 bg-white text-gray-700">
              {chainInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg truncate">{nft.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Hash className="h-3 w-3" />
              <span className="truncate">#{nft.tokenId}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(nft.timestamp)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render NFT row for list view
  const renderNFTRow = (nft: NFTDisplayItem) => {
    const chainInfo = getChainInfo(nft.chain);
    
    return (
      <div 
        key={nft.id}
        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setSelectedNFT(nft)}
      >
        <div className={`w-16 h-16 ${chainInfo.color} rounded-lg flex items-center justify-center`}>
          <div className="text-white text-xl">🎨</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{nft.name}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>#{nft.tokenId}</span>
            <span>{chainInfo.name}</span>
            <span>{formatDate(nft.timestamp)}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (!isWalletConnected) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center">
            <Wallet className="h-10 w-10 text-purple-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your Polkadot wallet to view and manage your NFT portfolio
          </p>
          <Button 
            onClick={connectWallet}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My NFT Portfolio</h1>
          <p className="text-gray-600 mt-1">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} across {new Set(nfts.map(n => n.chain)).size} chain{new Set(nfts.map(n => n.chain)).size !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search NFTs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Chain Filter */}
          <Select value={filterChain} onValueChange={setFilterChain}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chains.map(chain => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'chain') => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="chain">Chain</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-500">Loading your NFT portfolio...</p>
        </div>
      ) : filteredAndSortedNFTs.length === 0 ? (
        <div className="text-center py-12">
                
 <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <div className="text-4xl">🎨</div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterChain !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Start creating and minting 3D objects to build your portfolio'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* NFT Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedNFTs.map(renderNFTCard)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedNFTs.map(renderNFTRow)}
            </div>
          )}
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedNFT.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedNFT(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`h-64 ${getChainInfo(selectedNFT.chain).color} rounded-lg flex items-center justify-center`}>
                <div className="text-white text-6xl">🎨</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Token ID:</span>
                  <p className="text-gray-600">#{selectedNFT.tokenId}</p>
                </div>
                <div>
                  <span className="font-medium">Chain:</span>
                  <p className="text-gray-600">{getChainInfo(selectedNFT.chain).name}</p>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <p className="text-gray-600">{formatDate(selectedNFT.timestamp)}</p>
                </div>
                <div>
                  <span className="font-medium">Creator:</span>
                  <p className="text-gray-600 truncate">{selectedNFT.creator.slice(0, 8)}...{selectedNFT.creator.slice(-6)}</p>
                </div>
              </div>
              {selectedNFT.explorerUrl && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(selectedNFT.explorerUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PortfolioView;