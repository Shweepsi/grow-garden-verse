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
import { AdReward } from '@/types/ads';

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdModal({ open, onOpenChange }: AdModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: gameData } = useGameData();
  const { adState, availableRewards, loadingRewards, refreshRewards } = useAdRewards();
  const mounted = useRef(true);
  
  // Hooks refactorisés
  const { watchState, watchAd } = useAdWatcher();
  const { showDiagnostics, toggleDiagnostics, runConnectivityTest, debugInfo } = useAdDiagnostics();
  const { 
    selectedReward, 
    setSelectedReward,
    reset
  } = useAdModalState();

  // Track component mount/unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Actualiser les récompenses quand la modal s'ouvre
  useEffect(() => {
    if (open && user?.id) {
      refreshRewards();
    }
  }, [open, user?.id, refreshRewards]);

  // Sélectionner automatiquement la première récompense si aucune n'est sélectionnée
  useEffect(() => {
    if (availableRewards.length > 0 && !selectedReward) {
      setSelectedReward(availableRewards[0]);
    }
  }, [availableRewards, selectedReward, setSelectedReward]);

  const handleSelectReward = (reward: AdReward) => {
    setSelectedReward(reward);
  };

  const handleWatchAd = async () => {
    if (!selectedReward || !user?.id) {
      toast({
        title: "Erreur", 
        description: "Veuillez sélectionner une récompense",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await watchAd(
        selectedReward.type, 
        selectedReward.amount,
        selectedReward.duration
      );

      if (result.success) {
        toast({
          title: "Félicitations!",
          description: `Vous avez reçu: ${selectedReward.description}`,
          variant: "default"
        });
        
        // Fermer la modal après succès
        setTimeout(() => {
          onOpenChange(false);
          reset();
        }, 1500);
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors du visionnage de la publicité",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🎁 Récompenses Publicitaires
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Affichage du statut */}
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 font-medium">
              {adState.available 
                ? `🎯 Publicités disponibles • Niveau ${gameData?.garden?.level || 1}`
                : "⏰ Limite quotidienne atteinte"
              }
            </div>
          </div>

          {/* Sélecteur de récompenses amélioré */}
          <AdRewardSelector
            availableRewards={availableRewards}
            selectedReward={selectedReward}
            loadingRewards={loadingRewards}
            onSelectReward={handleSelectReward}
          />

          {/* Bouton de visionnage ou état de chargement */}
          {watchState.watching ? (
            <div className="space-y-4">
              <AdProgressBar progress={watchState.progress} />
              <AdValidationProgress 
                validationState={watchState.validationState}
                progress={watchState.validationProgress}
              />
            </div>
          ) : (
            <AdWatchButton
              disabled={!selectedReward || !adState.available || watchState.watching}
              loading={watchState.loading}
              onClick={handleWatchAd}
              selectedReward={selectedReward}
            />
          )}

          {/* Panel de diagnostics pour le débogage */}
          {showDiagnostics && (
            <AdDiagnosticsPanel
              debugInfo={debugInfo}
              onRunConnectivityTest={runConnectivityTest}
              onToggleDiagnostics={toggleDiagnostics}
            />
          )}

          {/* Bouton de diagnostics (en mode développement) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDiagnostics}
                className="w-full text-xs"
              >
                {showDiagnostics ? 'Masquer' : 'Afficher'} les diagnostics
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}