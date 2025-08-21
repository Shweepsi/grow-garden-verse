import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useGameData } from '@/hooks/useGameData';
import { toast } from 'sonner';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { AdRewardService } from '@/services/AdRewardService';
import { PremiumRewardService } from '@/services/ads/PremiumRewardService';
import { AdState } from '@/types/ads';
import { AdMobService } from '@/services/AdMobService';
import { Capacitor } from '@capacitor/core';
import { gameDataEmitter } from '@/hooks/useGameDataNotifier';

// Persistance localStorage pour l'état des ads
const AD_STATE_STORAGE_KEY = 'adState';

const getStoredAdState = (): Partial<AdState> | null => {
  try {
    const stored = localStorage.getItem(AD_STATE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setStoredAdState = (state: AdState): void => {
  try {
    localStorage.setItem(AD_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
};

export const useAdRewards = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { data: gameData } = useGameData();
  const queryClient = useQueryClient();
  const mounted = useRef(true);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // État initial conservateur pour éviter le flash
  const getInitialAdState = (): AdState => {
    const stored = getStoredAdState();
    if (stored) {
      return {
        available: false, // Conservateur: toujours commencer par false
        cooldownEnds: stored.cooldownEnds || null,
        dailyCount: stored.dailyCount || 5, // Conservateur: supposer limite atteinte
        maxDaily: stored.maxDaily || 5,
        currentReward: null,
        timeUntilNext: stored.timeUntilNext || 3600 // Conservateur: 1h de cooldown
      };
    }
    
    return {
      available: false,
      cooldownEnds: null,
      dailyCount: 5, // Conservateur: supposer limite atteinte
      maxDaily: 5,
      currentReward: null,
      timeUntilNext: 3600 // Conservateur: 1h de cooldown
    };
  };

  // Query React Query pour l'état des ads avec persistance
  const { 
    data: adState = getInitialAdState(), 
    isLoading: loading,
    refetch,
    isInitialLoading
  } = useQuery({
    queryKey: ['adState', user?.id],
    queryFn: async (): Promise<AdState> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const cooldownInfo = await AdCooldownService.getCooldownInfo(user.id);
      
      const newState: AdState = {
        available: cooldownInfo.available,
        cooldownEnds: cooldownInfo.cooldownEnds,
        timeUntilNext: cooldownInfo.timeUntilNext,
        dailyCount: cooldownInfo.dailyCount,
        maxDaily: cooldownInfo.maxDaily,
        currentReward: null
      };
      
      // Persister dans localStorage
      setStoredAdState(newState);
      
      return newState;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30s de cache pour éviter trop de requêtes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (query) => {
      // Polling plus fréquent si en cooldown
      const data = query.state.data;
      if (data?.timeUntilNext && data.timeUntilNext > 0) {
        return Math.min(data.timeUntilNext * 1000, 60000); // Max 1 minute
      }
      return 5 * 60 * 1000; // 5 minutes sinon
    },
    initialData: getInitialAdState,
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Manual refresh function
  const refreshAdState = useCallback(async () => {
    if (!user?.id || !mounted.current) return;
    await refetch();
  }, [user?.id, refetch]);

  // Track component mount/unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Initialiser AdMob avec diagnostics améliorés (désactivé pour Premium)
  useEffect(() => {
    const initializeAdMob = async () => {
      if (isPremium) return;
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
  }, [isPremium]);

  // Timer pour actualiser le cooldown
  useEffect(() => {
    if (!adState?.timeUntilNext || adState.timeUntilNext <= 0) return;

    const interval = setInterval(() => {
      if (mounted.current) {
        queryClient.setQueryData(['adState', user?.id], (prev: AdState | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            timeUntilNext: Math.max(0, prev.timeUntilNext - 1)
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [adState?.timeUntilNext, queryClient, user?.id]);

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

  // Formater le message d'état des publicités avec logique premium
  const getAdStatusMessage = useCallback((): string => {
    if (isPremium) {
      return "🚫 Premium: Publicités désactivées - Récompenses automatiques";
    }
    
    if (!adState) return "Chargement...";
    
    if (adState.dailyCount >= adState.maxDaily) {
      const timeFormatted = formatTimeUntilNext(adState.timeUntilNext);
      return `Limite quotidienne atteinte. Reset dans ${timeFormatted}`;
    }
    
    return `Pubs regardées: ${adState.dailyCount}/${adState.maxDaily}`;
  }, [adState, formatTimeUntilNext, isPremium]);

  // Fonction pour réclamer une récompense avec logique premium améliorée
  const claimAdReward = async (rewardType: string, rewardAmount: number) => {
    if (!user?.id || !mounted.current || !adState) return { success: false, error: 'Not authenticated' };

    // Vérifier le cooldown même pour les premiums
    if (!adState.available) {
      const timeFormatted = formatTimeUntilNext(adState.timeUntilNext);
      const errorMessage = adState.dailyCount >= adState.maxDaily
        ? `Limite quotidienne atteinte. Reset dans ${timeFormatted}.`
        : `Cooldown actif. Prochaine récompense dans ${timeFormatted}.`;
      return {
        success: false,
        error: errorMessage
      };
    }

    // Si l'utilisateur est premium, utiliser le service sécurisé
    if (isPremium) {
      try {
        // Vérifier les limites de sécurité premium
        const limitsCheck = await PremiumRewardService.checkPremiumRewardLimits(user.id);
        if (!limitsCheck.allowed) {
          console.warn('Premium reward limits exceeded:', limitsCheck.error);
          toast.error(limitsCheck.error || 'Limite de récompenses premium atteinte');
          return { success: false, error: limitsCheck.error || 'Limite de récompenses premium atteinte' };
        }

        // Récupérer la configuration complète de la base de données pour obtenir la durée
        const playerLevel = gameData?.garden?.level || 1;
        const availableRewards = await AdRewardService.getAvailableRewards(playerLevel);
        const configuredReward = availableRewards.find(r => r.type === rewardType);
        
        console.log(`Premium: Creating reward for type ${rewardType} at level ${playerLevel}, found config:`, configuredReward);
        
        // Créer l'objet reward avec la durée de la configuration
        const reward = {
          type: rewardType as any,
          amount: rewardAmount,
          duration: configuredReward?.duration,
          description: `Récompense premium automatique`,
          emoji: '👑'
        };
        
        console.log('Premium: Final reward object:', reward);
        
        // Utiliser le service premium sécurisé qui inclut validation et audit
        const result = await PremiumRewardService.distributePremiumReward(user.id, reward);
        
        if (result.success) {
          // Incrémenter le compteur quotidien
          try {
            await AdCooldownService.updateAfterAdWatch(user.id);
          } catch (incErr) {
            console.warn('Incrément ad_count a échoué après attribution:', incErr);
          }

          // PHASE 1: Rafraîchissement immédiat sans délai + invalidation de cache
          refreshAdState();
          queryClient.invalidateQueries({ queryKey: ['gameData'] });

          // PHASE 1: Notifier avec payload pour optimistic updates
          gameDataEmitter.emit('reward-claimed', { type: rewardType, amount: rewardAmount });
          gameDataEmitter.emit(`${rewardType}-claimed`, { amount: rewardAmount });
          
          return { 
            success: true, 
            message: "Récompense premium automatique accordée !" 
          };
        } else {
          return { 
            success: false, 
            error: result.error || "Erreur lors de l'attribution de la récompense premium" 
          };
        }
      } catch (error) {
        console.error('Erreur lors de la distribution de la récompense premium:', error);
        return { 
          success: false, 
          error: "Erreur lors de l'attribution de la récompense premium" 
        };
      }
    }

    try {
      // Obtenir les informations de diagnostic avant d'essayer
      const debugInfo = AdMobService.getDebugInfo();
      console.log('AdMob: Attempting to watch ad with debug info:', debugInfo);
      
      const result = await AdMobService.showRewardedAd(user.id, rewardType, rewardAmount);
      
      if (result.success && mounted.current) {
        // PHASE 1: Rafraîchissement immédiat sans délai + invalidation de cache
        refreshAdState();
        queryClient.invalidateQueries({ queryKey: ['gameData'] });

        // PHASE 1: Notifier avec payload pour optimistic updates
        gameDataEmitter.emit('reward-claimed', { type: rewardType, amount: rewardAmount });
        gameDataEmitter.emit(`${rewardType}-claimed`, { amount: rewardAmount });
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
    }
  };

  // Test de connectivité pour les diagnostics
  const testConnectivity = useCallback(async () => {
    if (!mounted.current) return false;
    
    try {
      const result = await AdMobService.testConnectivity();
      console.log('AdMob: Connectivity test result:', result);
      return result;
    } catch (error) {
      console.error('AdMob: Connectivity test error:', error);
      return false;
    }
  }, []);

  return {
    adState,
    loading: loading || isInitialLoading,
    refreshAdState,
    formatTimeUntilNext,
    getAdStatusMessage,
    watchAd: claimAdReward, // Nom plus clair pour la fonction
    testConnectivity,
    debug: { 
      adMobState: AdMobService.getState(),
      diagnostics: diagnostics
    },
    availableRewards: []
  };
};