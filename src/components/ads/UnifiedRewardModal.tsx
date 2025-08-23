import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Play, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedRewards } from '@/hooks/useUnifiedRewards';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAdWatcher } from '@/hooks/useAdWatcher';
import { useAdModalState } from '@/hooks/useAdModalState';
import { useToast } from '@/hooks/use-toast';
import { AdReward } from '@/types/ads';

interface UnifiedRewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifiedRewardModal({ open, onOpenChange }: UnifiedRewardModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = usePremiumStatus();
  const { 
    rewardState, 
    availableRewards, 
    loading, 
    claimReward,
    getStatusMessage,
    formatTimeUntilNext
  } = useUnifiedRewards();
  
  const { watchState, watchAd: watchAdStandard } = useAdWatcher();
  const {
    selectedReward,
    setSelectedReward,
    reset
  } = useAdModalState();
  
  const mounted = useRef(true);

  // Track component mount/unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!open && mounted.current) {
      const timeoutId = setTimeout(() => {
        if (mounted.current) {
          reset();
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [open, reset]);

  const handleRewardSelect = (reward: AdReward) => {
    setSelectedReward(reward);
  };

  const handleClaimReward = async () => {
    if (!selectedReward) return;

    const { isPremium } = usePremiumStatus();
    
    try {
      // Logique unifiée : même limite pour tous, seule différence = pub ou pas
      if (rewardState.dailyCount >= rewardState.maxDaily) {
        toast({ title: "Limite atteinte", description: "Limite quotidienne atteinte (5/5)", variant: "destructive" });
        return;
      }
      
      const result = await claimReward(selectedReward.type, selectedReward.amount);
      if (result.success) {
        onOpenChange(false);
        setSelectedReward(null);
        // Message différencié automatiquement dans claimReward
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({ title: "Erreur", description: "Erreur lors de la réclamation", variant: "destructive" });
    }
  };

  const isLoading = watchState.isWatching || watchState.isWaitingForReward || loading;
  const dailyLimitReached = rewardState.dailyCount >= rewardState.maxDaily;

  const getButtonContent = () => {
    if (watchState.isWatching) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Chargement...
        </>
      );
    }

    if (watchState.isWaitingForReward) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Validation...
        </>
      );
    }

    if (dailyLimitReached) {
      return (
        <>
          <AlertCircle className="w-4 h-4 mr-2" />
          Limite atteinte
        </>
      );
    }

    if (isPremium) {
      return (
        <>
          <Crown className="w-4 h-4 mr-2" />
          Réclamer
        </>
      );
    }

    return (
      <>
        <Play className="w-4 h-4 mr-2" />
        Regarder pub
      </>
    );
  };

  const getButtonClassName = () => {
    const baseClasses = "flex-1 transition-all duration-300 font-semibold shadow-lg transform-gpu";
    
    if (dailyLimitReached) {
      return `${baseClasses} bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 shadow-gray-400/30 text-white`;
    }
    
    if (isLoading) {
      return `${baseClasses} bg-gradient-to-r from-blue-400 to-blue-500 shadow-blue-400/30 text-white`;
    }

    if (isPremium) {
      return `${baseClasses} bg-gradient-to-r from-yellow-500 via-yellow-600 to-amber-600 hover:from-yellow-600 hover:via-yellow-700 hover:to-amber-700 shadow-yellow-500/40 text-white hover:shadow-yellow-500/50`;
    }
    
    return `${baseClasses} bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:via-orange-700 hover:to-amber-700 shadow-orange-500/40 text-white hover:shadow-orange-500/50`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] bg-white/95 backdrop-blur-xl border border-orange-200/50 shadow-2xl shadow-orange-500/20 animate-in fade-in-0 zoom-in-95 duration-300 overflow-hidden flex flex-col">
        <DialogHeader className="space-y-4 pb-6 shrink-0">
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {isPremium ? '👑 Récompenses Premium' : '📺 Récompenses Publicitaires'}
          </DialogTitle>
          
          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-600">Progression quotidienne</span>
              <span className="text-orange-600">{rewardState.dailyCount}/{rewardState.maxDaily}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-2.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min((rewardState.dailyCount / rewardState.maxDaily) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-center text-gray-500">
              {getStatusMessage()}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto overflow-x-hidden pr-1 flex-1">
          {/* Sélecteur de récompenses unifié */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Choisissez votre récompense :</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="grid gap-2">
                {availableRewards.map((reward, index) => (
                  <button
                    key={index}
                    onClick={() => handleRewardSelect(reward)}
                    className={`p-4 rounded-xl border-2 transition-colors duration-200 text-left ${
                      selectedReward?.type === reward.type
                        ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/20'
                        : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-25'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{reward.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{reward.description}</p>
                        {reward.duration && (
                          <p className="text-sm text-gray-500">Durée: {reward.duration} minutes</p>
                        )}
                      </div>
                      {selectedReward?.type === reward.type && (
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indicateur de progression pour les pubs */}
          {!isPremium && (watchState.isWatching || watchState.isWaitingForReward) && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {watchState.isWatching ? 'Chargement de la publicité...' : 'Validation en cours...'}
                </span>
              </div>
              {watchState.validationProgress && (
                <div className="space-y-1">
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${watchState.validationProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 text-center">
                    Progression: {watchState.validationProgress}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4 shrink-0 border-t border-gray-100 mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors duration-200" 
            disabled={isLoading}
          >
            Annuler
          </Button>
          
          <Button 
            onClick={handleClaimReward}
            disabled={!selectedReward || isLoading || dailyLimitReached}
            className={getButtonClassName()}
          >
            {getButtonContent()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}