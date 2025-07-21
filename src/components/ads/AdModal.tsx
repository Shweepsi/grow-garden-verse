import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Play, Loader2, Gift, Clock, Zap } from 'lucide-react';
import { AdReward } from '@/types/ads';
import { useAdRewards } from '@/hooks/useAdRewards';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import { AdMobService } from '@/services/AdMobService';

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdModal = ({ open, onOpenChange }: AdModalProps) => {
  const { user } = useAuth();
  const { adState, loading, refreshAdState, formatTimeUntilNext } = useAdRewards();
  const { refreshBoosts } = useActiveBoosts();
  const [selectedReward, setSelectedReward] = useState<AdReward | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [adDuration, setAdDuration] = useState<number | null>(null);

  // Récupérer la durée de la pub quand la modal s'ouvre
  useEffect(() => {
    if (open) {
      const duration = AdMobService.getAdDuration();
      setAdDuration(duration);
    }
  }, [open]);

  const getAdjustedReward = (baseAmount: number, duration: number | null): number => {
    if (!duration) return baseAmount;
    if (duration >= 60) return Math.floor(baseAmount * 2.0);
    if (duration >= 30) return Math.floor(baseAmount * 1.5);
    if (duration >= 15) return baseAmount;
    return Math.floor(baseAmount * 0.5);
  };

  const getAvailableRewards = (): AdReward[] => {
    const baseRewards = [
      { type: 'coins' as const, amount: 500, description: 'Pièces', emoji: '💰' },
      { type: 'gems' as const, amount: 10, description: 'Gemmes', emoji: '💎' },
      { type: 'coin_boost' as const, amount: 2, description: 'Boost Pièces ×2 (1h)', emoji: '🪙' },
      { type: 'gem_boost' as const, amount: 1.5, description: 'Boost Gemmes ×1.5 (30min)', emoji: '💎' },
      { type: 'growth_boost' as const, amount: 0.5, description: 'Croissance -50% (30min)', emoji: '⚡' }
    ];

    return baseRewards.map(reward => ({
      ...reward,
      amount: ['coins', 'gems'].includes(reward.type) 
        ? getAdjustedReward(reward.amount, adDuration)
        : reward.amount,
      description: ['coins', 'gems'].includes(reward.type)
        ? `${getAdjustedReward(reward.amount, adDuration)} ${reward.description}`
        : reward.description
    }));
  };

  const handleWatchAd = async (reward: AdReward) => {
    if (!user?.id || !adState.available) return;

    setIsWatching(true);
    try {
      // Utiliser AdMobService avec validation serveur
      const result = await AdMobService.showRewardedAd(user.id, reward.type, reward.amount);
      
      if (result.success && result.rewarded) {
        toast.success(`Récompense appliquée: ${reward.description} ${reward.emoji}`);
        await refreshAdState();
        await refreshBoosts();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Publicité non complétée');
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      toast.error('Erreur lors de la publicité');
    } finally {
      setIsWatching(false);
      setSelectedReward(null);
    }
  };

  const availableRewards = getAvailableRewards();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glassmorphic border-green-200/50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-green-600" />
              <DialogTitle className="text-green-800">Publicités Récompensées</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-sm">
            {adDuration ? (
              <>Regardez une publicité de {adDuration} secondes pour gagner des récompenses ajustées !</>
            ) : (
              <>Regardez une courte publicité pour gagner des récompenses !</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* État de disponibilité */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-green-200/30">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Cooldown: 2 heures
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {adDuration ? `${adDuration}s` : 'Chargement...'}
              </Badge>
              {!adState.available && adState.timeUntilNext > 0 && (
                <Badge variant="outline" className="text-xs">
                  {formatTimeUntilNext(adState.timeUntilNext)}
                </Badge>
              )}
            </div>
          </div>

          {/* Liste des récompenses */}
          {adState.available ? (
            <div className="grid gap-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Choisissez votre récompense :
              </h4>
              {availableRewards.map((reward, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all duration-200 border-2 ${
                    selectedReward === reward
                      ? 'border-green-400 bg-green-50/50'
                      : 'border-green-200/30 hover:border-green-300/60'
                  }`}
                  onClick={() => setSelectedReward(reward)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white font-bold">
                        {reward.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{reward.description}</div>
                        {adDuration && ['coins', 'gems'].includes(reward.type) && (
                          <div className="text-xs text-muted-foreground">
                            Ajusté selon la durée ({adDuration}s)
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-medium text-foreground mb-2">Publicité non disponible</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Prochaine publicité dans {formatTimeUntilNext(adState.timeUntilNext)}
              </p>
              <Progress 
                value={((7200 - adState.timeUntilNext) / 7200) * 100} 
                className="w-full h-2"
              />
            </div>
          )}

          {/* Boutons d'action */}
          {adState.available && (
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isWatching}
              >
                Annuler
              </Button>
              <Button
                onClick={() => selectedReward && handleWatchAd(selectedReward)}
                disabled={!selectedReward || isWatching || loading || !adDuration}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
              >
                {isWatching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicité en cours...
                  </>
                ) : !adDuration ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Regarder ({adDuration}s)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
