import React from 'react';
import { Loader2 } from 'lucide-react';
import { AdWatchState } from '@/hooks/useAdWatcher';

interface AdValidationProgressProps {
  watchState: AdWatchState;
}

export function AdValidationProgress({ watchState }: AdValidationProgressProps) {
  const { isWaitingForReward, validationProgress } = watchState;

  if (!isWaitingForReward) {
    return null;
  }

  return (
    <div className="text-center py-4 premium-card rounded-lg">
      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-orange-400" />
      <div className="text-sm text-white/80 font-medium">Validation en cours...</div>
      {validationProgress > 0 && (
        <div className="w-full bg-white/20 rounded-full h-1 mt-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
            style={{ width: `${validationProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}