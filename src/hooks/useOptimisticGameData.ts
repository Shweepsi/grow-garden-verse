import { useState, useEffect, useCallback } from 'react';
import { useGameData } from './useGameData';
import { gameDataEmitter } from './useGameDataNotifier';
import { PlayerGarden } from '@/types/game';

interface OptimisticUpdate {
  id: string;
  type: 'coins' | 'gems';
  amount: number;
  timestamp: number;
}

export const useOptimisticGameData = () => {
  const { data: gameData, isLoading } = useGameData();
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);

  // Apply optimistic updates to game data
  const optimisticGameData = {
    ...gameData,
    garden: gameData?.garden ? {
      ...gameData.garden,
      coins: (gameData.garden.coins || 0) + optimisticUpdates
        .filter(update => update.type === 'coins')
        .reduce((sum, update) => sum + update.amount, 0),
      gems: (gameData.garden.gems || 0) + optimisticUpdates
        .filter(update => update.type === 'gems')
        .reduce((sum, update) => sum + update.amount, 0)
    } as PlayerGarden : null
  };

  // Add optimistic update
  const addOptimisticUpdate = useCallback((type: 'coins' | 'gems', amount: number) => {
    const update: OptimisticUpdate = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      amount,
      timestamp: Date.now()
    };

    setOptimisticUpdates(prev => [...prev, update]);

    // Remove optimistic update after 5 seconds (should be replaced by real data by then)
    setTimeout(() => {
      setOptimisticUpdates(prev => prev.filter(u => u.id !== update.id));
    }, 5000);
  }, []);

  // Clear all optimistic updates when real data arrives
  useEffect(() => {
    if (gameData?.garden) {
      // Clear updates that are older than 3 seconds when new data arrives
      setOptimisticUpdates(prev => 
        prev.filter(update => Date.now() - update.timestamp < 3000)
      );
    }
  }, [gameData?.garden?.coins, gameData?.garden?.gems]);

  // Listen for reward claimed events to add optimistic updates
  useEffect(() => {
    const handleRewardClaimed = () => {
      // Clear old optimistic updates when reward is claimed
      // The specific amounts will be added by the component that knows the reward details
      setOptimisticUpdates(prev => 
        prev.filter(update => Date.now() - update.timestamp < 1000)
      );
    };

    gameDataEmitter.on('reward-claimed', handleRewardClaimed);

    return () => {
      gameDataEmitter.off('reward-claimed', handleRewardClaimed);
    };
  }, []);

  return {
    gameData: optimisticGameData,
    isLoading,
    addOptimisticUpdate,
    hasOptimisticUpdates: optimisticUpdates.length > 0
  };
};