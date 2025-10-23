/**
 * Integration Status Component - Shows progress of complete user flows
 * Displays current flow status, progress, and step details
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { useIntegration } from '@/hooks/useIntegration';
import { UserFlow, FlowStep } from '@/services/integrationService';

interface IntegrationStatusProps {
  showMinimized?: boolean;
  onClose?: () => void;
}

export function IntegrationStatus({ showMinimized = false, onClose }: IntegrationStatusProps) {
  const { currentFlow, progress, isLoading, error, clearError } = useIntegration();
  const [isVisible, setIsVisible] = useState(false);

  // Show component when there's an active flow or error
  useEffect(() => {
    setIsVisible(!!currentFlow || !!error || isLoading);
  }, [currentFlow, error, isLoading]);

  if (!isVisible) return null;

  const getFlowTitle = (flow: UserFlow | null) => {
    if (!flow) return 'Processing...';
    
    switch (flow.type) {
      case 'minting':
        return 'Minting NFT';
      case 'portfolio_sync':
        return 'Syncing Portfolio';
      case 'community_discovery':
        return 'Loading Community';
      default:
        return 'Processing';
    }
  };

  const getStepIcon = (step: FlowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getOverallProgress = (flow: UserFlow | null) => {
    if (!flow) return progress?.percentage || 0;
    
    const completedSteps = flow.steps.filter(step => step.status === 'completed').length;
    const totalSteps = flow.steps.length;
    
    return (completedSteps / totalSteps) * 100;
  };

  if (showMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">{getFlowTitle(currentFlow)}</h4>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {error ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-auto h-6 px-2 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            ) : (
              <>
                <Progress value={getOverallProgress(currentFlow)} className="mb-2" />
                {progress && (
                  <p className="text-xs text-muted-foreground">{progress.step}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{getFlowTitle(currentFlow)}</CardTitle>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-red-600 mb-2">Operation Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={clearError} variant="outline" size="sm">
                  Dismiss
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(getOverallProgress(currentFlow))}%</span>
                </div>
                <Progress value={getOverallProgress(currentFlow)} />
              </div>

              {/* Current Step */}
              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Step</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{progress.step}</p>
                  <Progress value={progress.percentage} />
                </div>
              )}

              {/* Step Details */}
              {currentFlow && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Steps</h4>
                  <div className="space-y-2">
                    {currentFlow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-3">
                        {getStepIcon(step)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{step.name}</p>
                          {step.status === 'in_progress' && (
                            <p className="text-xs text-muted-foreground">In progress...</p>
                          )}
                          {step.status === 'failed' && step.error && (
                            <p className="text-xs text-red-600">{step.error}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            step.status === 'completed' ? 'default' :
                            step.status === 'in_progress' ? 'secondary' :
                            step.status === 'failed' ? 'destructive' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {step.status === 'pending' ? 'Pending' :
                           step.status === 'in_progress' ? 'Active' :
                           step.status === 'completed' ? 'Done' :
                           'Failed'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flow Metadata */}
              {currentFlow && (
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Flow ID: {currentFlow.id.split('_')[0]}...{currentFlow.id.slice(-6)}</span>
                    <span>Started: {new Date(currentFlow.startTime).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default IntegrationStatus;