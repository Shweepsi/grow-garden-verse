import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdRewards } from '@/hooks/useAdRewards';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { AdModal } from './AdModal';
import { PremiumAdAutoReward } from './PremiumAdAutoReward';
import { Play, Clock, Loader2, Tv, AlertCircle, Crown } from 'lucide-react';

export function AdRewardCard() {
  const { adState, loading, formatTimeUntilNext, getAdStatusMessage, refreshAdState, watchAd } = useAdRewards();
  const { isPremium } = usePremiumStatus();
  const [showAdModal, setShowAdModal] = useState(false);

  const handleOpenModal = async () => {
    await refreshAdState();
    if (adState.available) {
      setShowAdModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowAdModal(false);
    refreshAdState(); // Actualiser l'état après avoir regardé une pub
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  // Si l'utilisateur est premium, afficher le composant de récompense automatique
  if (isPremium) {
    return (
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-200 dark:border-yellow-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="w-5 h-5 text-yellow-600" />
            Récompenses Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PremiumAdAutoReward 
            onRewardClaimed={async (type, amount) => {
              const result = await watchAd(type, amount);
              if (!result.success) {
                throw new Error(result.error || 'Erreur inconnue');
              }
            }}
            loading={loading}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tv className="w-5 h-5 text-purple-600" />
            Publicités Récompensées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {adState.available ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Disponible
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {adState.dailyCount}/{adState.maxDaily} aujourd'hui
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground text-center">
                Regardez une pub pour gagner des récompenses !
              </div>
              
              <Button
                onClick={handleOpenModal}
                size="lg"
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Regarder une publicité
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-200 text-orange-800 dark:border-orange-800 dark:text-orange-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Limite atteinte
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {adState.dailyCount}/{adState.maxDaily} aujourd'hui
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground text-center">
                {getAdStatusMessage()}
              </div>
              
              <Button
                disabled
                variant="outline"
                className="w-full"
                size="lg"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Limite quotidienne atteinte
              </Button>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limite quotidienne:</span>
                <span className="font-medium">5 publicités</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reset:</span>
                <span className="font-medium">Minuit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Récompenses:</span>
                <span className="font-medium">Pièces, Gemmes, Boosts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdModal 
        open={showAdModal} 
        onOpenChange={setShowAdModal}
      />
    </>
  );
}