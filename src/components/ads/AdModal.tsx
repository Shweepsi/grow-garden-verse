import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdMobService } from '@/services/AdMobService';
import { AdRewardService } from '@/services/AdRewardService';
import { AdCooldownService } from '@/services/ads/AdCooldownService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameData } from '@/hooks/useGameData';
import { useAdRewards } from '@/hooks/useAdRewards';
import { Loader2, Play, Coins, Gem, Zap, TrendingUp, Star, AlertCircle } from 'lucide-react';
import { AdReward } from '@/types/ads';
import { supabase } from '@/integrations/supabase/client';

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdModal({ open, onOpenChange }: AdModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { triggerCoinAnimation, triggerGemAnimation } = useAnimations();
  const { data: gameData, refetch: refetchGameData } = useGameData();
  const { adState, testConnectivity, debug } = useAdRewards();
  const [selectedReward, setSelectedReward] = useState<AdReward | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [isWaitingForReward, setIsWaitingForReward] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<AdReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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
  }, [open, user?.id, gameData?.garden?.level, toast]);

  // Précharger la publicité à l'ouverture avec diagnostic
  useEffect(() => {
    if (open && user?.id) {
      const preloadAd = async () => {
        console.log('AdMob: Preloading ad with debug info:', debug);
        await AdMobService.preloadAd(user.id, 'coins', 100);
      };
      preloadAd();
    }
  }, [open, user?.id, debug]);

  const handleWatchAd = async () => {
    if (!selectedReward || !user?.id || adState.dailyCount >= adState.maxDaily) {
      toast({
        title: "Erreur",
        description: adState.dailyCount >= adState.maxDaily 
          ? "Limite quotidienne de 5 publicités atteinte" 
          : "Veuillez sélectionner une récompense",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsWatching(true);
      
      // Test de connectivité avant d'essayer
      const isConnected = await testConnectivity();
      if (!isConnected) {
        toast({
          title: "Problème de connexion",
          description: "Vérifiez votre connexion internet et réessayez",
          variant: "destructive"
        });
        return;
      }
      
      // Capturer les valeurs actuelles avant de regarder la pub
      const currentCoins = gameData?.garden?.coins || 0;
      const currentGems = gameData?.garden?.gems || 0;
      
      console.log('AdMob: Starting ad watch with production settings');
      
      const result = await AdMobService.showRewardedAd(
        user.id, 
        selectedReward.type, 
        selectedReward.amount
      );

      if (!result.success) {
        console.error('AdMob: Ad watch failed:', result.error);
        toast({
          title: "Erreur de publicité",
          description: result.error || "Impossible de regarder la publicité",
          variant: "destructive"
        });
        return;
      }

      // La pub a été regardée avec succès, attendre la validation SSV
      setIsWatching(false);
      setIsWaitingForReward(true);

      console.log('AdMob: Production ad watched, waiting for SSV validation...');

      // Surveiller les changements dans la base de données pendant 30 secondes maximum
      let attempts = 0;
      const maxAttempts = 30; // 30 secondes avec vérifications toutes les secondes
      
      const checkRewardReceived = async (): Promise<boolean> => {
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
        
        // Timeout atteint - seul AdMob SSV peut accorder la récompense
        console.log('AdMob: Timeout - récompense non reçue via SSV');
        toast({
          title: "Délai d'attente dépassé",
          description: "La récompense n'a pas été reçue. La validation AdMob peut prendre quelques minutes.",
          variant: "destructive"
        });
      };

      await pollForReward();

    } catch (error) {
      console.error('Error watching ad:', error);
      console.error('AdMob: Debug info on error:', debug);
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

  const handleTestConnectivity = async () => {
    const result = await testConnectivity();
    toast({
      title: result ? "Connexion OK" : "Connexion échouée",
      description: result 
        ? "La connexion aux serveurs publicitaires fonctionne" 
        : "Impossible de se connecter aux serveurs publicitaires",
      variant: result ? "default" : "destructive"
    });
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'coins': return <Coins className="w-6 h-6 text-amber-500" />;
      case 'gems': return <Gem className="w-6 h-6 text-purple-500" />;
      case 'coin_boost': return <TrendingUp className="w-6 h-6 text-emerald-500" />;
      case 'gem_boost': return <Star className="w-6 h-6 text-blue-500" />;
      case 'growth_boost': return <Zap className="w-6 h-6 text-orange-500" />;
      default: return <Coins className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const isLoading = isWatching || isWaitingForReward;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md glassmorphism border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Play className="w-5 h-5" />
              🎁 Récompenses Publicitaires
            </DialogTitle>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-white/80 text-sm">
                  {adState.dailyCount}/{adState.maxDaily} publicités
                </span>
                <div className="w-16 bg-white/20 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
                    style={{ width: `${(adState.dailyCount / adState.maxDaily) * 100}%` }}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="opacity-50 hover:opacity-100 text-white hover:bg-white/10"
              >
                🔧
              </Button>
            </div>
          </DialogHeader>

        <div className="space-y-4">
          {/* Diagnostics cachés par défaut */}
          {showDiagnostics && (
            <div className="glassmorphism p-3 rounded-lg text-xs border border-white/20">
              <div className="font-medium mb-2 text-white">Diagnostics AdMob:</div>
              <pre className="whitespace-pre-wrap overflow-x-auto text-white/80 bg-white/10 p-2 rounded">
                {JSON.stringify(debug, null, 2)}
              </pre>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnectivity}
                className="mt-2 glassmorphism border-white/20 text-white hover:bg-white/10"
              >
                Tester la connectivité
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-medium text-white">Choisissez votre récompense :</h3>
            
            {loadingRewards ? (
              <div className="text-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-white" />
                <div className="text-sm text-white/70">Chargement des récompenses...</div>
              </div>
            ) : (
              <div className="grid gap-2">
                {availableRewards.map((reward) => (
                  <Card 
                    key={reward.type}
                    className={`cursor-pointer transition-all duration-200 glassmorphism border-white/20 ${
                      selectedReward?.type === reward.type 
                        ? 'ring-2 ring-orange-400 bg-orange-400/20 shadow-lg scale-105' 
                        : 'hover:bg-white/20 hover:scale-102'
                    }`}
                    onClick={() => setSelectedReward(reward)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {getRewardIcon(reward.type)}
                      <div className="flex-1">
                        <div className="font-medium text-white">{reward.description}</div>
                        <div className="text-sm text-white/70">
                          {reward.emoji}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {isWaitingForReward && (
            <div className="text-center py-4 text-sm text-white/70">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-white" />
              Attente de la validation de la récompense...
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1 glassmorphism border-white/20 hover:bg-white/20 text-white" 
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleWatchAd}
              disabled={
                !selectedReward || 
                isLoading ||
                adState.dailyCount >= adState.maxDaily
              }
              variant={adState.dailyCount >= adState.maxDaily ? "destructive" : "default"}
              className={`flex-1 transition-all duration-200 ${
                adState.dailyCount >= adState.maxDaily 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
              }`}
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
              ) : adState.dailyCount >= adState.maxDaily ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Limite atteinte
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
