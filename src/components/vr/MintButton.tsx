import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Coins, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { mintNFT } from '@/services/mintingService';

interface MintButtonProps {
  position?: [number, number, number];
  objectDetails: {
    name?: string;
    modelUrl?: string;
    shape?: string;
    color?: string;
    scale?: number;
    metadata?: Record<string, any>;
  };
  onMintStart?: () => void;
  onMintSuccess?: (result: any) => void;
  onMintError?: (error: Error) => void;
  visible?: boolean;
}

const MintButton: React.FC<MintButtonProps> = ({
  position = [0, 1.5, 0],
  objectDetails,
  onMintStart,
  onMintSuccess,
  onMintError,
  visible = true
}) => {
  const { selectedAccount, isWalletConnected } = useWallet();
  const [mintingStatus, setMintingStatus] = useState<'idle' | 'minting' | 'success' | 'error'>('idle');

  const handleMint = async () => {
    if (!isWalletConnected || !selectedAccount) {
      toast.error('Please connect your wallet first');
      return;
    }

    setMintingStatus('minting');
    onMintStart?.();

    try {
      const result = await mintNFT({
        ownerAddress: selectedAccount.address,
        objectDetails: {
          ...objectDetails,
          name: objectDetails.name || 'Unnamed Object',
        },
        chainId: 'assethub',
        account: selectedAccount,
      });

      setMintingStatus('success');
      onMintSuccess?.(result);

      toast.success('NFT minted successfully!', {
        description: `Token ID: ${result.tokenId}`
      });

      // Reset status after 3 seconds
      setTimeout(() => setMintingStatus('idle'), 3000);
    } catch (error) {
      setMintingStatus('error');
      onMintError?.(error as Error);
      
      toast.error('Minting failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });

      // Reset status after 3 seconds
      setTimeout(() => setMintingStatus('idle'), 3000);
    }
  };

  if (!visible) return null;

  const getButtonContent = () => {
    switch (mintingStatus) {
      case 'minting':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Minting...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Minted!
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            Failed
          </>
        );
      default:
        return (
          <>
            <Coins className="h-4 w-4 mr-2" />
            Mint NFT
          </>
        );
    }
  };

  const getButtonStyle = () => {
    switch (mintingStatus) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white';
    }
  };

  return (
    <Html position={position} center distanceFactor={10}>
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
        <div className="text-center mb-2">
          <h3 className="text-sm font-medium text-gray-800">{objectDetails.name || 'Unnamed Object'}</h3>
          <p className="text-xs text-gray-600">{objectDetails.shape || 'Custom Model'}</p>
        </div>
        
        <Button
          onClick={handleMint}
          disabled={mintingStatus === 'minting' || !isWalletConnected}
          className={`w-full text-sm ${getButtonStyle()}`}
          size="sm"
        >
          {getButtonContent()}
        </Button>
        
        {!isWalletConnected && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Connect wallet to mint
          </p>
        )}
      </div>
    </Html>
  );
};

export default MintButton;