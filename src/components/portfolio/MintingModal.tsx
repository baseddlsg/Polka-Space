import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Loader2, 
  Upload, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Coins,
  Image
} from 'lucide-react';
import { mintNFT } from '@/services/mintingService';
import { validateNFTMetadataWithResult } from '@/utils/validation';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FormValidation } from '@/components/ui/FormValidation';

interface MintingModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectDetails?: {
    name?: string;
    modelUrl?: string;
    shape?: string;
    color?: string;
    scale?: number;
    metadata?: Record<string, any>;
  };
  onMintSuccess?: (result: any) => void;
}

interface MintingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const MintingModal: React.FC<MintingModalProps> = ({
  isOpen,
  onClose,
  objectDetails,
  onMintSuccess
}) => {
  const { selectedAccount, isWalletConnected } = useWallet();
  const [formData, setFormData] = useState({
    name: objectDetails?.name || '',
    description: '',
    chainId: 'unique',
    attributes: [] as Array<{ trait_type: string; value: string }>
  });
  const [isMinting, setIsMinting] = useState(false);
  const [mintingProgress, setMintingProgress] = useState(0);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [mintError, setMintError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  // Available chains for minting
  const chains = [
    { id: 'unique', name: 'Unique Network', fee: '0.1 UNQ', color: 'bg-pink-500' },
    { id: 'astar', name: 'Astar', fee: '0.01 ASTR', color: 'bg-blue-500' },
    { id: 'moonbeam', name: 'Moonbeam', fee: '0.001 GLMR', color: 'bg-purple-500' }
  ];

  // Minting workflow steps
  const [mintingSteps, setMintingSteps] = useState<MintingStep[]>([
    {
      id: 'validate',
      title: 'Validate Metadata',
      description: 'Checking NFT metadata and 3D model',
      status: 'pending'
    },
    {
      id: 'upload',
      title: 'Upload to IPFS',
      description: 'Storing 3D model and metadata',
      status: 'pending'
    },
    {
      id: 'prepare',
      title: 'Prepare Transaction',
      description: 'Creating blockchain transaction',
      status: 'pending'
    },
    {
      id: 'sign',
      title: 'Sign Transaction',
      description: 'Waiting for wallet signature',
      status: 'pending'
    },
    {
      id: 'mint',
      title: 'Mint NFT',
      description: 'Processing on blockchain',
      status: 'pending'
    }
  ]);

  // Initialize form with object details
  useEffect(() => {
    if (objectDetails) {
      setFormData(prev => ({
        ...prev,
        name: objectDetails.name || `${objectDetails.shape || 'Model'} NFT`,
        description: `A 3D ${objectDetails.shape || 'model'} created in VR Genesis Frame`,
        attributes: [
          { trait_type: 'Type', value: objectDetails.shape || 'model' },
          { trait_type: 'Color', value: objectDetails.color || 'default' },
          { trait_type: 'Scale', value: objectDetails.scale?.toString() || '1' }
        ].filter(attr => attr.value !== 'default' && attr.value !== '1')
      }));
    }
  }, [objectDetails]);

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'NFT name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!objectDetails?.modelUrl) {
      errors.model = 'No 3D model selected for minting';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update minting step status
  const updateStepStatus = (stepId: string, status: MintingStep['status']) => {
    setMintingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  // Handle minting process
  const handleMint = async () => {
    if (!isWalletConnected || !selectedAccount) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the form errors before minting');
      return;
    }

    setIsMinting(true);
    setMintingProgress(0);
    setMintError(null);

    try {
      // Step 1: Validate metadata
      updateStepStatus('validate', 'processing');
      setMintingProgress(10);
      
      const metadata = {
        id: `temp-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        model: {
          url: objectDetails?.modelUrl || '',
          format: 'glb' as const,
          size: 0,
          dimensions: { width: 1, height: 1, depth: 1 }
        },
        materials: [],
        creator: selectedAccount.address,
        timestamp: Date.now(),
        attributes: formData.attributes.reduce((acc, attr) => {
          if (attr.trait_type && attr.value) {
            acc[attr.trait_type] = attr.value;
          }
          return acc;
        }, {} as Record<string, any>)
      };

      const validation = validateNFTMetadataWithResult(metadata);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      updateStepStatus('validate', 'completed');
      setMintingProgress(20);

      // Step 2: Upload to IPFS (simulated)
      updateStepStatus('upload', 'processing');
      setMintingProgress(40);
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStepStatus('upload', 'completed');
      setMintingProgress(60);

      // Step 3: Prepare transaction
      updateStepStatus('prepare', 'processing');
      setMintingProgress(70);
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStepStatus('prepare', 'completed');
      setMintingProgress(80);

      // Step 4: Sign transaction
      updateStepStatus('sign', 'processing');
      setMintingProgress(85);

      // Step 5: Mint NFT
      updateStepStatus('sign', 'completed');
      updateStepStatus('mint', 'processing');
      setMintingProgress(90);

      const mintResult = await mintNFT({
        ownerAddress: selectedAccount.address,
        objectDetails: {
          ...objectDetails,
          name: formData.name,
          metadata: {
            description: formData.description,
            attributes: formData.attributes
          }
        },
        chainId: formData.chainId,
        account: selectedAccount
      });

      updateStepStatus('mint', 'completed');
      setMintingProgress(100);

      toast.success('NFT minted successfully!', {
        description: `Token ID: ${mintResult.tokenId}`
      });

      onMintSuccess?.(mintResult);
      
      // Close modal after success
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('Minting error:', error);
      
      // Mark current step as error
      const currentStepId = mintingSteps.find(s => s.status === 'processing')?.id;
      if (currentStepId) {
        updateStepStatus(currentStepId, 'error');
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMintError(errorMessage);
      
      // Determine error type for better user experience
      let errorType: 'network' | 'wallet' | 'blockchain' | 'validation' | 'generic' = 'generic';
      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        errorType = 'network';
      } else if (errorMessage.includes('wallet') || errorMessage.includes('signature')) {
        errorType = 'wallet';
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        errorType = 'blockchain';
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        errorType = 'validation';
      }

      toast.error('Minting failed', {
        description: errorMessage
      });
    } finally {
      setIsMinting(false);
    }
  };

  // Reset form and state
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      chainId: 'unique',
      attributes: []
    });
    setMintingProgress(0);
    setValidationErrors({});
    setPreviewMode(false);
    setMintingSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
  };

  // Add attribute
  const addAttribute = () => {
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: '', value: '' }]
    }));
  };

  // Remove attribute
  const removeAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  // Update attribute
  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };

  // Get selected chain info
  const selectedChain = chains.find(c => c.id === formData.chainId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Mint NFT
          </DialogTitle>
        </DialogHeader>

        {!isMinting ? (
          <div className="space-y-6">
            {/* Error Display */}
            {mintError && (
              <ErrorMessage
                type="blockchain"
                message={mintError}
                onRetry={() => {
                  setMintError(null);
                  setRetryCount(prev => prev + 1);
                  handleMint();
                }}
                onDismiss={() => setMintError(null)}
                retryLabel={retryCount > 0 ? `Retry (${retryCount + 1})` : 'Retry'}
                compact
              />
            )}

            {/* Preview Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">NFT Details</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
            </div>

            {previewMode ? (
              /* Preview Mode */
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* 3D Model Preview */}
                    <div className="h-48 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <div className="text-white text-6xl">🎨</div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold">{formData.name}</h3>
                      <p className="text-gray-600 mt-2">{formData.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={selectedChain?.color}>
                        {selectedChain?.name}
                      </Badge>
                      <Badge variant="outline">
                        Fee: {selectedChain?.fee}
                      </Badge>
                    </div>

                    {formData.attributes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Attributes</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {formData.attributes.map((attr, index) => (
                            <div key={index} className="bg-gray-50 p-2 rounded">
                              <div className="text-sm font-medium">{attr.trait_type}</div>
                              <div className="text-sm text-gray-600">{attr.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="name">NFT Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter NFT name"
                      className={validationErrors.name ? 'border-red-500' : ''}
                    />
                    <FormValidation errors={validationErrors.name ? [validationErrors.name] : []} />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your NFT"
                      rows={3}
                      className={validationErrors.description ? 'border-red-500' : ''}
                    />
                    <FormValidation errors={validationErrors.description ? [validationErrors.description] : []} />
                  </div>

                  <div>
                    <Label htmlFor="chain">Blockchain</Label>
                    <Select value={formData.chainId} onValueChange={(value) => setFormData(prev => ({ ...prev, chainId: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chains.map(chain => (
                          <SelectItem key={chain.id} value={chain.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${chain.color}`} />
                              <span>{chain.name}</span>
                              <span className="text-sm text-gray-500">({chain.fee})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Attributes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Attributes</Label>
                    <Button variant="outline" size="sm" onClick={addAttribute}>
                      + Add Attribute
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.attributes.map((attr, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Trait type"
                          value={attr.trait_type}
                          onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                        />
                        <Input
                          placeholder="Value"
                          value={attr.value}
                          onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAttribute(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Info */}
                {objectDetails && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        3D Model Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <p>{objectDetails.shape || 'Custom Model'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Color:</span>
                          <p>{objectDetails.color || 'Default'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Scale:</span>
                          <p>{objectDetails.scale || 1}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Format:</span>
                          <p>GLB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Minting Progress */
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Minting Your NFT</h3>
              <Progress value={mintingProgress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">{mintingProgress}% Complete</p>
            </div>

            <div className="space-y-3">
              {mintingSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-shrink-0">
                    {step.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {step.status === 'processing' && (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                    {step.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {step.status === 'pending' && (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {!isMinting ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Coins className="h-4 w-4" />
                <span>Estimated fee: {selectedChain?.fee}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMint}
                  disabled={!isWalletConnected || Object.keys(validationErrors).length > 0}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Mint NFT
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={onClose} disabled={mintingProgress < 100}>
              {mintingProgress < 100 ? 'Minting...' : 'Close'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MintingModal;