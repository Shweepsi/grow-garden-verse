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

    // PHASE 1: Extend optimistic updates to 10 seconds for better persistence
    setTimeout(() => {
      setOptimisticUpdates(prev => prev.filter(u => u.id !== update.id));
    }, 10000);
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

  // PHASE 1: Listen for reward claimed events with payload to add optimistic updates
  useEffect(() => {
    const handleRewardClaimed = (payload?: { type: string; amount: number }) => {
      if (payload && payload.amount && (payload.type === 'coins' || payload.type === 'gems')) {
        // Add immediate optimistic update with exact amount
        console.log(`🚀 PHASE 1: Adding optimistic update for ${payload.type}: +${payload.amount}`);
        addOptimisticUpdate(payload.type as 'coins' | 'gems', payload.amount);
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