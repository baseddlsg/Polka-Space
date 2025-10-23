import React from 'react';
import { Html } from '@react-three/drei';
import { CheckCircle, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OwnershipIndicatorProps {
  position?: [number, number, number];
  status: 'local' | 'minting' | 'minted' | 'owned' | 'xcm';
  tokenId?: string;
  chainName?: string;
  ownerAddress?: string;
  visible?: boolean;
  compact?: boolean;
}

const OwnershipIndicator: React.FC<OwnershipIndicatorProps> = ({
  position = [0, 2, 0],
  status,
  tokenId,
  chainName,
  ownerAddress,
  visible = true,
  compact = false
}) => {
  if (!visible) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'local':
        return {
          icon: <div className="w-3 h-3 rounded-full bg-gray-400" />,
          label: 'Local Object',
          color: 'bg-gray-100 text-gray-700',
          description: 'Not minted'
        };
      case 'minting':
        return {
          icon: <Clock className="h-3 w-3 animate-spin text-orange-600" />,
          label: 'Minting...',
          color: 'bg-orange-100 text-orange-700',
          description: 'Transaction pending'
        };
      case 'minted':
        return {
          icon: <CheckCircle className="h-3 w-3 text-green-600" />,
          label: 'Minted NFT',
          color: 'bg-green-100 text-green-700',
          description: tokenId ? `Token #${tokenId}` : 'Successfully minted'
        };
      case 'owned':
        return {
          icon: <CheckCircle className="h-3 w-3 text-blue-600" />,
          label: 'Owned NFT',
          color: 'bg-blue-100 text-blue-700',
          description: tokenId ? `Token #${tokenId}` : 'You own this NFT'
        };
      case 'xcm':
        return {
          icon: <Sparkles className="h-3 w-3 text-purple-600" />,
          label: 'XCM NFT',
          color: 'bg-purple-100 text-purple-700',
          description: 'Cross-chain NFT'
        };
      default:
        return {
          icon: <AlertCircle className="h-3 w-3 text-gray-600" />,
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-700',
          description: 'Status unknown'
        };
    }
  };

  const config = getStatusConfig();

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTokenId = (id: string) => {
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  return (
    <Html position={position} center distanceFactor={15}>
      <div className="pointer-events-none">
        {compact ? (
          <Badge className={`${config.color} flex items-center gap-1 text-xs`}>
            {config.icon}
            {config.label}
          </Badge>
        ) : (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 min-w-[180px]">
            <div className="flex items-center gap-2 mb-2">
              {config.icon}
              <span className="text-sm font-medium text-gray-800">{config.label}</span>
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              <p>{config.description}</p>
              
              {chainName && (
                <p>
                  <span className="font-medium">Chain:</span> {chainName}
                </p>
              )}
              
              {tokenId && (
                <p>
                  <span className="font-medium">Token:</span> #{formatTokenId(tokenId)}
                </p>
              )}
              
              {ownerAddress && (
                <p>
                  <span className="font-medium">Owner:</span> {formatAddress(ownerAddress)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Html>
  );
};

export default OwnershipIndicator;