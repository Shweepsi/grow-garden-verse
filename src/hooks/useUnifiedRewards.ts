import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { UnifiedRewardService } from '@/services/UnifiedRewardService';
import { usePremiumStatus } from './usePremiumStatus';
import { useGameData } from './useGameData';
import { useToast } from '@/hooks/use-toast';
import { AdMobService } from '@/services/AdMobService';
import type { AdReward, AdState } from '@/types/ads';


export const useUnifiedRewards = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { data: gameData } = useGameData();
  const { toast } = useToast();
  const [availableRewards, setAvailableRewards] = useState<AdReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const getInitialState = (): AdState => ({
    available: true,
    cooldownEnds: null,
    dailyCount: 0,
    maxDaily: 5, // Valeur par défaut, sera remplacée par la valeur de la BDD
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

  const refreshState = useCallback(async () => {
    await refetchRewardState();
    // Forcer un reload des récompenses aussi
    if (gameData?.garden?.level) {
      const rewards = await UnifiedRewardService.forceReloadRewards(gameData.garden.level);
      setAvailableRewards(rewards);
    }
  }, [refetchRewardState, gameData?.garden?.level]);

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
    
    const maxDaily = rewardState.maxDaily || 5;
    const dailyCount = rewardState.dailyCount || 0;
    
    if (dailyCount >= maxDaily) {
      return `Limite quotidienne atteinte (${dailyCount}/${maxDaily})`;
    }

    if (isPremium) {
      return `Récompenses Premium disponibles (${dailyCount}/${maxDaily})`;
    }

    return `Publicités disponibles (${dailyCount}/${maxDaily})`;
  }, [user, rewardState, isPremium]);

  const claimReward = async (rewardType: string, rewardAmount: number): Promise<{ success: boolean; error?: string; message?: string }> => {
    console.log('🔧 claimReward called with:', { rewardType, rewardAmount, isPremium, userId: user?.id });
    
    if (!user) {
      console.log('❌ No user found');
      return { success: false, error: 'Utilisateur non connecté' };
    }

    const reward: AdReward = {
      type: rewardType as AdReward['type'],
      amount: rewardAmount,
      description: `${rewardType} boost x${rewardAmount}min`,
      emoji: rewardType === 'coin_boost' ? '🚀' : rewardType === 'gem_boost' ? '💎' : '⚡'
    };

    console.log('📦 Reward object created:', reward);

    try {
      if (isPremium) {
        console.log('👑 Premium user - claiming directly');
        // Utilisateur premium : réclamation directe via edge function
        const result = await UnifiedRewardService.claimReward(reward, true);
        console.log('🏆 UnifiedRewardService result:', result);
        
        if (result.success) {
          // Get the reward config from database for accurate notification
          const rewardConfig = availableRewards.find(r => r.type === reward.type);
          
          toast({
            description: `${rewardConfig?.emoji || reward.emoji} ${rewardConfig?.description || reward.description} activé pour ${rewardConfig?.duration || 60} minutes`
          });
          await refreshState();
          return { success: true, message: 'Boost premium activé avec succès' };
        } else {
          console.log('❌ Premium claim failed:', result.error);
          toast({
            title: "Erreur",
            description: result.error || 'Erreur lors de la réclamation',
            variant: "destructive"
          });
          return { success: false, error: result.error };
        }
      } else {
        console.log('📱 Standard user - showing ad first');
        // Utilisateur normal : regarder une publicité d'abord
        try {
          const adResult = await AdMobService.showRewardedAd(user.id, rewardType, rewardAmount);
          console.log('📺 Ad result:', adResult);
          
          if (adResult.success && adResult.rewarded) {
            // Publicité regardée avec succès, réclamer via edge function
            const result = await UnifiedRewardService.claimReward(reward, false);
            console.log('🎬 Post-ad claim result:', result);
            
            if (result.success) {
              // Get the reward config from database for accurate notification
              const rewardConfig = availableRewards.find(r => r.type === reward.type);
              
              toast({
                description: `${rewardConfig?.emoji || reward.emoji} ${rewardConfig?.description || reward.description} activé pour ${rewardConfig?.duration || 60} minutes`
              });
              await refreshState();
              return { success: true, message: 'Publicité regardée et boost activé' };
            } else {
              toast({
                title: "Erreur",
                description: result.error || 'Erreur lors de la distribution',
                variant: "destructive"
              });
              return { success: false, error: result.error };
            }
          } else {
            toast({
              title: "Publicité non complétée",
              description: 'Veuillez regarder la publicité entièrement',
              variant: "destructive"
            });
            return { success: false, error: 'Publicité non complétée' };
          }
        } catch (adError) {
          console.error('💥 Error showing ad:', adError);
          toast({
            title: "Erreur publicité",
            description: 'Erreur lors de l\'affichage de la publicité',
            variant: "destructive"
          });
          return { success: false, error: 'Erreur publicité' };
        }
      }
    } catch (error) {
      console.error('💥 Error in claimReward:', error);
      toast({
        title: "Erreur inattendue",
        description: 'Une erreur inattendue s\'est produite',
        variant: "destructive"
      });
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