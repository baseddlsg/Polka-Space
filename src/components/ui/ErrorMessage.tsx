import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  ExternalLink,
  Wifi,
  Wallet,
  Coins
} from 'lucide-react';

export type ErrorType = 
  | 'network' 
  | 'wallet' 
  | 'validation' 
  | 'blockchain' 
  | 'server' 
  | 'permission' 
  | 'generic';

export type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorMessageProps {
  type?: ErrorType;
  severity?: ErrorSeverity;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  showDetails?: boolean;
  className?: string;
  compact?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
}

/**
 * Comprehensive error message component with contextual styling and actions
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type = 'generic',
  severity = 'error',
  title,
  message,
  details,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  showDetails = false,
  className = '',
  compact = false,
  actions = []
}) => {
  const getIcon = () => {
    const iconClass = `h-5 w-5 ${
      severity === 'error' ? 'text-red-500' :
      severity === 'warning' ? 'text-yellow-500' :
      'text-blue-500'
    }`;

    switch (type) {
      case 'network':
        return <Wifi className={iconClass} />;
      case 'wallet':
        return <Wallet className={iconClass} />;
      case 'blockchain':
        return <Coins className={iconClass} />;
      case 'validation':
        return <AlertCircle className={iconClass} />;
      case 'server':
        return <XCircle className={iconClass} />;
      case 'permission':
        return <AlertTriangle className={iconClass} />;
      default:
        return severity === 'info' ? 
          <Info className={iconClass} /> : 
          <AlertTriangle className={iconClass} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'network':
        return 'Connection Error';
      case 'wallet':
        return 'Wallet Error';
      case 'blockchain':
        return 'Blockchain Error';
      case 'validation':
        return 'Validation Error';
      case 'server':
        return 'Server Error';
      case 'permission':
        return 'Permission Error';
      default:
        return severity === 'error' ? 'Error' : 
               severity === 'warning' ? 'Warning' : 
               'Information';
    }
  };

  const getAlertVariant = () => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default'; // No warning variant in shadcn, use default
      case 'info':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const getSuggestedActions = () => {
    const suggestions: Array<{ label: string; onClick: () => void; variant?: 'default' | 'outline' }> = [];

    switch (type) {
      case 'network':
        suggestions.push({
          label: 'Check Connection',
          onClick: () => window.open('https://www.google.com', '_blank'),
          variant: 'outline'
        });
        break;
      case 'wallet':
        suggestions.push({
          label: 'Reconnect Wallet',
          onClick: () => window.location.reload(),
          variant: 'outline'
        });
        break;
      case 'blockchain':
        suggestions.push({
          label: 'Check Network Status',
          onClick: () => window.open('https://polkadot.subscan.io/', '_blank'),
          variant: 'outline'
        });
        break;
    }

    return suggestions;
  };

  if (compact) {
    return (
      <Alert variant={getAlertVariant()} className={className}>
        {getIcon()}
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          <div className="flex gap-2 ml-4">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                {retryLabel}
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                ×
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`border-l-4 ${
      severity === 'error' ? 'border-l-red-500' :
      severity === 'warning' ? 'border-l-yellow-500' :
      'border-l-blue-500'
    } ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getIcon()}
          {title || getDefaultTitle()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-gray-700">{message}</p>
        
        {details && showDetails && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Details</h4>
            <p className="text-sm text-gray-600 font-mono">{details}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button onClick={onRetry} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
          )}
          
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
          
          {getSuggestedActions().map((suggestion, index) => (
            <Button
              key={`suggestion-${index}`}
              variant={suggestion.variant}
              size="sm"
              onClick={suggestion.onClick}
            >
              {suggestion.label}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          ))}
          
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Specialized error components for common scenarios
 */
export const NetworkError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage 
    type="network" 
    title="Connection Problem"
    {...props} 
  />
);

export const WalletError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage 
    type="wallet" 
    title="Wallet Issue"
    {...props} 
  />
);

export const BlockchainError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage 
    type="blockchain" 
    title="Blockchain Error"
    {...props} 
  />
);

export const ValidationError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage 
    type="validation" 
    severity="warning"
    title="Validation Issue"
    {...props} 
  />
);

export default ErrorMessage;