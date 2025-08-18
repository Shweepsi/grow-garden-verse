import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Event emitter for game data updates
class GameDataEventEmitter {
  private listeners: { [key: string]: Array<() => void> } = {};

  emit(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener());
    }
  }

  on(event: string, listener: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: () => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }
}

export const gameDataEmitter = new GameDataEventEmitter();

export const useGameDataNotifier = () => {
  const queryClient = useQueryClient();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const notifyRewardClaimed = useCallback((rewardType: 'coins' | 'gems' | 'boost') => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Immediately emit events for instant UI updates
    gameDataEmitter.emit('reward-claimed');
    gameDataEmitter.emit(`${rewardType}-claimed`);

    // Aggressive refresh strategy after reward claim
    const refreshGameData = async () => {
      // Invalidate all game-related queries
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      
      // Force immediate refetch with reduced stale time
      queryClient.refetchQueries({ 
        queryKey: ['gameData'],
        type: 'active'
      });
    };

    // Immediate refresh
    refreshGameData();

    // Additional refreshes at strategic intervals to ensure data consistency
    refreshTimeoutRef.current = setTimeout(() => {
      refreshGameData();
      
      // One more refresh after 2 seconds to be absolutely sure
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['gameData'] });
      }, 2000);
    }, 100);

  }, [queryClient]);

  const notifyDataChange = useCallback((dataType: string) => {
    gameDataEmitter.emit(`${dataType}-changed`);
    queryClient.invalidateQueries({ queryKey: ['gameData'] });
  }, [queryClient]);

  return {
    notifyRewardClaimed,
    notifyDataChange,
    gameDataEmitter
  };
};