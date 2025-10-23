import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  RefreshCw,
  Eye,
  Calendar,
  Hash,
  User
} from 'lucide-react';
import { NFTMetadata } from '@/types/nft';

interface CommunityNFT extends NFTMetadata {
  chain: string;
  tokenId: string;
  dateCreated: string;
  ownerAddress: string;
  ownerName?: string;
}

interface CommunityGalleryProps {
  className?: string;
}

const CommunityGallery: React.FC<CommunityGalleryProps> = ({ className = '' }) => {
  const [nfts, setNfts] = useState<CommunityNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'creator'>('date');
  const [filterChain, setFilterChain] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNFT, setSelectedNFT] = useState<CommunityNFT | null>(null);

  // Available chains for filtering
  const chains = [
    { id: 'all', name: 'All Chains', color: 'bg-gradient-to-r from-purple-600 to-indigo-600' },
    { id: 'unique', name: 'Unique Network', color: 'bg-gradient-to-r from-pink-500 to-rose-500' },
    { id: 'astar', name: 'Astar', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { id: 'moonbeam', name: 'Moonbeam', color: 'bg-gradient-to-r from-purple-500 to-indigo-500' }
  ];

  // Mock community NFTs data
  const mockCommunityNFTs: CommunityNFT[] = [
    {
      id: 'community-1',
      name: 'Abstract Sculpture',
      description: 'A beautiful abstract 3D sculpture',
      model: {
        url: 'https://example.com/sculpture.glb',
        format: 'glb' as const,
        size: 2048000,
        dimensions: { width: 5, height: 8, depth: 5 }
      },
      materials: [],
      creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      timestamp: Date.now() - 86400000,
      attributes: { category: 'art', rarity: 'rare' },
      chain: 'unique',
      tokenId: '789',
      dateCreated: '2024-01-15T10:30:00Z',
      ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      ownerName: 'Artist123'
    },
    {
      id: 'community-2',
      name: 'Geometric Pattern',
      description: 'Complex geometric 3D pattern',
      model: {
        url: 'https://example.com/pattern.glb',
        format: 'glb' as const,
        size: 1536000,
        dimensions: { width: 3, height: 3, depth: 3 }
      },
      materials: [],
      creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      timestamp: Date.now() - 172800000,
      attributes: { category: 'design', rarity: 'common' },
      chain: 'astar',
      tokenId: '456',
      dateCreated: '2024-01-14T15:45:00Z',
      ownerAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      ownerName: 'Designer456'
    }
  ];

  // Load community NFTs
  const loadCommunityNFTs = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNfts(mockCommunityNFTs);
    } catch (error) {
      console.error('Error loading community NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort NFTs
  const filteredAndSortedNFTs = React.useMemo(() => {
    let filtered = nfts;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(nft => 
        nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        case 'creator':
          return (a.ownerName || a.ownerAddress).localeCompare(b.ownerName || b.ownerAddress);
        default:
          return 0;
      }
    });

    return filtered;
  }, [nfts, searchTerm, filterChain, sortBy]);

  // Load community NFTs on mount
  useEffect(() => {
    loadCommunityNFTs();
  }, []);

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
  const renderNFTCard = (nft: CommunityNFT) => {
    const chainInfo = getChainInfo(nft.chain);
    
    return (
      <Card 
        key={nft.id} 
        className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-gray-200"
        onClick={() => setSelectedNFT(nft)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedNFT(nft);
          }
        }}
        aria-label={`View ${nft.name} by ${nft.ownerName || 'Unknown'}`}
      >
        <CardHeader className="p-0">
          <div className={`h-48 ${chainInfo.color} flex items-center justify-center relative overflow-hidden rounded-t-lg`}>
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
              <User className="h-3 w-3" />
              <span className="truncate">{nft.ownerName || `${nft.ownerAddress.slice(0, 6)}...${nft.ownerAddress.slice(-4)}`}</span>
            </div>
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Community Gallery</h1>
          <p className="text-gray-600 mt-1">
            Discover {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} from the community
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadCommunityNFTs}
          disabled={loading}
          aria-label="Refresh community gallery"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
              placeholder="Search NFTs or creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              aria-label="Search NFTs or creators"
            />
          </div>

          {/* Chain Filter */}
          <Select value={filterChain} onValueChange={setFilterChain}>
            <SelectTrigger className="w-40" aria-label="Filter by blockchain">
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
          <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'creator') => setSortBy(value)}>
            <SelectTrigger className="w-32" aria-label="Sort NFTs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="creator">Creator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1" role="tablist" aria-label="View mode">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            role="tab"
            aria-selected={viewMode === 'grid'}
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            role="tab"
            aria-selected={viewMode === 'list'}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12" role="status" aria-live="polite">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-500">Loading community NFTs...</p>
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
              : 'No community NFTs available at the moment'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* NFT Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedNFTs.map(renderNFTCard)}
          </div>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nft-modal-title"
        >
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle id="nft-modal-title">{selectedNFT.name}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedNFT(null)}
                  aria-label="Close modal"
                >
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
                  <span className="font-medium">Owner:</span>
                  <p className="text-gray-600">{selectedNFT.ownerName || `${selectedNFT.ownerAddress.slice(0, 8)}...${selectedNFT.ownerAddress.slice(-6)}`}</p>
                </div>
              </div>
              <div>
                <span className="font-medium">Description:</span>
                <p className="text-gray-600 mt-1">{selectedNFT.description}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CommunityGallery;