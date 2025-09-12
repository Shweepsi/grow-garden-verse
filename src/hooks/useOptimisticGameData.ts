import { useState, useEffect, useCallback } from 'react';
import { useGameData } from './useGameData';
import { gameDataEmitter } from './useGameDataNotifier';
import { PlayerGarden } from '@/types/game';

interface OptimisticUpdate {
  id: string;
  type: 'coins'; // SOLUTION: Only coins for optimistic updates, gems handled by backend sync
  amount: number;
  timestamp: number;
}

export const useOptimisticGameData = () => {
  const { data: gameData, isLoading } = useGameData();
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);

  // Apply optimistic updates to game data (ONLY COINS - gems handled by backend sync)
  const optimisticGameData = {
    ...gameData,
    garden: gameData?.garden ? {
      ...gameData.garden,
      coins: (gameData.garden.coins || 0) + optimisticUpdates
        .filter(update => update.type === 'coins')
        .reduce((sum, update) => sum + update.amount, 0),
      // SOLUTION: Gems excluded from optimistic updates to prevent duplication
      // Add indicator for pending updates
      _hasOptimisticUpdates: optimisticUpdates.length > 0
    } as PlayerGarden & { _hasOptimisticUpdates?: boolean } : null
  };

  // Add optimistic update (ONLY COINS - gems handled by backend sync)
  const addOptimisticUpdate = useCallback((type: 'coins', amount: number) => {
    // SOLUTION: Only accept coins to prevent gem duplication
    if (type !== 'coins') {
      console.log(`🚫 Optimistic update rejected for ${type} - handled by backend sync`);
      return;
    }

    const update: OptimisticUpdate = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      amount,
      timestamp: Date.now()
    };

    setOptimisticUpdates(prev => [...prev, update]);

    // Faster timeout for coins only
    setTimeout(() => {
      setOptimisticUpdates(prev => prev.filter(u => u.id !== update.id));
    }, 3000);
  }, []);

  // SOLUTION: Simplified convergence detection for coins only
  useEffect(() => {
    if (gameData?.garden && optimisticUpdates.length > 0) {
      // Clear updates when real data converges
      setOptimisticUpdates(prev => prev.filter(update => {
        const timeSinceUpdate = Date.now() - update.timestamp;
        
        // Clear old updates after 2 seconds for faster convergence
        if (timeSinceUpdate > 2000) return false;
        
        // Keep recent updates that might still be converging
        return timeSinceUpdate < 1000;
      }));
    }
  }, [gameData?.garden?.coins, optimisticUpdates.length]);

  // SOLUTION: Listen only for coins in optimistic updates
  useEffect(() => {
    const handleRewardClaimed = (payload?: { type: string; amount: number }) => {
      if (payload && payload.amount && payload.type === 'coins') {
        // Only add optimistic update for coins
        console.log(`🚀 Adding optimistic update for coins only: +${payload.amount}`);
        addOptimisticUpdate('coins', payload.amount);
      }
      
      // SOLUTION: Don't handle gems here - they're managed by backend sync only
      if (payload && payload.type === 'gems') {
        console.log(`💎 Gems handled by backend sync: +${payload.amount}`);
      }
      
      // Clear old optimistic updates when reward is claimed
      setOptimisticUpdates(prev => 
        prev.filter(update => Date.now() - update.timestamp < 1000)
      );
    };

    gameDataEmitter.on('reward-claimed', handleRewardClaimed);

    return () => {
      gameDataEmitter.off('reward-claimed', handleRewardClaimed);
    };
  }, [addOptimisticUpdate]);

  return {
    gameData: optimisticGameData,
    isLoading,
    addOptimisticUpdate,
    hasOptimisticUpdates: optimisticUpdates.length > 0
  };
};