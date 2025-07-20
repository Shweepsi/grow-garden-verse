
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdRewardService } from '@/services/AdRewardService';
import { AdReward, AdState } from '@/types/ads';
import { useRefactoredGame } from './useRefactoredGame';
import { toast } from 'sonner';
import { AdMobService } from '@/services/AdMobService';
import { Capacitor } from '@capacitor/core';

export const useAdRewards = () => {
  const { user } = useAuth();
  const { gameState } = useRefactoredGame();
  const [adState, setAdState] = useState<AdState>({
    available: false,
    cooldownEnds: null,
    dailyCount: 0,
    maxDaily: 5,
    currentReward: null,
    timeUntilNext: 0
  });
  const [loading, setLoading] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<AdReward[]>([]);
  const [adMobState, setAdMobState] = useState(AdMobService.getState());

  // Initialiser AdMob et précharger une publicité
  useEffect(() => {
    const initializeAdMob = async () => {
      if (Capacitor.isNativePlatform()) {
        console.log('Initializing AdMob...');
        await AdMobService.initialize();
        await AdMobService.preloadAd();
        setAdMobState(AdMobService.getState());
      }
    };

    initializeAdMob();

    // Cleanup lors du démontage
    return () => {
      AdMobService.cleanup();
    };
  }, []);

  // Actualiser l'état AdMob périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      setAdMobState(AdMobService.getState());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Actualiser l'état des publicités
  const refreshAdState = useCallback(async () => {
    if (!user?.id) return;

    try {
      const state = await AdRewardService.getAdState(user.id);
      setAdState(state);
    } catch (error) {
      console.error('Error refreshing ad state:', error);
    }
  }, [user?.id]);

  // Calculer les récompenses disponibles
  const updateAvailableRewards = useCallback(() => {
    if (!gameState.garden) return;

    const rewards = AdRewardService.getAvailableRewards(
      gameState.garden.level || 1,
      gameState.garden.permanent_multiplier || 1
    );
    setAvailableRewards(rewards);
  }, [gameState.garden]);

  // Regarder une publicité avec mesure de durée précise
  const watchAd = useCallback(async (reward: AdReward): Promise<boolean> => {
    if (!user?.id || loading) return false;

    setLoading(true);
    let sessionId: string | undefined;

    try {
      console.log('Starting ad session with dynamic duration tracking...', { reward, adMobState });

      // Démarrer la session publicitaire
      const startResult = await AdRewardService.startAdSession(user.id, reward);
      
      if (!startResult.success || !startResult.sessionId) {
        toast.error(startResult.error || 'Impossible de démarrer la publicité');
        return false;
      }

      sessionId = startResult.sessionId;

      // Vérifier l'état AdMob
      const currentAdMobState = AdMobService.getState();
      console.log('AdMob state before showing ad:', currentAdMobState);

      if (!currentAdMobState.isInitialized) {
        await AdMobService.initialize();
      }

      // Montrer la publicité AdMob avec mesure de durée
      const adResult = await AdMobService.showRewardedAd();
      
      if (!adResult.success) {
        // Annuler la session si la pub a échoué
        if (sessionId) {
          await AdRewardService.cancelAdSession(user.id, sessionId);
        }
        toast.error(adResult.error || 'Publicité non disponible');
        console.error('Ad failed to show:', adResult.error);
        return false;
      }

      const actualDuration = adResult.actualDuration || 5000; // Fallback à 5 secondes

      console.log(`AdMob: Completed with duration - Actual: ${actualDuration}ms`);

      // Finaliser la session avec la durée réelle AdMob
      const completeResult = await AdRewardService.completeAdSession(
        user.id, 
        sessionId, 
        actualDuration,
        actualDuration // Plus besoin de durée estimée
      );
      
      if (completeResult.success) {
        const durationSeconds = Math.round(actualDuration / 1000);
        toast.success(`Récompense reçue: ${reward.description} ${reward.emoji} (${durationSeconds}s)`);
        await refreshAdState();
        
        // Précharger la prochaine publicité
        setTimeout(() => {
          AdMobService.preloadAd();
        }, 5000);
        
        return true;
      } else {
        toast.error(completeResult.error || 'Publicité non validée');
        return false;
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      
      // Annuler la session en cas d'erreur
      if (sessionId) {
        await AdRewardService.cancelAdSession(user.id, sessionId);
      }
      
      toast.error('Erreur lors de la publicité');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, loading, refreshAdState, adMobState]);

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

  // Actualiser les récompenses quand les stats changent
  useEffect(() => {
    updateAvailableRewards();
  }, [updateAvailableRewards]);

  // Formater le temps restant avec information sur le cooldown dynamique
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
    availableRewards,
    loading,
    watchAd,
    refreshAdState,
    formatTimeUntilNext,
    adMobState, // Exposer l'état AdMob pour debug
    debug: {
      adMobInitialized: adMobState.isInitialized,
      adLoaded: adMobState.isAdLoaded,
      adLoading: adMobState.isAdLoading,
      lastError: adMobState.lastError
    }
  };
};
