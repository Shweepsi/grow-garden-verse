import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdMobService } from '@/services/AdMobService';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { AdRewardDistributionService } from '@/services/ads/AdRewardDistributionService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Coins, Gem, Zap, TrendingUp, Star } from 'lucide-react';
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

  // Précharger la publicité à l'ouverture
  useEffect(() => {
    if (open && user?.id) {
      const preloadAd = async () => {
        await AdMobService.preloadAd(user.id, 'coins', 100);
      };
      preloadAd();
    }
  }, [open, user?.id]);

  // Récompenses disponibles avec montants fixes (AdMob valide déjà la visualisation)
  const availableRewards: AdReward[] = [
    {
      type: 'coins',
      amount: 150,
      description: 'Gagnez 150 pièces',
      emoji: '🪙'
    },
    {
      type: 'gems',
      amount: 15,
      description: 'Gagnez 15 gemmes',
      emoji: '💎'
    },
    {
      type: 'coin_boost',
      amount: 2,
      description: 'Boost pièces x2 pendant 1h',
      emoji: '💰'
    },
    {
      type: 'gem_boost',
      amount: 1.5,
      description: 'Boost gemmes x1.5 pendant 30min',
      emoji: '✨'
    },
    {
      type: 'growth_boost',
      amount: 0.5,
      description: 'Croissance -50% pendant 30min',
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
        // Si la pub a été vue avec succès, distribuer la récompense côté client
        // (backup au cas où la validation serveur échoue)
        try {
          await AdRewardDistributionService.distributeReward(user.id, selectedReward);
          console.log('Récompense distribuée côté client:', selectedReward);
        } catch (rewardError) {
          console.error('Erreur distribution côté client:', rewardError);
        }
        
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
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                  Regarder
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}