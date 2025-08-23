import { useState, useCallback } from 'react';
import { AdReward } from '@/types/ads';
import { AdMobService } from '@/services/AdMobService';
import { AdPollingService } from '@/services/ads/AdPollingService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameData } from '@/hooks/useGameData';
import { useUnifiedRewards } from '@/hooks/useUnifiedRewards';

export interface AdWatchState {
  isWatching: boolean;
  isWaitingForReward: boolean;
  validationProgress: number;
}

export function useAdWatcher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { triggerCoinAnimation, triggerGemAnimation } = useAnimations();
  const { data: gameData, refetch: refetchGameData } = useGameData();
  // Use unified rewards system
  const { refreshState } = useUnifiedRewards();

  const [watchState, setWatchState] = useState<AdWatchState>({
    isWatching: false,
    isWaitingForReward: false,
    validationProgress: 0
  });

  const watchAd = useCallback(async (
    selectedReward: AdReward,
    onSuccess?: () => void
  ): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Erreur",
        description: "Utilisateur non connecté",
        variant: "destructive"
      });
      return;
    }

    try {
      setWatchState(prev => ({ ...prev, isWatching: true }));
      
      // Connectivity is now handled by unified system
      
      // Capturer les valeurs actuelles
      const currentCoins = gameData?.garden?.coins || 0;
      const currentGems = gameData?.garden?.gems || 0;
      
      console.log('AdMob: Starting ad watch with production settings');
      
      const result = await AdMobService.showRewardedAd(
        user.id, 
        selectedReward.type, 
        selectedReward.amount
      );

      if (!result.success) {
        console.error('AdMob: Ad watch failed:', result.error);
        toast({
          title: "Erreur de publicité",
          description: result.error || "Impossible de regarder la publicité",
          variant: "destructive"
        });
        return;
      }

      // Démarrer la phase d'attente de validation
      setWatchState(prev => ({ 
        ...prev, 
        isWatching: false, 
        isWaitingForReward: true,
        validationProgress: 0
      }));

      console.log('AdMob: Production ad watched, waiting for SSV validation...');

      // Polling pour la validation
      const pollingResult = await AdPollingService.pollForReward(
        selectedReward,
        currentCoins,
        currentGems,
        refetchGameData,
        {
          onProgress: (attempt, maxAttempts) => {
            const progress = (attempt / maxAttempts) * 100;
            setWatchState(prev => ({ ...prev, validationProgress: progress }));
          }
        }
      );

      if (pollingResult.success) {
        console.log('AdMob: Récompense reçue via SSV');
        
        // Déclencher l'animation appropriée
        if (selectedReward.type === 'coins' && pollingResult.gainedAmount) {
          triggerCoinAnimation(pollingResult.gainedAmount);
        } else if (selectedReward.type === 'gems' && pollingResult.gainedAmount) {
          triggerGemAnimation(pollingResult.gainedAmount);
        }
        
        toast({
          title: "Récompense obtenue !",
          description: selectedReward.description
        });
        
        // Refresh reward state to reflect updated daily count (already incremented server-side)
        refreshState?.();
        onSuccess?.();
      } else {
        console.log('AdMob: Timeout - récompense non reçue via SSV');
        toast({
          title: "Délai d'attente dépassé",
          description: "La récompense n'a pas été reçue. La validation AdMob peut prendre quelques minutes.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error watching ad:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la visualisation de la publicité",
        variant: "destructive"
      });
    } finally {
      setWatchState({
        isWatching: false,
        isWaitingForReward: false,
        validationProgress: 0
      });
    }
  }, [user?.id, gameData, refetchGameData, triggerCoinAnimation, triggerGemAnimation, toast, refreshState]);

  return {
    watchState,
    watchAd
  };
}