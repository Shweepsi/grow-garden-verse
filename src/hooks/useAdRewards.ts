
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
    maxDaily: 999, // Plus de limite quotidienne
    currentReward: null,
    timeUntilNext: 0
  });
  const [loading, setLoading] = useState(false);

  // Initialiser AdMob et précharger une publicité
  useEffect(() => {
    const initializeAdMob = async () => {
      if (Capacitor.isNativePlatform()) {
        console.log('Initializing AdMob...');
        await AdMobService.initialize();
        await AdMobService.preloadAd();
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
        timeUntilNext: cooldownInfo.timeUntilNext
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
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  return {
    adState,
    loading,
    refreshAdState,
    formatTimeUntilNext,
    availableRewards: [] // Géré maintenant dans AdModal
  };
};
