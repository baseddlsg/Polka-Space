/**
 * Integration Hook - Provides access to complete user flow orchestration
 * Connects VR scene, portfolio, minting, and blockchain functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { integrationService, UserFlow, FlowStep } from '@/services/integrationService';
import { NFTMetadata, MintResponse, UserPortfolio } from '@/types/nft';
import { toast } from 'sonner';

export interface IntegrationState {
  isLoading: boolean;
  activeFlows: UserFlow[];
  currentFlow: UserFlow | null;
  error: string | null;
  progress: {
    step: string;
    percentage: number;
  } | null;
}

export interface IntegrationActions {
  // Minting flow
  mintNFT: (metadata: NFTMetadata) => Promise<MintResponse>;
  
  // Portfolio flow
  syncPortfolio: () => Promise<UserPortfolio>;
  
  // Community flow
  discoverCommunity: (filters?: any) => Promise<any>;
  
  // Flow management
  cancelFlow: (flowId: string) => void;
  clearError: () => void;
  
  // Event subscriptions
  onFlowUpdate: (callback: (flow: UserFlow) => void) => () => void;
  onPortfolioUpdate: (callback: (portfolio: UserPortfolio) => void) => () => void;
  onCommunityUpdate: (callback: (community: any) => void) => () => void;
}

export function useIntegration(): IntegrationState & IntegrationActions {
  const { selectedAccount, isWalletConnected, papiConnected } = useWallet();
  
  const [state, setState] = useState<IntegrationState>({
    isLoading: false,
    activeFlows: [],
    currentFlow: null,
    error: null,
    progress: null
  });

  // Update active flows periodically
  useEffect(() => {
    const updateActiveFlows = () => {
      const activeFlows = integrationService.getActiveFlows();
      setState(prev => ({ ...prev, activeFlows }));
    };

    updateActiveFlows();
    const interval = setInterval(updateActiveFlows, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleFlowStarted = (flow: UserFlow) => {
      setState(prev => ({
        ...prev,
        currentFlow: flow,
        isLoading: true,
        error: null
      }));
    };

    const handleFlowCompleted = (flow: UserFlow) => {
      setState(prev => ({
        ...prev,
        currentFlow: null,
        isLoading: false,
        progress: null
      }));
    };

    const handleFlowFailed = ({ flow, error }: { flow: UserFlow; error: any }) => {
      setState(prev => ({
        ...prev,
        currentFlow: null,
        isLoading: false,
        progress: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    };

    const handleStepStarted = ({ flow, step }: { flow: UserFlow; step: FlowStep }) => {
      setState(prev => ({
        ...prev,
        currentFlow: flow
      }));
    };

    integrationService.addEventListener('flow_started', handleFlowStarted);
    integrationService.addEventListener('flow_completed', handleFlowCompleted);
    integrationService.addEventListener('flow_failed', handleFlowFailed);
    integrationService.addEventListener('step_started', handleStepStarted);

    return () => {
      integrationService.removeEventListener('flow_started', handleFlowStarted);
      integrationService.removeEventListener('flow_completed', handleFlowCompleted);
      integrationService.removeEventListener('flow_failed', handleFlowFailed);
      integrationService.removeEventListener('step_started', handleStepStarted);
    };
  }, []);

  // Minting flow
  const mintNFT = useCallback(async (metadata: NFTMetadata): Promise<MintResponse> => {
    if (!isWalletConnected || !selectedAccount) {
      throw new Error('Wallet not connected');
    }

    if (!papiConnected) {
      throw new Error('PAPI not connected. Please ensure blockchain connectivity.');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await integrationService.executeMintingFlow(
        selectedAccount.address,
        metadata,
        (step, percentage) => {
          setState(prev => ({
            ...prev,
            progress: { step, percentage }
          }));
        }
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Minting failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false, progress: null }));
    }
  }, [isWalletConnected, selectedAccount, papiConnected]);

  // Portfolio synchronization flow
  const syncPortfolio = useCallback(async (): Promise<UserPortfolio> => {
    if (!isWalletConnected || !selectedAccount) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await integrationService.executePortfolioSyncFlow(
        selectedAccount.address,
        (step, percentage) => {
          setState(prev => ({
            ...prev,
            progress: { step, percentage }
          }));
        }
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Portfolio sync failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false, progress: null }));
    }
  }, [isWalletConnected, selectedAccount]);

  // Community discovery flow
  const discoverCommunity = useCallback(async (filters?: any): Promise<any> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await integrationService.executeCommunityDiscoveryFlow(
        filters,
        (step, percentage) => {
          setState(prev => ({
            ...prev,
            progress: { step, percentage }
          }));
        }
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Community discovery failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false, progress: null }));
    }
  }, []);

  // Flow management
  const cancelFlow = useCallback((flowId: string) => {
    // Implementation would depend on integration service supporting cancellation
    toast.info('Flow cancellation requested');
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Event subscription helpers
  const onFlowUpdate = useCallback((callback: (flow: UserFlow) => void) => {
    const handleUpdate = callback;
    integrationService.addEventListener('flow_started', handleUpdate);
    integrationService.addEventListener('flow_completed', handleUpdate);
    integrationService.addEventListener('step_completed', ({ flow }: { flow: UserFlow }) => handleUpdate(flow));
    
    return () => {
      integrationService.removeEventListener('flow_started', handleUpdate);
      integrationService.removeEventListener('flow_completed', handleUpdate);
      integrationService.removeEventListener('step_completed', handleUpdate);
    };
  }, []);

  const onPortfolioUpdate = useCallback((callback: (portfolio: UserPortfolio) => void) => {
    const handleUpdate = callback;
    integrationService.addEventListener('portfolio_updated', handleUpdate);
    
    return () => {
      integrationService.removeEventListener('portfolio_updated', handleUpdate);
    };
  }, []);

  const onCommunityUpdate = useCallback((callback: (community: any) => void) => {
    const handleUpdate = callback;
    integrationService.addEventListener('community_updated', handleUpdate);
    
    return () => {
      integrationService.removeEventListener('community_updated', handleUpdate);
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    mintNFT,
    syncPortfolio,
    discoverCommunity,
    cancelFlow,
    clearError,
    onFlowUpdate,
    onPortfolioUpdate,
    onCommunityUpdate
  };
}

export default useIntegration;