import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { UnifiedRewardService } from '@/services/UnifiedRewardService';
import { usePremiumStatus } from './usePremiumStatus';
import { useGameData } from './useGameData';
import { toast } from 'sonner';
import { AdMobService } from '@/services/AdMobService';
import type { AdReward, AdState } from '@/types/ads';


export const useUnifiedRewards = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { data: gameData } = useGameData();
  const [availableRewards, setAvailableRewards] = useState<AdReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const getInitialState = (): AdState => ({
    available: true,
    cooldownEnds: null,
    dailyCount: 0,
    maxDaily: 5, // Limite identique pour tous
    currentReward: null,
    timeUntilNext: 0
  });

  // Query pour récupérer l'état des récompenses via la nouvelle edge function
  const { 
    data: rewardState = getInitialState(), 
    isLoading, 
    refetch: refetchRewardState 
  } = useQuery({
    queryKey: ['unifiedRewardState', user?.id],
    queryFn: () => UnifiedRewardService.getRewardState(user?.id || ''),
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    initialData: getInitialState()
  });

  // Charger les récompenses disponibles basées sur le niveau du joueur
  useEffect(() => {
    const loadAvailableRewards = async () => {
      if (!gameData?.garden?.level) return;

      setLoadingRewards(true);
      try {
        const rewards = await UnifiedRewardService.getAvailableRewards(gameData.garden.level);
        setAvailableRewards(rewards);
      } catch (error) {
        console.error('Error loading available rewards:', error);
        setAvailableRewards([]);
      } finally {
        setLoadingRewards(false);
      }
    };

    loadAvailableRewards();
  }, [gameData?.garden?.level]);

  // Initialisation d'AdMob pour les utilisateurs non-premium
  useEffect(() => {
    if (!isPremium && user) {
      AdMobService.initialize();
    }
  }, [isPremium, user]);

  const refreshState = useCallback(() => {
    refetchRewardState();
  }, [refetchRewardState]);

  const formatTimeUntilNext = useCallback((seconds: number): string => {
    if (seconds <= 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  const getStatusMessage = useCallback((): string => {
    if (!user) return 'Connexion requise';
    
    if (rewardState.dailyCount >= rewardState.maxDaily) {
      return 'Limite quotidienne atteinte (5/5)';
    }

    if (isPremium) {
      return `Récompenses Premium disponibles (${rewardState.dailyCount}/5)`;
    }

    return `Publicités disponibles (${rewardState.dailyCount}/5)`;
  }, [user, rewardState, isPremium]);

  const claimReward = async (rewardType: string, rewardAmount: number): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!user) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    const reward: AdReward = {
      type: rewardType as AdReward['type'],
      amount: rewardAmount,
      description: `${rewardType} x${rewardAmount}`,
      emoji: rewardType === 'coins' ? '🪙' : '💎'
    };

    try {
      if (isPremium) {
        // Utilisateur premium : réclamation directe via edge function
        const result = await UnifiedRewardService.claimReward(reward, true);
        
        if (result.success) {
          toast.success(`Récompense premium réclamée : ${reward.emoji} +${rewardAmount}`);
          await refetchRewardState();
          return { success: true, message: 'Récompense premium réclamée avec succès' };
        } else {
          toast.error(result.error || 'Erreur lors de la réclamation');
          return { success: false, error: result.error };
        }
      } else {
        // Utilisateur normal : regarder une publicité d'abord
        try {
          const adResult = await AdMobService.showRewardedAd(user.id, rewardType, rewardAmount);
          
          if (adResult.success && adResult.rewarded) {
            // Publicité regardée avec succès, réclamer via edge function
            const result = await UnifiedRewardService.claimReward(reward, false);
            
            if (result.success) {
              toast.success(`Récompense gagnée : ${reward.emoji} +${rewardAmount}`);
              await refetchRewardState();
              return { success: true, message: 'Publicité regardée et récompense gagnée' };
            } else {
              toast.error(result.error || 'Erreur lors de la distribution');
              return { success: false, error: result.error };
            }
          } else {
            toast.error('Publicité non terminée ou non récompensée');
            return { success: false, error: 'Publicité non complétée' };
          }
        } catch (adError) {
          console.error('Error showing ad:', adError);
          toast.error('Erreur lors de l\'affichage de la publicité');
          return { success: false, error: 'Erreur publicité' };
        }
      }
    } catch (error) {
      console.error('Error in claimReward:', error);
      toast.error('Erreur inattendue');
      return { success: false, error: 'Erreur inattendue' };
    }
  };

  return {
    // État unifié
    rewardState,
    availableRewards,
    loading: isLoading || loadingRewards,

    // Actions
    claimReward,
    refreshState,

    // Utilitaires
    formatTimeUntilNext,
    getStatusMessage,

    // Compatibilité legacy
    adState: rewardState,
    watchAd: claimReward
  };
};