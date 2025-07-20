
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Play, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { AdReward } from '@/types/ads';
import { useAdRewards } from '@/hooks/useAdRewards';

interface AdRewardCardProps {
  reward?: AdReward;
  compact?: boolean;
  className?: string;
}

export const AdRewardCard = ({ reward, compact = false, className = '' }: AdRewardCardProps) => {
  const { adState, availableRewards, loading, watchAd, formatTimeUntilNext, debug } = useAdRewards();
  const [isWatching, setIsWatching] = useState(false);

  const handleWatchAd = async () => {
    const rewardToUse = reward || availableRewards[0];
    if (!rewardToUse || !adState.available) return;

    setIsWatching(true);
    try {
      await watchAd(rewardToUse);
    } finally {
      setIsWatching(false);
    }
  };

  const currentReward = reward || availableRewards[0];
  
  if (!currentReward) {
    return null;
  }

  const isDisabled = !adState.available || loading || isWatching;
  const buttonText = isWatching ? 'En cours...' : adState.available ? 'Regarder' : 'Indisponible';

  if (compact) {
    return (
      <Card className={`glassmorphic border-green-200/50 hover:border-green-300/60 transition-all duration-300 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{currentReward.emoji}</span>
              <div className="text-sm">
                <div className="font-medium text-foreground">{currentReward.description}</div>
                {!adState.available && adState.timeUntilNext > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeUntilNext(adState.timeUntilNext)}
                  </div>
                )}
                {/* Debug info avec durées */}
                {__DEV__ && (
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <div className="flex items-center gap-1">
                      {debug.adMobInitialized ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span>Init: {debug.adMobInitialized ? 'OK' : 'KO'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {debug.adLoaded ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : debug.adLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      )}
                      <span>Ad: {debug.adLoaded ? 'Ready' : debug.adLoading ? 'Loading' : 'Not loaded'}</span>
                    </div>
                    <div className="text-green-600">
                      <span>⏱️ Cooldown adaptatif activé</span>
                    </div>
                    {debug.lastError && (
                      <div className="text-red-500 text-xs">
                        Error: {debug.lastError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleWatchAd}
              disabled={isDisabled}
              className="h-8 px-3"
            >
              {isWatching ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glassmorphic border-green-200/50 hover:border-green-300/60 transition-all duration-300 hover:scale-105 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{currentReward.emoji}</div>
              <div>
                <h3 className="font-semibold text-foreground">Publicité Récompensée</h3>
                <p className="text-sm text-muted-foreground">Durée variable (5-30s)</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {adState.dailyCount}/{adState.maxDaily}
            </Badge>
          </div>

          {/* Récompense */}
          <div className="bg-background/50 rounded-lg p-3 border border-green-200/30">
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{currentReward.description}</div>
              {currentReward.duration && (
                <div className="text-sm text-muted-foreground">
                  Durée: {currentReward.duration} minutes
                </div>
              )}
            </div>
          </div>

          {/* Debug info en mode développement avec nouvelles informations */}
          {__DEV__ && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs space-y-2">
              <div className="font-semibold">Debug AdMob (Durée Dynamique):</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  {debug.adMobInitialized ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Init: {debug.adMobInitialized ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {debug.adLoaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : debug.adLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                  <span>Ad: {debug.adLoaded ? 'Loaded' : debug.adLoading ? 'Loading...' : 'Not loaded'}</span>
                </div>
              </div>
              <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                <div className="font-medium text-blue-800">Système Adaptatif:</div>
                <div className="text-blue-700">• Durée mesurée en temps réel</div>
                <div className="text-blue-700">• Cooldown : 15min + (durée × 4)</div>
                <div className="text-blue-700">• Validation minimum : 80% durée</div>
              </div>
              {debug.lastError && (
                <div className="text-red-600 bg-red-50 p-2 rounded">
                  <strong>Last Error:</strong> {debug.lastError}
                </div>
              )}
            </div>
          )}

          {/* Statut */}
          {!adState.available && (
            <div className="space-y-2">
              {adState.timeUntilNext > 0 ? (
                <div className="text-center">
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    Prochaine pub dans {formatTimeUntilNext(adState.timeUntilNext)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    ⚡ Cooldown adaptatif basé sur la durée
                  </div>
                  <Progress 
                    value={adState.timeUntilNext > 0 ? ((7200 - adState.timeUntilNext) / 7200) * 100 : 100} 
                    className="mt-2 h-2"
                  />
                </div>
              ) : adState.dailyCount >= adState.maxDaily ? (
                <div className="text-center text-sm text-muted-foreground">
                  Limite quotidienne atteinte
                </div>
              ) : null}
            </div>
          )}

          {/* Bouton */}
          <Button
            onClick={handleWatchAd}
            disabled={isDisabled}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
            size="lg"
          >
            {isWatching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                En cours...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {buttonText}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
