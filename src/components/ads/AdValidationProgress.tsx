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
    <div className="text-center py-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl animate-pulse">
      <div className="relative inline-block">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 drop-shadow-sm" />
        <div className="absolute inset-0 w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
      </div>
      <div className="text-sm text-blue-800 font-semibold mt-3 mb-4">
        Validation de la récompense...
      </div>
      {validationProgress > 0 && (
        <div className="max-w-xs mx-auto">
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 transition-all duration-500 ease-out relative"
              style={{ width: `${validationProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </div>
          </div>
          <div className="text-xs text-blue-600 font-medium mt-2">
            {Math.round(validationProgress)}% terminé
          </div>
        </div>
      )}
    </div>
  );
}