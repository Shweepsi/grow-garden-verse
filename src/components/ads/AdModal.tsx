
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdMobService } from '@/services/AdMobService';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameData } from '@/hooks/useGameData';
import { Loader2, Play, Coins, Gem, Zap, TrendingUp, Star } from 'lucide-react';
import { AdReward } from '@/types/ads';

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdModal({ open, onOpenChange }: AdModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { triggerCoinAnimation, triggerGemAnimation } = useAnimations();
  const { data: gameData, refetch: refetchGameData } = useGameData();
  const [selectedReward, setSelectedReward] = useState<AdReward | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [isWaitingForReward, setIsWaitingForReward] = useState(false);

  // Précharger la publicité à l'ouverture
  useEffect(() => {
    if (open && user?.id) {
      const preloadAd = async () => {
        await AdMobService.preloadAd(user.id, 'coins', 100);
      };
      preloadAd();
    }
  }, [open, user?.id]);

  // Récompenses disponibles avec montants fixes
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
      
      // Capturer les valeurs actuelles avant de regarder la pub
      const currentCoins = gameData?.garden?.coins || 0;
      const currentGems = gameData?.garden?.gems || 0;
      
      const result = await AdMobService.showRewardedAd(
        user.id, 
        selectedReward.type, 
        selectedReward.amount
      );

      if (!result.success) {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de regarder la publicité",
          variant: "destructive"
        });
        return;
      }

      // La pub a été regardée avec succès, attendre la validation SSV
      setIsWatching(false);
      setIsWaitingForReward(true);

      console.log('AdMob: Pub regardée, attente de la validation SSV...');

      // Surveiller les changements dans la base de données pendant 30 secondes maximum
      let attempts = 0;
      const maxAttempts = 30; // 30 secondes avec vérifications toutes les secondes
      
      const checkRewardReceived = async (): Promise<boolean> => {
        await refetchGameData();
        const updatedData = await refetchGameData();
        
        if (!updatedData.data?.garden) return false;

        const newCoins = updatedData.data.garden.coins || 0;
        const newGems = updatedData.data.garden.gems || 0;

        // Vérifier si la récompense a été accordée
        if (selectedReward.type === 'coins' && newCoins > currentCoins) {
          const gainedCoins = newCoins - currentCoins;
          triggerCoinAnimation(gainedCoins);
          return true;
        }
        
        if (selectedReward.type === 'gems' && newGems > currentGems) {
          const gainedGems = newGems - currentGems;
          triggerGemAnimation(gainedGems);
          return true;
        }
        
        // Pour les boosts, on considère que c'est accordé (pas de validation visuelle simple)
        if (['coin_boost', 'gem_boost', 'growth_boost'].includes(selectedReward.type)) {
          return true;
        }

        return false;
      };

      // Polling pour vérifier si la récompense a été accordée
      const pollForReward = async () => {
        while (attempts < maxAttempts) {
          attempts++;
          
          if (await checkRewardReceived()) {
            console.log('AdMob: Récompense reçue via SSV');
            toast({
              title: "Récompense obtenue !",
              description: selectedReward.description
            });
            
            onOpenChange(false);
            await AdCooldownService.updateAfterAdWatch(user.id);
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Timeout atteint
        console.log('AdMob: Timeout - récompense non reçue');
        toast({
          title: "Délai d'attente dépassé",
          description: "La récompense n'a pas été reçue. Réessayez dans quelques instants.",
          variant: "destructive"
        });
      };

      await pollForReward();

    } catch (error) {
      console.error('Error watching ad:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la visualisation de la publicité",
        variant: "destructive"
      });
    } finally {
      setIsWatching(false);
      setIsWaitingForReward(false);
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

  const isLoading = isWatching || isWaitingForReward;

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

          {isWaitingForReward && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              Attente de la validation de la récompense...
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isLoading}>
              Annuler
            </Button>
            <Button 
              onClick={handleWatchAd}
              disabled={!selectedReward || isLoading}
              className="flex-1"
            >
              {isWatching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : isWaitingForReward ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validation...
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
