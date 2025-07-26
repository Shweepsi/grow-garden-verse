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
    const baseClasses = "flex-1 transition-all duration-300 font-bold";
    
    if (dailyLimitReached) {
      return `${baseClasses} bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700`;
    }
    
    return `${baseClasses} bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30`;
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