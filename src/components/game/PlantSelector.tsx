import { PlantType } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Lock, TrendingUp, Clock, Percent } from 'lucide-react';
import { EconomyService } from '@/services/EconomyService';
import { useGameData } from '@/hooks/useGameData';
import { useUpgrades } from '@/hooks/useUpgrades';

interface PlantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  plotNumber: number;
  plantTypes: PlantType[];
  coins: number;
  onPlantDirect: (plotNumber: number, plantTypeId: string, cost: number) => void;
}

export const PlantSelector = ({ 
  isOpen, 
  onClose, 
  plotNumber, 
  plantTypes,
  coins,
  onPlantDirect
}: PlantSelectorProps) => {
  const { data: gameData } = useGameData();
  const { getActiveMultipliers } = useUpgrades();
  const playerLevel = gameData?.garden?.level || 1;

  // Obtenir les multiplicateurs actifs
  const multipliers = getActiveMultipliers();

  const getPlantCost = (plantType: PlantType): number => {
    const baseCost = EconomyService.getPlantDirectCost(plantType.level_required || 1);
    return EconomyService.getAdjustedPlantCost(baseCost, multipliers.plantCostReduction);
  };

  const getPlantBaseCost = (plantType: PlantType): number => {
    return EconomyService.getPlantDirectCost(plantType.level_required || 1);
  };

  const getPlantReward = (plantType: PlantType): number => {
    const baseReward = EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_seconds || 60,
      playerLevel,
      multipliers.harvest,
      multipliers.plantCostReduction
    );
    return baseReward;
  };

  const getAdjustedGrowthTime = (baseGrowthSeconds: number): number => {
    return EconomyService.getAdjustedGrowthTime(baseGrowthSeconds, multipliers.growth);
  };

  const formatGrowthTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}min`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  const handlePlantClick = (plantTypeId: string, cost: number) => {
    onPlantDirect(plotNumber, plantTypeId, cost);
    onClose();
  };

  // Filtrer les plantes selon le niveau du joueur
  const availablePlants = plantTypes
    .filter(plant => EconomyService.canAccessPlant(plant.level_required || 1, playerLevel))
    .sort((a, b) => (a.level_required || 1) - (b.level_required || 1));

  const lockedPlants = plantTypes
    .filter(plant => !EconomyService.canAccessPlant(plant.level_required || 1, playerLevel))
    .sort((a, b) => (a.level_required || 1) - (b.level_required || 1));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-green-600" />
            Choisir une plante - Parcelle {plotNumber}
            <div className="ml-auto flex items-center gap-1 text-sm text-yellow-600">
              <Coins className="h-3 w-3" />
              {coins.toLocaleString()}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bonus actifs */}
          <div className="flex flex-wrap gap-2">
            {multipliers.harvest > 1 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                <div className="flex items-center gap-1 text-green-700">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    Récolte +{Math.round((multipliers.harvest - 1) * 100)}%
                  </span>
                </div>
              </div>
            )}
            
            {multipliers.growth > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                <div className="flex items-center gap-1 text-blue-700">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    Croissance +{Math.round((multipliers.growth - 1) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {multipliers.exp > 1 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-2 py-1">
                <div className="flex items-center gap-1 text-purple-700">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    EXP +{Math.round((multipliers.exp - 1) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {multipliers.plantCostReduction < 1 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-2 py-1">
                <div className="flex items-center gap-1 text-orange-700">
                  <Percent className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    Coût -{Math.round((1 - multipliers.plantCostReduction) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Plantes disponibles */}
          {availablePlants.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-green-700">
                Plantes disponibles
              </h3>
              
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {availablePlants.map((plantType) => {
                  const baseCost = getPlantBaseCost(plantType);
                  const adjustedCost = getPlantCost(plantType);
                  const reward = getPlantReward(plantType);
                  const adjustedGrowthTime = getAdjustedGrowthTime(plantType.base_growth_seconds);
                  const canAfford = EconomyService.canAffordPlant(coins, adjustedCost);
                  const hasCostReduction = multipliers.plantCostReduction < 1;

                  return (
                    <Card
                      key={plantType.id}
                      className={`cursor-pointer transition-all hover:shadow-md border-green-200 ${
                        canAfford ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 opacity-60'
                      }`}
                      onClick={() => canAfford ? handlePlantClick(plantType.id, adjustedCost) : null}
                    >
                      <CardContent className="p-2">
                        <div className="text-center space-y-2">
                          <div className="text-xl mb-1">{plantType.emoji}</div>
                          
                          <h4 className="font-medium text-xs">{plantType.display_name}</h4>
                          
                          {/* Niveau */}
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <Badge variant="outline" className="text-xs bg-blue-100 font-semibold px-1 py-0">
                              Niv.{plantType.level_required}
                            </Badge>
                          </div>
                          
                          {/* Temps avec bonus */}
                          <div className="flex items-center justify-center gap-1 text-gray-600 text-xs">
                            <Clock className="h-2 w-2" />
                            <span className={multipliers.growth > 1 ? 'line-through text-gray-400' : ''}>
                              {formatGrowthTime(plantType.base_growth_seconds)}
                            </span>
                            {multipliers.growth > 1 && (
                              <span className="text-blue-600 font-medium">
                                {formatGrowthTime(adjustedGrowthTime)}
                              </span>
                            )}
                          </div>

                          {/* Économie très compacte */}
                          <div className="space-y-1">
                            {/* Coût avec réduction */}
                            <div className="bg-red-50 px-1 py-1 rounded border border-red-200">
                              <div className="flex items-center justify-center gap-1 text-xs font-bold text-red-700">
                                <Coins className="h-2 w-2" />
                                {hasCostReduction ? (
                                  <>
                                    <span className="line-through text-gray-400">
                                      -{baseCost.toLocaleString()}
                                    </span>
                                    <span className="text-red-700">
                                      -{adjustedCost.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-orange-600">✨</span>
                                  </>
                                ) : (
                                  <>-{adjustedCost.toLocaleString()}</>
                                )}
                              </div>
                            </div>

                            {/* Gain avec multiplicateur */}
                            <div className="bg-green-50 px-1 py-1 rounded border border-green-200">
                              <div className="flex items-center justify-center gap-1 text-xs font-bold text-green-700">
                                <TrendingUp className="h-2 w-2" />
                                +{reward.toLocaleString()}
                                {multipliers.harvest > 1 && (
                                  <span className="text-xs text-green-600">✨</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plantes verrouillées - Plus compact */}
          {lockedPlants.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-gray-500">
                🔒 Plantes Verrouillées
              </h3>
              
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {lockedPlants.map((plantType) => {
                  return (
                    <Card
                      key={plantType.id}
                      className="opacity-40 border-gray-200 bg-gray-50"
                    >
                      <CardContent className="p-2">
                        <div className="text-center space-y-1">
                          <div className="text-lg mb-1 grayscale">{plantType.emoji}</div>
                          
                          <h4 className="font-medium text-xs text-gray-500">
                            {plantType.display_name}
                          </h4>
                          
                          <div className="flex items-center justify-center gap-1">
                            <Lock className="h-2 w-2 text-red-500" />
                            <span className="text-xs text-red-500 font-medium">
                              Niv.{plantType.level_required}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {availablePlants.length === 0 && lockedPlants.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Aucune plante disponible.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
