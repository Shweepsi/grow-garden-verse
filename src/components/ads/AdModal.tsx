import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { AdMobService } from '@/services/AdMobService';
import { AdRewardService } from '@/services/AdRewardService';
import { AdProgressBar } from './AdProgressBar';
import { AdDiagnosticsPanel } from './AdDiagnosticsPanel';
import { AdRewardSelector } from './AdRewardSelector';
import { AdWatchButton } from './AdWatchButton';
import { AdValidationProgress } from './AdValidationProgress';
import { useAuth } from '@/hooks/useAuth';
import { AdCacheService } from '@/services/ads/AdCacheService';
import { useGameData } from '@/hooks/useGameData';
import { useAdRewards } from '@/hooks/useAdRewards';
import { useAdWatcher } from '@/hooks/useAdWatcher';
import { useAdDiagnostics } from '@/hooks/useAdDiagnostics';
import { useAdModalState } from '@/hooks/useAdModalState';
import { useToast } from '@/hooks/use-toast';

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdModal({ open, onOpenChange }: AdModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: gameData } = useGameData();
  const { adState } = useAdRewards();
  const mounted = useRef(true);
  
  // Hooks refactorisés
  const { watchState, watchAd } = useAdWatcher();
  const { showDiagnostics, toggleDiagnostics, runConnectivityTest, debugInfo } = useAdDiagnostics();
  const { 
    selectedReward, 
    availableRewards, 
    loadingRewards,
    setSelectedReward,
    setAvailableRewards,
    setLoadingRewards,
    reset
  } = useAdModalState();

  // Track component mount/unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Charger les récompenses disponibles - FIXED: removed hook functions from dependencies
  useEffect(() => {
    let cancelled = false;
    
    const loadRewards = async () => {
      if (!open || !user?.id || !mounted.current) return;

      try {
        setLoadingRewards(true);
        const playerLevel = gameData?.garden?.level || 1;
        const rewards = await AdRewardService.getAvailableRewards(playerLevel);
        
        // Check if component is still mounted and request wasn't cancelled
        if (!cancelled && mounted.current) {
          setAvailableRewards(rewards);
        }
      } catch (error) {
        console.error('Error loading rewards:', error);
        if (!cancelled && mounted.current) {
          toast({
            title: "Erreur",
            description: "Erreur lors du chargement des récompenses",
            variant: "destructive"
          });
        }
      } finally {
        if (!cancelled && mounted.current) {
          setLoadingRewards(false);
        }
      }
    };

    loadRewards();
    
    return () => {
      cancelled = true;
    };
  }, [open, user?.id, gameData?.garden?.level]); // FIXED: removed toast and setter functions

  // Précharger la publicité à l'ouverture - FIXED: removed debugInfo from dependencies
  useEffect(() => {
    if (!open || !user?.id || !mounted.current) return;
    
    let cancelled = false;
    
    const preloadAd = async () => {
      console.log('AdMob: Preloading ad');
      if (!cancelled && mounted.current) {
        await AdMobService.preloadAd(user.id, 'coins', 100);
      }
    };
    
    preloadAd();
    
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]); // FIXED: removed debugInfo dependency

  // Reset state when modal closes - FIXED: added cleanup
  useEffect(() => {
    if (!open && mounted.current) {
      // Use setTimeout to avoid state updates during render
      const timeoutId = setTimeout(() => {
        if (mounted.current) {
          reset();
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [open]); // FIXED: removed reset function from dependencies

  // FIXED: moved toast dependency inside the function to avoid re-renders
  const handleWatchAd = async () => {
    if (!selectedReward) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une récompense",
        variant: "destructive"
      });
      return;
    }

    if (adState.dailyCount >= adState.maxDaily) {
      toast({
        title: "Erreur",
        description: "Limite quotidienne de publicités atteinte",
        variant: "destructive"
      });
      return;
    }

    await watchAd(selectedReward, () => {
      if (mounted.current) {
        onOpenChange(false);
      }
    });
  };

  const isLoading = watchState.isWatching || watchState.isWaitingForReward;
  const dailyLimitReached = adState.dailyCount >= adState.maxDaily;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[90%] bg-white/95 backdrop-blur-xl border border-orange-200/50 shadow-2xl shadow-orange-500/20 animate-in fade-in-0 zoom-in-95 duration-300 p-4">
        <DialogHeader className="space-y-2 pb-3">
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                <Play className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-transparent">
                Publicités
              </h2>
            </div>
          </DialogTitle>
          
          <AdProgressBar
            dailyCount={adState.dailyCount}
            maxDaily={adState.maxDaily}
            onToggleDiagnostics={toggleDiagnostics}
          />
        </DialogHeader>

        <div className="space-y-3">
          {/* Panel de diagnostics */}
          {showDiagnostics && (
            <AdDiagnosticsPanel
              debugInfo={debugInfo}
              onTestConnectivity={runConnectivityTest}
            />
          )}

          {/* Sélecteur de récompenses */}
          <AdRewardSelector
            availableRewards={availableRewards}
            selectedReward={selectedReward}
            loadingRewards={loadingRewards}
            onSelectReward={setSelectedReward}
          />

          {/* Indicateur de progression de validation */}
          <AdValidationProgress watchState={watchState} />

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors duration-200" 
              disabled={isLoading}
            >
              Annuler
            </Button>
            
            <AdWatchButton
              watchState={watchState}
              selectedReward={!!selectedReward}
              dailyLimitReached={dailyLimitReached}
              onWatchAd={handleWatchAd}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}