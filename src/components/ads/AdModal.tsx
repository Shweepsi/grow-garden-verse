import { useState } from 'react';
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

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdModal = ({ open, onOpenChange }: AdModalProps) => {
  const { adState, availableRewards, loading, watchAd, formatTimeUntilNext } = useAdRewards();
  const [selectedReward, setSelectedReward] = useState<AdReward | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const handleWatchAd = async (reward: AdReward) => {
    if (!adState.available) return;

    setIsWatching(true);
    try {
      const success = await watchAd(reward);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsWatching(false);
      setSelectedReward(null);
    }
  };

  const getRewardIcon = (type: AdReward['type']) => {
    switch (type) {
      case 'coins': return '💰';
      case 'gems': return '💎';
      case 'growth_boost': return '⚡';
      case 'robot_boost': return '🤖';
      case 'xp_boost': return '⭐';
      default: return '🎁';
    }
  };

  const getRewardColor = (type: AdReward['type']) => {
    switch (type) {
      case 'coins': return 'from-yellow-400 to-yellow-600';
      case 'gems': return 'from-blue-400 to-blue-600';
      case 'growth_boost': return 'from-green-400 to-green-600';
      case 'robot_boost': return 'from-purple-400 to-purple-600';
      case 'xp_boost': return 'from-orange-400 to-orange-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

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
          <DialogDescription>
            Regardez une courte publicité pour gagner des récompenses !
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* État actuel */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-green-200/30">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {adState.dailyCount}/{adState.maxDaily} publicités aujourd'hui
              </span>
            </div>
            {!adState.available && adState.timeUntilNext > 0 && (
              <Badge variant="outline" className="text-xs">
                {formatTimeUntilNext(adState.timeUntilNext)}
              </Badge>
            )}
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
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRewardColor(reward.type)} flex items-center justify-center text-white font-bold`}>
                        {reward.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{reward.description}</div>
                        {reward.duration && (
                          <div className="text-xs text-muted-foreground">
                            Durée: {reward.duration} minutes
                          </div>
                        )}
                      </div>
                      <div className="text-xl">{getRewardIcon(reward.type)}</div>
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
                {adState.dailyCount >= adState.maxDaily
                  ? 'Vous avez atteint la limite quotidienne'
                  : `Prochaine publicité dans ${formatTimeUntilNext(adState.timeUntilNext)}`
                }
              </p>
              {adState.timeUntilNext > 0 && (
                <Progress 
                  value={((7200 - adState.timeUntilNext) / 7200) * 100} 
                  className="w-full h-2"
                />
              )}
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
                disabled={!selectedReward || isWatching || loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
              >
                {isWatching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Regarder (30s)
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