import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdRewards } from '@/hooks/useAdRewards';
import { AdModal } from './AdModal';
import { Play, Clock, Loader2, Tv, AlertCircle } from 'lucide-react';

export function AdRewardCard() {
  const { adState, loading, formatTimeUntilNext, refreshAdState } = useAdRewards();
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
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Disponible
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Regardez une pub pour gagner des récompenses !
                </span>
              </div>
              
              <Button
                onClick={handleOpenModal}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white animate-pulse shadow-lg shadow-orange-500/25"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Regarder une publicité
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-orange-200 text-orange-800 dark:border-orange-800 dark:text-orange-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Cooldown
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Prochaine disponible dans {formatTimeUntilNext(adState.timeUntilNext)}
                </span>
              </div>
              
              <Button
                disabled
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Clock className="w-4 h-4 mr-2" />
                Attendre {formatTimeUntilNext(adState.timeUntilNext)}
              </Button>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cooldown:</span>
                <span className="font-medium">2 heures</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Récompenses:</span>
                <span className="font-medium">Pièces, Gemmes, Boosts</span>
              </div>
            </div>
          </div>

          {adState.timeUntilNext > 0 && (
            <div className="text-xs text-center text-muted-foreground">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Les récompenses sont ajustées selon la durée de la publicité
            </div>
          )}
        </CardContent>
      </Card>

      <AdModal 
        open={showAdModal} 
        onOpenChange={setShowAdModal}
      />
    </>
  );
}