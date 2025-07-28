import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Gem, Star } from 'lucide-react';
import { AdRewardCard } from '@/components/ads/AdRewardCard';
import { BoostStatusIndicator } from '@/components/ads/BoostStatusIndicator';
import { useGameData } from '@/hooks/useGameData';
import { useAdRewards } from '@/hooks/useAdRewards';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';

export function GameHeader() {
  const { data: gameData, isLoading } = useGameData();
  const { availableRewards, adState, loadingRewards } = useAdRewards();
  const { getCompleteMultipliers } = useGameMultipliers();
  
  const multipliers = getCompleteMultipliers();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Afficher un aperçu des récompenses disponibles
  const getRewardPreview = () => {
    if (loadingRewards) {
      return "Chargement des récompenses...";
    }
    
    if (!availableRewards || availableRewards.length === 0) {
      return "Aucune récompense disponible";
    }

    // Afficher les 3 premières récompenses avec leurs emojis
    const preview = availableRewards.slice(0, 3).map(reward => 
      `${reward.emoji} ${reward.description}`
    ).join(', ');
    
    if (availableRewards.length > 3) {
      return `${preview} et ${availableRewards.length - 3} autres...`;
    }
    
    return preview;
  };

  return (
    <div className="space-y-6">
      {/* Stats du joueur */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Niveau */}
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Star className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Niveau</div>
                <div className="text-xl font-bold">{gameData?.garden?.level || 1}</div>
              </div>
            </div>

            {/* Pièces */}
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Coins className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pièces</div>
                <div className="text-xl font-bold">
                  {formatNumber(gameData?.garden?.coins || 0)}
                  {multipliers.coins > 1 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      x{multipliers.coins.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Gemmes */}
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Gem className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Gemmes</div>
                <div className="text-xl font-bold">
                  {gameData?.garden?.gems || 0}
                  {multipliers.gems > 1 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      x{multipliers.gems.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Croissance */}
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <span className="text-xl">🌱</span>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Vitesse Croissance</div>
                <div className="text-xl font-bold">
                  {multipliers.growth > 1 ? (
                    <Badge variant="secondary" className="text-sm">
                      x{multipliers.growth.toFixed(1)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Normal</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicateurs de boost actifs */}
      <BoostStatusIndicator />

      {/* Carte des récompenses publicitaires avec aperçu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdRewardCard />
        
        {/* Aperçu des récompenses disponibles */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎁</span>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Récompenses Disponibles
                </h3>
              </div>
              
              <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                {getRewardPreview()}
              </div>
              
              {adState.available && availableRewards.length > 0 && (
                <div className="pt-2">
                  <Badge 
                    variant="secondary" 
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200"
                  >
                    {availableRewards.length} récompense{availableRewards.length > 1 ? 's' : ''} disponible{availableRewards.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
