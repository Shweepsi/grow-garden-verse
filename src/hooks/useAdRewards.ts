
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { AdState } from '@/types/ads';
import { AdMobService } from '@/services/AdMobService';
import { Capacitor } from '@capacitor/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdRewardService } from '@/services/AdRewardService';
import { useGameData } from './useGameData';

export const useAdRewards = () => {
  const { user } = useAuth();
  const mounted = useRef(true);
  const { data: gameData } = useGameData();
  const queryClient = useQueryClient();

  // Requête pour l'état des publicités (cooldown, limite quotidienne, etc.)
  const adStateQuery = useQuery({
    queryKey: ['adState', user?.id],
    queryFn: () => user?.id ? AdRewardService.getAdState(user.id) : Promise.reject('No user'),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 secondes
    refetchInterval: 60 * 1000, // 1 minute
  });

  // Requête pour les récompenses disponibles (dynamique depuis Supabase)
  const availableRewardsQuery = useQuery({
    queryKey: ['adRewards', gameData?.garden?.level],
    queryFn: () => AdRewardService.getAvailableRewards(gameData?.garden?.level || 1),
    enabled: !!gameData?.garden?.level,
    staleTime: 1 * 60 * 1000, // 1 minute pour changements rapides
    refetchInterval: 30 * 1000, // 30 secondes pour changements en temps réel
  });

  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Track component mount/unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Initialiser AdMob avec diagnostics améliorés
  useEffect(() => {
    const initializeAdMob = async () => {
      if (Capacitor.isNativePlatform()) {
        console.log('AdMob: Initializing for production...');
        const initialized = await AdMobService.initialize();
        
        // Récupérer les informations de diagnostic
        const debugInfo = AdMobService.getDebugInfo();
        if (mounted.current) {
          setDiagnostics(debugInfo);
        }
        
        console.log('AdMob: Initialization result:', initialized);
        console.log('AdMob: Debug info:', debugInfo);
      }
    };

    initializeAdMob();

    return () => {
      AdMobService.cleanup();
    };
  }, []);

  // Fonction pour forcer le rechargement des récompenses depuis Supabase
  const refreshRewards = async () => {
    if (gameData?.garden?.level) {
      await AdRewardService.forceReloadRewards(gameData.garden.level);
      queryClient.invalidateQueries({ queryKey: ['adRewards', gameData.garden.level] });
    }
  };

  // Fonction pour vider tout le cache des récompenses
  const clearRewardsCache = () => {
    AdRewardService.clearAllRewardsCache();
    queryClient.invalidateQueries({ queryKey: ['adRewards'] });
  };

  // Actualiser l'état des publicités avec gestion d'erreur améliorée
  const refreshAdState = useCallback(async (force = false) => {
    queryClient.invalidateQueries({ queryKey: ['adState', user?.id] });
  }, [user?.id, queryClient]);

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

  // Obtenir l'état des publicités avec fallback
  const adState = adStateQuery.data || {
    available: false,
    cooldownEnds: null,
    dailyCount: 0,
    maxDaily: 999,
    currentReward: null,
    timeUntilNext: 0
  };

  // Formater le message d'état des publicités  
  const getAdStatusMessage = useCallback((): string => {
    if (adState.dailyCount >= adState.maxDaily) {
      const timeFormatted = formatTimeUntilNext(adState.timeUntilNext);
      return `Limite quotidienne atteinte. Reset dans ${timeFormatted}`;
    }
    
    return `Pubs regardées: ${adState.dailyCount}/${adState.maxDaily}`;
  }, [adState, formatTimeUntilNext]);

  // Fonction pour regarder une pub avec validation serveur et diagnostic amélioré
  const watchAd = async (rewardType: string, rewardAmount: number) => {
    if (!user?.id || !mounted.current) return { success: false, error: 'Not authenticated' };

    try {
      if (mounted.current) {
        setLoading(true);
      }
      
      // Obtenir les informations de diagnostic avant d'essayer
      const debugInfo = AdMobService.getDebugInfo();
      console.log('AdMob: Attempting to watch ad with debug info:', debugInfo);
      
      const result = await AdMobService.showRewardedAd(user.id, rewardType, rewardAmount);
      
      if (result.success && mounted.current) {
        // Rafraîchir immédiatement avec un délai court pour permettre la propagation
        setTimeout(() => {
          if (mounted.current) {
            refreshAdState(true);
          }
        }, 500);
        return { success: true };
      } else {
        console.error('AdMob: Ad watch failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      const debugInfo = AdMobService.getDebugInfo();
      console.error('AdMob: Debug info on error:', debugInfo);
      return { success: false, error: (error as Error).message };
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  // Test de connectivité pour les diagnostics
  const testConnectivity = useCallback(async () => {
    if (!mounted.current) return false;
    
    try {
      if (mounted.current) {
        setLoading(true);
      }
      const result = await AdMobService.testConnectivity();
      console.log('AdMob: Connectivity test result:', result);
      return result;
    } catch (error) {
      console.error('AdMob: Connectivity test error:', error);
      return false;
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  return {
    // État des publicités (avec données React Query)
    adState,
    
    // Récompenses disponibles (dynamiques depuis Supabase)
    availableRewards: availableRewardsQuery.data || [],
    
    // États de chargement
    isLoadingAdState: adStateQuery.isLoading,
    isLoadingRewards: availableRewardsQuery.isLoading,
    loading,
    
    // Gestion d'erreurs
    isError: adStateQuery.isError || availableRewardsQuery.isError,
    error: adStateQuery.error || availableRewardsQuery.error,
    
    // Fonctions pour forcer le rafraîchissement
    refreshRewards,
    clearRewardsCache,
    refreshAdState,
    
    // Fonctions utilitaires
    formatTimeUntilNext,
    getAdStatusMessage,
    watchAd,
    testConnectivity,
    
    // Informations de debug
    debug: { 
      adMobState: AdMobService.getState(),
      diagnostics: diagnostics
    }
  };
};
