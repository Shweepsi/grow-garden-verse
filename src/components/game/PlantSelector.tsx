
import React from 'react';
import { useGameData } from '@/hooks/useGameData';
import { useUpgrades } from '@/hooks/useUpgrades';
import { EconomyService } from '@/services/EconomyService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Clock, TrendingUp, Zap } from 'lucide-react';
import { PlantType } from '@/types/game';

interface PlantSelectorProps {
  onPlantSelect: (plantType: PlantType) => void;
  playerLevel: number;
  coins: number;
}

export const PlantSelector: React.FC<PlantSelectorProps> = ({
  onPlantSelect,
  playerLevel,
  coins
}) => {
  const { data: gameData } = useGameData();
  const { getActiveMultipliers } = useUpgrades();
  
  const plantTypes = gameData?.plantTypes || [];
  const multipliers = getActiveMultipliers();

  const availablePlants = plantTypes.filter(plant => 
    (plant.level_required || 1) <= playerLevel
  );

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-700';
      case 'uncommon': return 'bg-green-100 text-green-700';
      case 'rare': return 'bg-blue-100 text-blue-700';
      case 'epic': return 'bg-purple-100 text-purple-700';
      case 'legendary': return 'bg-yellow-100 text-yellow-700';
      case 'mythic': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPlantCost = (plant: PlantType) => {
    const baseCost = (plant.level_required || 1) * 25;
    return EconomyService.calculatePlantCost(baseCost, multipliers);
  };

  const getGrowthTime = (plant: PlantType) => {
    return EconomyService.calculateGrowthTime(plant.base_growth_seconds, multipliers);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const canAfford = (cost: number) => {
    return EconomyService.canAffordPlanting(coins, cost);
  };

  const hasGrowthBonus = multipliers.growthSpeedMultiplier > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-green-800">
          🌱 Sélectionner une plante
        </h3>
        {hasGrowthBonus && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <Zap className="h-3 w-3 mr-1" />
            Croissance x{multipliers.growthSpeedMultiplier.toFixed(2)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availablePlants.map((plant) => {
          const cost = getPlantCost(plant);
          const growthTime = getGrowthTime(plant);
          const originalGrowthTime = plant.base_growth_seconds;
          const affordable = canAfford(cost);

          return (
            <Card 
              key={plant.id}
              className={`glassmorphism cursor-pointer transition-all hover:scale-105 ${
                affordable ? 'ring-2 ring-green-400' : 'opacity-60'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{plant.emoji}</span>
                    <div>
                      <CardTitle className="text-sm text-green-800">
                        {plant.display_name}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getRarityColor(plant.rarity || 'common')}`}
                      >
                        {plant.rarity || 'common'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-yellow-600" />
                    <span className={affordable ? 'text-green-600' : 'text-red-500'}>
                      {cost}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="text-green-600 font-medium">
                        {formatTime(growthTime)}
                      </span>
                      {hasGrowthBonus && (
                        <span className="text-gray-500 line-through text-xs">
                          {formatTime(originalGrowthTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => onPlantSelect(plant)}
                  disabled={!affordable}
                  className={`w-full ${
                    affordable 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400'
                  }`}
                >
                  {affordable ? 'Planter' : 'Pas assez de pièces'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {availablePlants.length === 0 && (
        <div className="text-center py-8">
          <p className="text-green-700">
            Aucune plante disponible à votre niveau.
          </p>
        </div>
      )}
    </div>
  );
};
