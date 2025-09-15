import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { UnifiedRewardService } from '@/services/UnifiedRewardService';
import { usePremiumStatus } from './usePremiumStatus';
import { useGameData } from './useGameData';
import { useToast } from '@/hooks/use-toast';
import { AdMobSimpleService } from '@/services/ads/AdMobSimpleService';
import { AdRetryService } from '@/services/ads/AdRetryService';
import { AdPreloadService } from '@/services/ads/AdPreloadService';
import { AdEffectsService } from '@/services/ads/AdEffectsService';
import type { AdReward, AdState } from '@/types/ads';


export const useUnifiedRewards = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { data: gameData } = useGameData();
  const { toast } = useToast();
  const [availableRewards, setAvailableRewards] = useState<AdReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [adLoading, setAdLoading] = useState(false); // État de chargement spécifique pour les pubs

  // Query pour récupérer l'état des récompenses via la nouvelle edge function
  const { 
    data: rewardState, 
    isLoading, 
    refetch: refetchRewardState 
  } = useQuery({
    queryKey: ['unifiedRewardState', user?.id],
    queryFn: () => UnifiedRewardService.getRewardState(user?.id || ''),
    enabled: !!user,
    staleTime: 5 * 1000, // 5 secondes pour des données plus fraîches
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000
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

  // Initialisation d'AdMob et préchargement pour les utilisateurs non-premium
  useEffect(() => {
    if (!isPremium && user) {
      AdMobSimpleService.initialize();
      // Démarrer le préchargement automatique
      AdPreloadService.startBackgroundPreloading();
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
    if (!rewardState) return 'Chargement...';
    
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
    
    // Store attempt timestamp for diagnostics
    localStorage.setItem('lastRewardAttempt', new Date().toISOString());
    localStorage.setItem('lastRewardStatus', 'En cours...');
    
    if (!user) {
      console.log('❌ No user found');
      localStorage.setItem('lastRewardStatus', 'Échec: Utilisateur non connecté');
      return { success: false, error: 'Utilisateur non connecté' };
    }

    const reward: AdReward = {
      type: rewardType as AdReward['type'],
      amount: rewardAmount,
      description: `${rewardType} boost x${rewardAmount}min`,
      emoji: rewardType === 'coin_boost' ? '🚀' : '⚡'
    };

    console.log('📦 Reward object created:', reward);

    try {
      if (isPremium) {
        console.log('👑 Premium user - claiming directly');
        // Utilisateur premium : réclamation directe via edge function
        // Don't skip increment for premium users (no ad callback)
        const result = await UnifiedRewardService.claimReward(reward, true, false);
        console.log('🏆 UnifiedRewardService result:', result);
        
        if (result.success) {
          // Get the reward config from database for accurate notification
          const rewardConfig = availableRewards.find(r => r.type === reward.type);
          
          localStorage.setItem('lastRewardStatus', 'Succès: Boost premium activé');
          toast({
            description: `${rewardConfig?.emoji || reward.emoji} ${rewardConfig?.description || reward.description} activé pour ${rewardConfig?.duration || 60} minutes`
          });
          await refreshState();
          return { success: true, message: 'Boost premium activé avec succès' };
        } else {
          console.log('❌ Premium claim failed:', result.error);
          localStorage.setItem('lastRewardStatus', `Échec: ${result.error}`);
          toast({
            title: "Erreur",
            description: result.error || 'Erreur lors de la réclamation',
            variant: "destructive"
          });
          return { success: false, error: result.error };
        }
      } else {
        console.log('📱 Standard user - showing ad first');
        
        // Vérifier d'abord les limites quotidiennes
        if (!rewardState?.available || (rewardState.dailyCount >= rewardState.maxDaily)) {
          const maxDaily = rewardState?.maxDaily || 5;
          const dailyCount = rewardState?.dailyCount || 0;
          toast({
            title: "Limite atteinte",
            description: `Limite quotidienne atteinte (${dailyCount}/${maxDaily})`,
            variant: "destructive"
          });
          return { success: false, error: 'Limite quotidienne atteinte' };
        }
        
        // Utilisateur normal : regarder une publicité avec retry intelligent
        try {
          console.log('🎬 Affichage de la publicité avec retry intelligent...');
          setAdLoading(true);
          
          const adResult = await AdRetryService.executeWithRetry(
            () => AdMobSimpleService.showAd()
          );
          
          console.log('📺 Résultat publicité:', adResult);
          
          if (adResult.success && adResult.rewarded) {
            console.log('✅ Publicité regardée avec succès');
            
            // Effet visuel immédiat
            AdEffectsService.triggerBoostActivation(reward);
            
            // Toast de progression
            toast({
              description: "🎯 Publicité terminée ! Attribution de votre récompense...",
              duration: 10000
            });
            
            // Réclamer la récompense via l'edge function
            const result = await UnifiedRewardService.claimReward(reward, false, false);
            console.log('🎬 Résultat réclamation:', result);
            
            if (result.success) {
              const rewardConfig = availableRewards.find(r => r.type === reward.type);
              
              // Planifier le prochain préchargement
              AdPreloadService.scheduleNextPreload();
              
              // Toast de confirmation avec délai
              setTimeout(() => {
                localStorage.setItem('lastRewardStatus', 'Succès: Boost activé après publicité');
                toast({
                  description: `✅ ${rewardConfig?.emoji || reward.emoji} ${rewardConfig?.description || reward.description} activé pour ${rewardConfig?.duration || 60} minutes`
                });
              }, 2000);
              
              await refreshState();
              return { success: true, message: 'Publicité regardée et boost activé' };
            } else {
              console.error('❌ Échec réclamation après publicité:', result.error);
              localStorage.setItem('lastRewardStatus', `Échec: ${result.error}`);
              toast({
                title: "Erreur de distribution",
                description: result.error || 'Erreur lors de la distribution de la récompense',
                variant: "destructive"
              });
              return { success: false, error: result.error };
            }
          } else {
            console.error('❌ Publicité non complétée');
            toast({
              title: "Publicité non complétée",
              description: "Veuillez regarder la publicité entièrement pour recevoir la récompense",
              variant: "destructive"
            });
            return { success: false, error: 'Publicité non complétée' };
          }
        } catch (adError) {
          console.error('💥 Erreur publicité:', adError);
          
          // Messages d'erreur explicites et actionables
          const errorInfo = AdRetryService.getActionableErrorMessage(adError as Error);
          
          // Vérifier si un refresh est recommandé
          if (AdMobSimpleService.shouldRecommendRefresh()) {
            console.log('[UnifiedRewards] 🔄 Refresh recommandé après échec');
          }
          
          localStorage.setItem('lastRewardStatus', `Échec: ${errorInfo.title}`);
          toast({
            title: errorInfo.title,
            description: `${errorInfo.message}${errorInfo.action ? `\n\n${errorInfo.action}` : ''}`,
            variant: "destructive"
          });
          
          return { success: false, error: errorInfo.message };
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
    } finally {
      setAdLoading(false); // DÉSACTIVER le spinner dans tous les cas
    }
  };

  return {
    // État unifié
    rewardState,
    availableRewards,
    loading: isLoading || loadingRewards || adLoading,

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