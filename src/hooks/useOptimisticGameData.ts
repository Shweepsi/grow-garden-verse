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
        .reduce((sum, update) => sum + update.amount, 0),
      // Add indicator for pending updates
      _hasOptimisticUpdates: optimisticUpdates.length > 0
    } as PlayerGarden & { _hasOptimisticUpdates?: boolean } : null
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

    // PHASE 4: Réduire la durée des mises à jour optimistes à 5 secondes
    setTimeout(() => {
      setOptimisticUpdates(prev => prev.filter(u => u.id !== update.id));
    }, 5000);
  }, []);

  // PHASE 4: Convergence intelligente - nettoyer seulement si les données convergent
  useEffect(() => {
    if (gameData?.garden) {
      // Calculer si les données ont convergé
      const currentOptimistic = optimisticUpdates.reduce((acc, update) => {
        acc[update.type] = (acc[update.type] || 0) + update.amount;
        return acc;
      }, {} as Record<string, number>);
      
      const coinsMatch = Math.abs((currentOptimistic.coins || 0)) < 10; // Tolérance de 10 pièces
      const gemsMatch = Math.abs((currentOptimistic.gems || 0)) < 2;   // Tolérance de 2 gemmes
      
      if (coinsMatch && gemsMatch) {
        // Données convergées, nettoyer les mises à jour
        setOptimisticUpdates([]);
        console.log('🎯 Données convergées, nettoyage des mises à jour optimistes');
      } else {
        // Garder seulement les mises à jour récentes (< 2 secondes)
        setOptimisticUpdates(prev => 
          prev.filter(update => Date.now() - update.timestamp < 2000)
        );
      }
    }
  }, [gameData?.garden?.coins, gameData?.garden?.gems, optimisticUpdates]);

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