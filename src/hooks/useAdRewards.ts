
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { AdState } from '@/types/ads';
import { AdMobService } from '@/services/AdMobService';
import { Capacitor } from '@capacitor/core';

export const useAdRewards = () => {
  const { user } = useAuth();
  const [adState, setAdState] = useState<AdState>({
    available: false,
    cooldownEnds: null,
    dailyCount: 0,
    maxDaily: 5,
    currentReward: null,
    timeUntilNext: 0
  });
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Initialiser AdMob avec diagnostics améliorés
  useEffect(() => {
    const initializeAdMob = async () => {
      if (Capacitor.isNativePlatform()) {
        console.log('AdMob: Initializing for production...');
        const initialized = await AdMobService.initialize();
        
        // Récupérer les informations de diagnostic
        const debugInfo = AdMobService.getDebugInfo();
        setDiagnostics(debugInfo);
        
        console.log('AdMob: Initialization result:', initialized);
        console.log('AdMob: Debug info:', debugInfo);
      }
    };

    initializeAdMob();

    return () => {
      AdMobService.cleanup();
    };
  }, []);

  // Actualiser l'état des publicités avec gestion d'erreur améliorée
  const refreshAdState = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const cooldownInfo = await AdCooldownService.getCooldownInfo(user.id);
      
      setAdState(prev => ({
        ...prev,
        available: cooldownInfo.available,
        cooldownEnds: cooldownInfo.cooldownEnds,
        timeUntilNext: cooldownInfo.timeUntilNext,
        dailyCount: cooldownInfo.dailyCount,
        maxDaily: cooldownInfo.maxDaily
      }));

      // Mettre à jour les diagnostics
      const debugInfo = AdMobService.getDebugInfo();
      setDiagnostics(debugInfo);
      
    } catch (error) {
      console.error('Error refreshing ad state:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Timer pour actualiser le cooldown
  useEffect(() => {
    if (adState.timeUntilNext > 0) {
      const interval = setInterval(() => {
        setAdState(prev => ({
          ...prev,
          timeUntilNext: Math.max(0, prev.timeUntilNext - 1)
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [adState.timeUntilNext]);

  // Actualiser quand l'utilisateur change
  useEffect(() => {
    refreshAdState();
  }, [refreshAdState]);

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
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      setLoading(true);
      
      // Obtenir les informations de diagnostic avant d'essayer
      const debugInfo = AdMobService.getDebugInfo();
      console.log('AdMob: Attempting to watch ad with debug info:', debugInfo);
      
      const result = await AdMobService.showRewardedAd(user.id, rewardType, rewardAmount);
      
      if (result.success) {
        await refreshAdState();
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
      setLoading(false);
    }
  };

  // Test de connectivité pour les diagnostics
  const testConnectivity = useCallback(async () => {
    try {
      setLoading(true);
      const result = await AdMobService.testConnectivity();
      console.log('AdMob: Connectivity test result:', result);
      return result;
    } catch (error) {
      console.error('AdMob: Connectivity test error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    adState,
    loading,
    refreshAdState,
    formatTimeUntilNext,
    getAdStatusMessage,
    watchAd,
    testConnectivity,
    debug: { 
      adMobState: AdMobService.getState(),
      diagnostics: diagnostics
    },
    availableRewards: []
  };
};
