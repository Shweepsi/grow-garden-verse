
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

  // Initialize AdMob on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      AdMobService.initialize().catch(console.error);
    }
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

  // Regarder une publicité avec AdMob
  const watchAd = useCallback(async (reward: AdReward): Promise<boolean> => {
    if (!user?.id || loading) return false;

    setLoading(true);
    let sessionId: string | undefined;
    const startTime = Date.now();

    try {
      // Démarrer la session publicitaire
      const startResult = await AdRewardService.startAdSession(user.id, reward);
      
      if (!startResult.success || !startResult.sessionId) {
        toast.error(startResult.error || 'Impossible de démarrer la publicité');
        return false;
      }

      sessionId = startResult.sessionId;

      // Montrer la vraie publicité AdMob
      const adResult = await AdMobService.showRewardedAd();
      
      if (!adResult.success) {
        // Annuler la session si la pub a échoué
        if (sessionId) {
          await AdRewardService.cancelAdSession(user.id, sessionId);
        }
        toast.error(adResult.error || 'Publicité non disponible');
        return false;
      }

      const watchDuration = Date.now() - startTime;

      // Finaliser la session avec validation
      const completeResult = await AdRewardService.completeAdSession(user.id, sessionId, watchDuration);
      
      if (completeResult.success) {
        toast.success(`Récompense reçue: ${reward.description} ${reward.emoji}`);
        await refreshAdState();
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
  }, [user?.id, loading, refreshAdState]);

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
    availableRewards,
    loading,
    watchAd,
    refreshAdState,
    formatTimeUntilNext
  };
};
