import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdMobService } from '@/services/AdMobService';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Clock, Coins, Gem, Zap, TrendingUp, Star } from 'lucide-react';
import { AdReward } from '@/types/ads';

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdModal({ open, onOpenChange }: AdModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<AdReward | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [adDuration, setAdDuration] = useState<number | null>(null);

  // Charger la durée de la pub dès l'ouverture
  useEffect(() => {
    if (open) {
      const loadAdDuration = async () => {
        await AdMobService.loadRewardedAd();
        const duration = AdMobService.getAdDuration();
        setAdDuration(duration);
      };
      loadAdDuration();
    }
  }, [open]);

  // Calculer les récompenses ajustées selon la durée
  const calculateAdjustedReward = (baseAmount: number): number => {
    if (!adDuration) return baseAmount;
    
    if (adDuration >= 60) return Math.floor(baseAmount * 2.0); // 60s+ = x2
    if (adDuration >= 30) return Math.floor(baseAmount * 1.5); // 30s+ = x1.5
    if (adDuration >= 15) return baseAmount; // 15s+ = normal
    return Math.floor(baseAmount * 0.5); // <15s = réduit
  };

  // Récompenses disponibles avec montants ajustés
  const availableRewards: AdReward[] = [
    {
      type: 'coins',
      amount: calculateAdjustedReward(100),
      description: `Gagnez ${calculateAdjustedReward(100)} pièces`,
      emoji: '🪙'
    },
    {
      type: 'gems',
      amount: calculateAdjustedReward(10),
      description: `Gagnez ${calculateAdjustedReward(10)} gemmes`,
      emoji: '💎'
    },
    {
      type: 'coin_boost',
      amount: calculateAdjustedReward(2),
      description: `Boost pièces x2 pendant 1h`,
      emoji: '💰'
    },
    {
      type: 'gem_boost',
      amount: calculateAdjustedReward(1.5),
      description: `Boost gemmes x1.5 pendant 30min`,
      emoji: '✨'
    },
    {
      type: 'growth_boost',
      amount: calculateAdjustedReward(0.5),
      description: `Croissance -50% pendant 30min`,
      emoji: '🌱'
    }
  ];

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
      setIsWatching(true);
      
      const result = await AdMobService.showRewardedAd(
        user.id, 
        selectedReward.type, 
        selectedReward.amount
      );

      if (result.success) {
        toast({
          title: "Récompense obtenue !",
          description: selectedReward.description
        });
        
        // Fermer la modal et actualiser les cooldowns
        onOpenChange(false);
        await AdCooldownService.updateAfterAdWatch(user.id);
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de regarder la publicité",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error watching ad:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsWatching(false);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'coins': return <Coins className="w-6 h-6 text-yellow-500" />;
      case 'gems': return <Gem className="w-6 h-6 text-purple-500" />;
      case 'coin_boost': return <TrendingUp className="w-6 h-6 text-green-500" />;
      case 'gem_boost': return <Star className="w-6 h-6 text-blue-500" />;
      case 'growth_boost': return <Zap className="w-6 h-6 text-orange-500" />;
      default: return <Coins className="w-6 h-6" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Regarder une publicité
            {adDuration && (
              <span className="text-sm text-muted-foreground">
                ({adDuration}s)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {adDuration && (
            <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                Publicité de {adDuration} secondes - Récompenses ajustées
              </span>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-medium">Choisissez votre récompense :</h3>
            
            <div className="grid gap-2">
              {availableRewards.map((reward) => (
                <Card 
                  key={reward.type}
                  className={`cursor-pointer transition-colors ${
                    selectedReward?.type === reward.type 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedReward(reward)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {getRewardIcon(reward.type)}
                    <div className="flex-1">
                      <div className="font-medium">{reward.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {reward.emoji} {reward.type}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleWatchAd}
              disabled={!selectedReward || isWatching}
              className="flex-1"
            >
              {isWatching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Regarder{adDuration ? ` (${adDuration}s)` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}