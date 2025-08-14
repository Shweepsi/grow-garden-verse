
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { AdState } from '@/types/ads';
import { AdMobService } from '@/services/AdMobService';
import { Capacitor } from '@capacitor/core';

export const useAdRewards = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const mounted = useRef(true);
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

  // Actualiser l'état des publicités avec gestion d'erreur améliorée - FIXED: stable function
  const refreshAdState = useCallback(async (force = false) => {
    if (!user?.id || !mounted.current) return;

    try {
      // Éviter les rechargements trop fréquents sauf si forcé
      if (!force && loading) return;
      
      if (mounted.current) {
        setLoading(true);
      }
      
      const cooldownInfo = await AdCooldownService.getCooldownInfo(user.id);
      
      if (!mounted.current) return;
      
      // Seulement mettre à jour si les données ont réellement changé
      setAdState(prev => {
        const hasChanged = 
          prev.available !== cooldownInfo.available ||
          prev.dailyCount !== cooldownInfo.dailyCount ||
          prev.maxDaily !== cooldownInfo.maxDaily ||
          prev.timeUntilNext !== cooldownInfo.timeUntilNext;
        
        if (!hasChanged) return prev;
        
        return {
          ...prev,
          available: cooldownInfo.available,
          cooldownEnds: cooldownInfo.cooldownEnds,
          timeUntilNext: cooldownInfo.timeUntilNext,
          dailyCount: cooldownInfo.dailyCount,
          maxDaily: cooldownInfo.maxDaily
        };
      });

      // Mettre à jour les diagnostics seulement si nécessaire
      if (Capacitor.isNativePlatform() && mounted.current) {
        const debugInfo = AdMobService.getDebugInfo();
        setDiagnostics(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(debugInfo)) {
            return debugInfo;
          }
          return prev;
        });
      }
      
    } catch (error) {
      console.error('Error refreshing ad state:', error);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [user?.id]); // FIXED: removed loading from dependencies to prevent loops

  // Timer pour actualiser le cooldown
  useEffect(() => {
    if (adState.timeUntilNext > 0) {
      const interval = setInterval(() => {
        if (mounted.current) {
          setAdState(prev => ({
            ...prev,
            timeUntilNext: Math.max(0, prev.timeUntilNext - 1)
          }));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [adState.timeUntilNext]);

  // Actualiser quand l'utilisateur change - FIXED: only when user changes
  useEffect(() => {
    if (user?.id) {
      refreshAdState();
    }
  }, [user?.id]); // FIXED: removed refreshAdState from dependencies

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
    
    if (adState.dailyCount >= adState.maxDaily) {
      const timeFormatted = formatTimeUntilNext(adState.timeUntilNext);
      return `Limite quotidienne atteinte. Reset dans ${timeFormatted}`;
    }
    
    return `Pubs regardées: ${adState.dailyCount}/${adState.maxDaily}`;
  }, [adState, formatTimeUntilNext, isPremium]);

  // Fonction pour regarder une pub avec logique premium
  const watchAd = async (rewardType: string, rewardAmount: number) => {
    if (!user?.id || !mounted.current) return { success: false, error: 'Not authenticated' };

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

    // Si l'utilisateur est premium, donner les récompenses automatiquement
    if (isPremium) {
      try {
        // Importer le service de distribution des récompenses
        const { AdRewardDistributionService } = await import('@/services/ads/AdRewardDistributionService');
        
        // Créer l'objet reward approprié
        const reward = {
          type: rewardType as any,
          amount: rewardAmount,
          description: `Récompense premium automatique`,
          emoji: '👑'
        };
        
        // Distribuer la récompense
        const result = await AdRewardDistributionService.distributeReward(user.id, reward);
        
        if (result.success) {
          // Incrémenter le compteur quotidien
          try {
            await AdCooldownService.updateAfterAdWatch(user.id);
          } catch (incErr) {
            console.warn('Incrément ad_count a échoué après attribution:', incErr);
          }

          // Rafraîchir l'état pour refléter les changements
          setTimeout(() => {
            if (mounted.current) {
              refreshAdState(true);
            }
          }, 500);
          
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
            refreshAdState(true); // Force le rafraîchissement après succès
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
