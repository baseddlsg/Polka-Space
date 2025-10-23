import React from 'react';
import { Loader2, Wallet, Upload, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface LoadingStateProps {
  type?: 'spinner' | 'progress' | 'skeleton' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  progress?: number;
  icon?: 'wallet' | 'upload' | 'download' | 'refresh' | 'default';
  className?: string;
  fullScreen?: boolean;
}

/**
 * Reusable loading state component with various display options
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  size = 'md',
  message,
  progress,
  icon = 'default',
  className = '',
  fullScreen = false
}) => {
  const getIconComponent = () => {
    const iconProps = {
      className: `animate-spin ${
        size === 'sm' ? 'h-4 w-4' : 
        size === 'md' ? 'h-6 w-6' : 
        'h-8 w-8'
      }`
    };

    switch (icon) {
      case 'wallet':
        return <Wallet {...iconProps} />;
      case 'upload':
        return <Upload {...iconProps} />;
      case 'download':
        return <Download {...iconProps} />;
      case 'refresh':
        return <RefreshCw {...iconProps} />;
      default:
        return <Loader2 {...iconProps} />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const renderSpinner = () => (
    <div className={`flex flex-col items-center justify-center gap-3 ${getSizeClasses()}`}>
      {getIconComponent()}
      {message && (
        <p className="text-gray-600 text-center max-w-sm">
          {message}
        </p>
      )}
    </div>
  );

  const renderProgress = () => (
    <div className={`flex flex-col items-center justify-center gap-4 ${getSizeClasses()}`}>
      <div className="flex items-center gap-3">
        {getIconComponent()}
        {message && (
          <p className="text-gray-600">
            {message}
          </p>
        )}
      </div>
      {progress !== undefined && (
        <div className="w-full max-w-sm">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500 text-center mt-2">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );

  const renderSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );

  const renderPulse = () => (
    <div className={`flex items-center justify-center ${getSizeClasses()}`}>
      <div className="animate-pulse">
        <div className={`
          rounded-full bg-gradient-to-r from-purple-400 to-indigo-400
          ${size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : 'h-16 w-16'}
        `} />
      </div>
      {message && (
        <p className="ml-3 text-gray-600">
          {message}
        </p>
      )}
    </div>
  );

  const getContent = () => {
    switch (type) {
      case 'progress':
        return renderProgress();
      case 'skeleton':
        return renderSkeleton();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  const content = getContent();

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
        <Card className="p-6">
          <CardContent className="p-0">
            {content}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-6 ${className}`}>
      {content}
    </div>
  );
};

/**
 * Specialized loading components for common use cases
 */
export const WalletConnectingLoader: React.FC<{ message?: string }> = ({ 
  message = "Connecting to wallet..." 
}) => (
  <LoadingState 
    type="spinner" 
    icon="wallet" 
    message={message}
    size="md"
  />
);

export const MintingLoader: React.FC<{ progress?: number; step?: string }> = ({ 
  progress, 
  step = "Minting your NFT..." 
}) => (
  <LoadingState 
    type="progress" 
    icon="upload" 
    message={step}
    progress={progress}
    size="md"
  />
);

export const PortfolioLoader: React.FC<{ message?: string }> = ({ 
  message = "Loading your NFT portfolio..." 
}) => (
  <LoadingState 
    type="pulse" 
    message={message}
    size="lg"
  />
);

export const BlockchainLoader: React.FC<{ message?: string }> = ({ 
  message = "Syncing with blockchain..." 
}) => (
  <LoadingState 
    type="spinner" 
    icon="refresh" 
    message={message}
    size="md"
  />
);

export default LoadingState;