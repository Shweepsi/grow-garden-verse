import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useGameData } from '@/hooks/useGameData';
import { toast } from 'sonner';
import { UnifiedRewardService } from '@/services/UnifiedRewardService';
import { AdState, AdReward } from '@/types/ads';
import { AdMobService } from '@/services/AdMobService';
import { Capacitor } from '@capacitor/core';
import { gameDataEmitter } from '@/hooks/useGameDataNotifier';
import { supabase } from '@/integrations/supabase/client';

// Persistance localStorage pour l'état unifié
const UNIFIED_STATE_STORAGE_KEY = 'unifiedRewardState';

const getStoredState = (): Partial<AdState> | null => {
  try {
    const stored = localStorage.getItem(UNIFIED_STATE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setStoredState = (state: AdState): void => {
  try {
    localStorage.setItem(UNIFIED_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
};

export const useUnifiedRewards = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { data: gameData } = useGameData();
  const queryClient = useQueryClient();
  const mounted = useRef(true);
  const [availableRewards, setAvailableRewards] = useState<AdReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  // Force reset quotidien unifié
  const forceReset = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke('force-daily-reset');
      if (data.success) {
        toast.success('Reset quotidien effectué');
        queryClient.invalidateQueries({ queryKey: ['unifiedRewardState', user.id] });
      }
    } catch (error) {
      console.error('Error forcing reset:', error);
    }
  }, [user, queryClient]);

  // État initial conservateur
  const getInitialState = (): AdState => {
    const stored = getStoredState();
    if (stored) {
      return {
        available: false,
        cooldownEnds: stored.cooldownEnds || null,
        dailyCount: stored.dailyCount || 5,
        maxDaily: stored.maxDaily || 5,
        currentReward: null,
        timeUntilNext: stored.timeUntilNext || 3600
      };
    }
    
    return {
      available: false,
      cooldownEnds: null,
      dailyCount: 5,
      maxDaily: 5,
      currentReward: null,
      timeUntilNext: 3600
    };
  };

  // Query unifié pour l'état des récompenses
  const { 
    data: rewardState = getInitialState(), 
    isLoading: loading,
    refetch,
    isInitialLoading
  } = useQuery({
    queryKey: ['unifiedRewardState', user?.id, isPremium],
    queryFn: async (): Promise<AdState> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const newState = await UnifiedRewardService.getRewardState(user.id, isPremium);
      setStoredState(newState);
      
      return newState;
    },
    enabled: !!user?.id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.timeUntilNext && data.timeUntilNext > 0) {
        return Math.min(data.timeUntilNext * 1000, 60000);
      }
      return 5 * 60 * 1000;
    },
    initialData: getInitialState,
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Charger les récompenses disponibles
  useEffect(() => {
    const loadRewards = async () => {
      if (!user?.id || !gameData?.garden?.level) return;
      
      try {
        setLoadingRewards(true);
        const rewards = await UnifiedRewardService.getAvailableRewards(gameData.garden.level);
        if (mounted.current) {
          setAvailableRewards(rewards);
        }
      } catch (error) {
        console.error('Error loading unified rewards:', error);
      } finally {
        if (mounted.current) {
          setLoadingRewards(false);
        }
      }
    };

    loadRewards();
  }, [user?.id, gameData?.garden?.level]);

  // Initialiser AdMob seulement pour les non-premium
  useEffect(() => {
    const initializeAdMob = async () => {
      if (isPremium || !Capacitor.isNativePlatform()) return;
      
      console.log('UnifiedRewards: Initializing AdMob for non-premium user...');
      await AdMobService.initialize();
    };

    initializeAdMob();

    return () => {
      if (!isPremium) {
        AdMobService.cleanup();
      }
    };
  }, [isPremium]);

  // Timer pour actualiser le cooldown
  useEffect(() => {
    if (!rewardState?.timeUntilNext || rewardState.timeUntilNext <= 0) return;

    const interval = setInterval(() => {
      if (mounted.current) {
        queryClient.setQueryData(['unifiedRewardState', user?.id, isPremium], (prev: AdState | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            timeUntilNext: Math.max(0, prev.timeUntilNext - 1)
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rewardState?.timeUntilNext, queryClient, user?.id, isPremium]);

  // Track component mount/unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Refresh state function
  const refreshState = useCallback(async () => {
    if (!user?.id || !mounted.current) return;
    await refetch();
  }, [user?.id, refetch]);

  // Formater le temps restant
  const formatTimeUntilNext = useCallback((seconds: number): string => {
    if (seconds <= 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours >= 12) {
      return `${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  // Message d'état unifié
  const getStatusMessage = useCallback((): string => {
    if (isPremium) {
      return "👑 Premium: Récompenses automatiques";
    }
    
    if (!rewardState) return "Chargement...";
    
    if (rewardState.dailyCount >= rewardState.maxDaily) {
      const timeFormatted = formatTimeUntilNext(rewardState.timeUntilNext);
      return `Limite quotidienne atteinte. Reset dans ${timeFormatted}`;
    }
    
    return `Récompenses réclamées: ${rewardState.dailyCount}/${rewardState.maxDaily}`;
  }, [rewardState, formatTimeUntilNext, isPremium]);

  // Fonction principale pour réclamer une récompense
  const claimReward = async (rewardType: string, rewardAmount: number) => {
    if (!user?.id || !mounted.current || !rewardState) {
      return { success: false, error: 'Not authenticated' };
    }

    // Vérifier le cooldown
    if (!rewardState.available) {
      const timeFormatted = formatTimeUntilNext(rewardState.timeUntilNext);
      const errorMessage = rewardState.dailyCount >= rewardState.maxDaily
        ? `Limite quotidienne atteinte. Reset dans ${timeFormatted}.`
        : `Cooldown actif. Prochaine récompense dans ${timeFormatted}.`;
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }

    try {
      // Créer l'objet reward
      const configuredReward = availableRewards.find(r => r.type === rewardType);
      const reward: AdReward = {
        type: rewardType as any,
        amount: rewardAmount,
        duration: configuredReward?.duration,
        description: isPremium ? 'Récompense premium automatique' : 'Récompense publicitaire',
        emoji: configuredReward?.emoji || '🎁'
      };

      let result;

      if (isPremium) {
        // Utiliser le service unifié pour premium
        result = await UnifiedRewardService.distributeReward(user.id, reward, true);
      } else {
        // Pour les non-premium, afficher la publicité puis distribuer
        const adResult = await AdMobService.showRewardedAd(user.id, rewardType, rewardAmount);
        if (!adResult.success) {
          return { success: false, error: adResult.error };
        }
        result = { success: true };
      }

      if (result.success && mounted.current) {
        // Refresh state and game data
        refreshState();
        queryClient.invalidateQueries({ queryKey: ['gameData'] });

        // Emit events for optimistic updates
        gameDataEmitter.emit('reward-claimed', { type: rewardType, amount: rewardAmount });
        gameDataEmitter.emit(`${rewardType}-claimed`, { amount: rewardAmount });
        
        return { success: true, message: isPremium ? "Récompense premium accordée !" : "Récompense publicitaire accordée !" };
      }

      return result;
    } catch (error) {
      console.error('Error claiming reward:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  return {
    // State
    rewardState,
    availableRewards,
    loading: loading || isInitialLoading || loadingRewards,
    
    // Actions
    claimReward,
    refreshState,
    forceReset,
    
    // Utils
    formatTimeUntilNext,
    getStatusMessage,
    
    // Legacy compatibility
    adState: rewardState,
    watchAd: claimReward
  };
};