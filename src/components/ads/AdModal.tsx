import React, { useEffect } from 'react';
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

  // Charger les récompenses disponibles
  useEffect(() => {
    const loadRewards = async () => {
      if (!open || !user?.id) return;

      try {
        setLoadingRewards(true);
        const playerLevel = gameData?.garden?.level || 1;
        const rewards = await AdRewardService.getAvailableRewards(playerLevel);
        setAvailableRewards(rewards);
      } catch (error) {
        console.error('Error loading rewards:', error);
        toast({
          title: "Erreur",
          description: "Erreur lors du chargement des récompenses",
          variant: "destructive"
        });
      } finally {
        setLoadingRewards(false);
      }
    };

    loadRewards();
  }, [open, user?.id, gameData?.garden?.level, toast, setLoadingRewards, setAvailableRewards]);

  // Précharger la publicité à l'ouverture
  useEffect(() => {
    if (open && user?.id) {
      const preloadAd = async () => {
        console.log('AdMob: Preloading ad with debug info:', debugInfo);
        await AdMobService.preloadAd(user.id, 'coins', 100);
      };
      preloadAd();
    }
  }, [open, user?.id, debugInfo]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

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
      onOpenChange(false);
    });
  };

  const isLoading = watchState.isWatching || watchState.isWaitingForReward;
  const dailyLimitReached = adState.dailyCount >= adState.maxDaily;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border border-orange-200/50 shadow-2xl shadow-orange-500/20 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader className="space-y-4 pb-6">
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Play className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-orange-400 to-amber-600 rounded-2xl opacity-30 blur-sm -z-10"></div>
              </div>
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-transparent">
              Récompenses Publicitaires
            </h2>
          </DialogTitle>
          
          <AdProgressBar
            dailyCount={adState.dailyCount}
            maxDaily={adState.maxDaily}
            onToggleDiagnostics={toggleDiagnostics}
          />
        </DialogHeader>

        <div className="space-y-6">
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
          <div className="flex gap-3 pt-4">
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