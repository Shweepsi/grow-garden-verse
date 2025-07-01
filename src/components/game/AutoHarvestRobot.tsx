
import { useState, useEffect } from 'react';
import { PlantType } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Settings, Zap, Clock } from 'lucide-react';
import { EconomyService } from '@/services/EconomyService';
import { useGameData } from '@/hooks/useGameData';
import { useUpgrades } from '@/hooks/useUpgrades';

interface AutoHarvestRobotProps {
  isOpen: boolean;
  onClose: () => void;
  plantTypes: PlantType[];
  coins: number;
  currentPlantType?: PlantType;
  onSetPlant: (plantTypeId: string) => void;
}

export const AutoHarvestRobot = ({
  isOpen,
  onClose,
  plantTypes,
  coins,
  currentPlantType,
  onSetPlant
}: AutoHarvestRobotProps) => {
  const { data: gameData } = useGameData();
  const { getActiveMultipliers } = useUpgrades();
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);

  const playerLevel = gameData?.garden?.level || 1;
  const multipliers = getActiveMultipliers();

  // Filtrer les plantes disponibles selon le niveau
  const availablePlants = plantTypes.filter(plant => 
    EconomyService.canAccessPlant(plant.level_required || 1, playerLevel)
  ).sort((a, b) => (a.level_required || 1) - (b.level_required || 1));

  const getPlantCost = (plantType: PlantType): number => {
    const baseCost = EconomyService.getPlantDirectCost(plantType.level_required || 1);
    return EconomyService.getAdjustedPlantCost(baseCost, multipliers.plantCostReduction);
  };

  const getPlantReward = (plantType: PlantType): number => {
    return EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_seconds,
      playerLevel,
      multipliers.harvest,
      multipliers.plantCostReduction
    );
  };

  const getAdjustedGrowthTime = (baseGrowthSeconds: number): number => {
    return EconomyService.getAdjustedGrowthTime(baseGrowthSeconds, multipliers.growth);
  };

  const formatGrowthTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  const handleConfirmSelection = () => {
    if (selectedPlant) {
      onSetPlant(selectedPlant);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-blue-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              🤖
            </div>
            Configuration du Robot Auto-Récolte
          </DialogTitle>
          <p className="text-blue-600 text-sm">
            Sélectionnez la plante que le robot doit cultiver automatiquement
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {/* Plante actuelle */}
            {currentPlantType && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{currentPlantType.emoji}</div>
                  <div>
                    <h3 className="font-bold text-green-800">
                      Actuellement cultivé: {currentPlantType.display_name}
                    </h3>
                    <p className="text-sm text-green-600">
                      Le robot cultive automatiquement cette plante
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Informations sur les bonus */}
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Bonus actifs</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {multipliers.harvest > 1 && (
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    Récolte +{Math.round((multipliers.harvest - 1) * 100)}%
                  </Badge>
                )}
                {multipliers.growth > 1 && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-700">
                    Vitesse +{Math.round((multipliers.growth - 1) * 100)}%
                  </Badge>
                )}
                {multipliers.plantCostReduction < 1 && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700">
                    Coût -{Math.round((1 - multipliers.plantCostReduction) * 100)}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Sélection de plante */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availablePlants.map((plantType) => {
                const cost = getPlantCost(plantType);
                const reward = getPlantReward(plantType);
                const profit = reward - cost;
                const adjustedGrowthTime = getAdjustedGrowthTime(plantType.base_growth_seconds);
                const canAfford = EconomyService.canAffordPlant(coins, cost);
                const isSelected = selectedPlant === plantType.id;
                const isCurrent = currentPlantType?.id === plantType.id;

                return (
                  <Card
                    key={plantType.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isCurrent
                        ? 'ring-2 ring-green-400 bg-green-50 border-green-300'
                        : isSelected
                        ? 'ring-2 ring-blue-400 bg-blue-50 border-blue-300'
                        : canAfford
                        ? 'hover:shadow-lg hover:scale-105 border-gray-200'
                        : 'opacity-60 border-gray-200'
                    }`}
                    onClick={() => canAfford && setSelectedPlant(plantType.id)}
                  >
                    <CardContent className="p-3 text-center space-y-2">
                      <div className="text-2xl">{plantType.emoji}</div>
                      <h4 className="font-bold text-sm text-gray-800">
                        {plantType.display_name}
                      </h4>
                      
                      <Badge variant="outline" className="text-xs">
                        Niv.{plantType.level_required}
                      </Badge>

                      {/* Temps de croissance */}
                      <div className="bg-blue-50 rounded p-1.5 border border-blue-200">
                        <div className="flex items-center justify-center gap-1 text-blue-700">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="text-xs font-medium">
                            {formatGrowthTime(adjustedGrowthTime)}
                          </span>
                        </div>
                      </div>

                      {/* Économie */}
                      <div className="space-y-1">
                        <div className="bg-red-50 rounded p-1 border border-red-200">
                          <div className="flex items-center justify-center gap-1 text-red-700">
                            <Coins className="h-2 w-2" />
                            <span className="text-xs">-{cost.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="bg-green-50 rounded p-1 border border-green-200">
                          <div className="flex items-center justify-center gap-1 text-green-700">
                            <span className="text-xs">+{reward.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className={`rounded p-1 border text-xs font-bold ${
                          profit > 0 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                          Profit: {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedPlant}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurer le Robot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
