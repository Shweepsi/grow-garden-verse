import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdRewardService } from '@/services/AdRewardService';
import { AdReward, AdState } from '@/types/ads';
import { useRefactoredGame } from './useRefactoredGame';
import { toast } from 'sonner';

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

  // Regarder une publicité
  const watchAd = useCallback(async (reward: AdReward): Promise<boolean> => {
    if (!user?.id || loading) return false;

    setLoading(true);
    try {
      const result = await AdRewardService.watchAd(user.id, reward);
      
      if (result.success) {
        toast.success(`Récompense reçue: ${reward.description} ${reward.emoji}`);
        await refreshAdState();
        return true;
      } else {
        toast.error(result.error || 'Erreur lors de la publicité');
        return false;
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      toast.error('Erreur lors de la publicité');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, loading, refreshAdState]);

  // Simuler le visionnage d'une publicité (pour le développement)
  const simulateAdWatch = useCallback(async (reward: AdReward): Promise<boolean> => {
    if (!user?.id) return false;

    // Simuler un délai de 3 secondes
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const success = await watchAd(reward);
    setLoading(false);
    
    return success;
  }, [user?.id, watchAd]);

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
    watchAd: simulateAdWatch, // Utiliser la simulation pour le développement
    refreshAdState,
    formatTimeUntilNext
  };
};