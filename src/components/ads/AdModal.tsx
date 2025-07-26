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
      <DialogContent className="max-w-md glassmorphism border-white/20 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
              <Play className="w-3 h-3 text-white" />
            </div>
            Récompenses Publicitaires
          </DialogTitle>
          
          <AdProgressBar
            dailyCount={adState.dailyCount}
            maxDaily={adState.maxDaily}
            onToggleDiagnostics={toggleDiagnostics}
          />
        </DialogHeader>

        <div className="space-y-4">
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
          <div className="flex gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1 premium-card border-white/30 hover:bg-white/10 text-white font-medium" 
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