
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
    maxDaily: 5, // Limite quotidienne fixée
    currentReward: null,
    timeUntilNext: 0
  });
  const [loading, setLoading] = useState(false);

  // Initialiser AdMob
  useEffect(() => {
    const initializeAdMob = async () => {
      if (Capacitor.isNativePlatform()) {
        console.log('Initializing AdMob...');
        await AdMobService.initialize();
        // Ne précharge plus automatiquement - sera fait quand nécessaire
      }
    };

    initializeAdMob();

    return () => {
      AdMobService.cleanup();
    };
  }, []);

  // Actualiser l'état des publicités
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
    
    // Si c'est plus de 12 heures, c'est probablement le reset quotidien
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
      return `Limite quotidienne atteinte (${adState.dailyCount}/${adState.maxDaily})`;
    }
    
    if (!adState.available && adState.timeUntilNext > 0) {
      const timeFormatted = formatTimeUntilNext(adState.timeUntilNext);
      return `Prochaine pub dans ${timeFormatted}`;
    }
    
    return `Pubs regardées: ${adState.dailyCount}/${adState.maxDaily}`;
  }, [adState, formatTimeUntilNext]);

  // Fonction pour regarder une pub avec validation serveur
  const watchAd = async (rewardType: string, rewardAmount: number) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      setLoading(true);
      const result = await AdMobService.showRewardedAd(user.id, rewardType, rewardAmount);
      
      if (result.success) {
        await refreshAdState();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      return { success: false, error: (error as Error).message };
    } finally {
      setLoading(false);
    }
  };

  return {
    adState,
    loading,
    refreshAdState,
    formatTimeUntilNext,
    getAdStatusMessage,
    watchAd,
    debug: { adMobState: AdMobService.getState() },
    availableRewards: [] // Géré maintenant dans AdModal
  };
};
