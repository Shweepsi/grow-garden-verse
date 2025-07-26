import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import { AdWatchState } from '@/hooks/useAdWatcher';

interface AdWatchButtonProps {
  watchState: AdWatchState;
  selectedReward: boolean;
  dailyLimitReached: boolean;
  onWatchAd: () => void;
}

export function AdWatchButton({
  watchState,
  selectedReward,
  dailyLimitReached,
  onWatchAd
}: AdWatchButtonProps) {
  const { isWatching, isWaitingForReward } = watchState;
  const isLoading = isWatching || isWaitingForReward;
  const isDisabled = !selectedReward || isLoading || dailyLimitReached;

  const getButtonContent = () => {
    if (isWatching) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Chargement...
        </>
      );
    }

    if (isWaitingForReward) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Validation...
        </>
      );
    }

    if (dailyLimitReached) {
      return (
        <>
          <AlertCircle className="w-4 h-4 mr-2" />
          Limite atteinte
        </>
      );
    }

    return (
      <>
        <Play className="w-4 h-4 mr-2" />
        Regarder
      </>
    );
  };

  const getButtonClassName = () => {
    const baseClasses = "flex-1 transition-all duration-300 font-semibold shadow-lg transform-gpu";
    
    if (dailyLimitReached) {
      return `${baseClasses} bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 shadow-gray-400/30 text-white`;
    }
    
    if (isLoading) {
      return `${baseClasses} bg-gradient-to-r from-blue-400 to-blue-500 shadow-blue-400/30 text-white`;
    }
    
    return `${baseClasses} bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:via-orange-700 hover:to-amber-700 shadow-orange-500/40 text-white hover:shadow-orange-500/50 hover:scale-105`;
  };

  return (
    <Button 
      onClick={onWatchAd}
      disabled={isDisabled}
      className={getButtonClassName()}
    >
      {getButtonContent()}
    </Button>
  );
}