
import { PlantType } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Lock, TrendingUp, Clock, Percent, Timer, Award } from 'lucide-react';
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-between text-xl font-bold text-green-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-lg">Sélection de plante</div>
                <div className="text-sm text-green-600 font-normal">Parcelle {plotNumber}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-yellow-100 px-3 py-2 rounded-lg border border-yellow-200">
              <Coins className="h-4 w-4 text-yellow-600" />
              <span className="font-bold text-yellow-700">{coins.toLocaleString()}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto space-y-6 pr-2">
          {/* Bonus actifs - Design amélioré */}
          {(multipliers.harvest > 1 || multipliers.growth > 1 || multipliers.exp > 1 || multipliers.plantCostReduction < 1) && (
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-green-200/50">
              <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Bonus actifs
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {multipliers.harvest > 1 && (
                  <div className="bg-gradient-to-r from-green-100 to-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <TrendingUp className="h-4 w-4" />
                      <div className="text-center">
                        <div className="text-xs text-green-600">Récolte</div>
                        <div className="font-bold">+{Math.round((multipliers.harvest - 1) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {multipliers.growth > 1 && (
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Timer className="h-4 w-4" />
                      <div className="text-center">
                        <div className="text-xs text-blue-600">Vitesse</div>
                        <div className="font-bold">+{Math.round((multipliers.growth - 1) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {multipliers.exp > 1 && (
                  <div className="bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-purple-700">
                      <Sparkles className="h-4 w-4" />
                      <div className="text-center">
                        <div className="text-xs text-purple-600">Expérience</div>
                        <div className="font-bold">+{Math.round((multipliers.exp - 1) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {multipliers.plantCostReduction < 1 && (
                  <div className="bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-orange-700">
                      <Percent className="h-4 w-4" />
                      <div className="text-center">
                        <div className="text-xs text-orange-600">Économie</div>
                        <div className="font-bold">-{Math.round((1 - multipliers.plantCostReduction) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plantes disponibles - Design premium */}
          {availablePlants.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-green-800 flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                Plantes disponibles
                <span className="text-sm font-normal text-green-600">({availablePlants.length})</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availablePlants.map((plantType) => {
                  const baseCost = getPlantBaseCost(plantType);
                  const adjustedCost = getPlantCost(plantType);
                  const reward = getPlantReward(plantType);
                  const profit = reward - adjustedCost;
                  const adjustedGrowthTime = getAdjustedGrowthTime(plantType.base_growth_seconds);
                  const canAfford = EconomyService.canAffordPlant(coins, adjustedCost);
                  const hasCostReduction = multipliers.plantCostReduction < 1;
                  const hasGrowthBonus = multipliers.growth > 1;

                  return (
                    <Card
                      key={plantType.id}
                      className={`cursor-pointer transition-all duration-300 border-2 ${
                        canAfford 
                          ? 'bg-gradient-to-br from-white to-green-50 hover:from-green-50 hover:to-green-100 border-green-300 hover:border-green-400 hover:shadow-lg hover:scale-105' 
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 opacity-60 border-gray-200'
                      }`}
                      onClick={() => canAfford ? handlePlantClick(plantType.id, adjustedCost) : null}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header avec emoji et nom */}
                          <div className="text-center">
                            <div className="text-3xl mb-2 transform hover:scale-110 transition-transform">
                              {plantType.emoji}
                            </div>
                            <h4 className="font-bold text-sm text-gray-800 leading-tight">
                              {plantType.display_name}
                            </h4>
                          </div>
                          
                          {/* Niveau requis */}
                          <div className="flex justify-center">
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-blue-100 text-blue-700 border-blue-300 font-bold px-2 py-1"
                            >
                              Niveau {plantType.level_required}
                            </Badge>
                          </div>
                          
                          {/* Temps de croissance */}
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                            <div className="flex items-center justify-center gap-2 text-blue-700">
                              <Clock className="h-3 w-3" />
                              <div className="text-xs font-medium">
                                {hasGrowthBonus ? (
                                  <div className="flex items-center gap-1">
                                    <span className="line-through text-gray-400">
                                      {formatGrowthTime(plantType.base_growth_seconds)}
                                    </span>
                                    <span className="text-blue-600 font-bold">
                                      {formatGrowthTime(adjustedGrowthTime)}
                                    </span>
                                    <Sparkles className="h-2 w-2 text-blue-500" />
                                  </div>
                                ) : (
                                  formatGrowthTime(plantType.base_growth_seconds)
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Économie */}
                          <div className="space-y-2">
                            {/* Coût */}
                            <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                              <div className="flex items-center justify-center gap-1 text-red-700">
                                <Coins className="h-3 w-3" />
                                <div className="text-xs font-bold">
                                  {hasCostReduction ? (
                                    <div className="flex items-center gap-1">
                                      <span className="line-through text-gray-400">
                                        -{baseCost.toLocaleString()}
                                      </span>
                                      <span className="text-red-700">
                                        -{adjustedCost.toLocaleString()}
                                      </span>
                                      <Sparkles className="h-2 w-2 text-orange-500" />
                                    </div>
                                  ) : (
                                    <>-{adjustedCost.toLocaleString()}</>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Gain */}
                            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                              <div className="flex items-center justify-center gap-1 text-green-700">
                                <TrendingUp className="h-3 w-3" />
                                <div className="text-xs font-bold">
                                  +{reward.toLocaleString()}
                                  {multipliers.harvest > 1 && (
                                    <Sparkles className="h-2 w-2 text-green-500 inline ml-1" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Profit net */}
                            <div className={`rounded-lg p-2 border ${
                              profit > 0 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}>
                              <div className="text-center text-xs font-bold">
                                Profit: {profit > 0 ? '+' : ''}{profit.toLocaleString()}
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

          {/* Plantes verrouillées - Design amélioré */}
          {lockedPlants.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-gray-600 flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                  <Lock className="h-3 w-3 text-white" />
                </div>
                Plantes verrouillées
                <span className="text-sm font-normal text-gray-500">({lockedPlants.length})</span>
              </h3>
              
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {lockedPlants.map((plantType) => {
                  return (
                    <Card
                      key={plantType.id}
                      className="opacity-50 border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100"
                    >
                      <CardContent className="p-3">
                        <div className="text-center space-y-2">
                          <div className="text-2xl grayscale">{plantType.emoji}</div>
                          <h4 className="font-medium text-xs text-gray-500 leading-tight">
                            {plantType.display_name}
                          </h4>
                          <div className="flex items-center justify-center gap-1">
                            <Lock className="h-2 w-2 text-red-500" />
                            <span className="text-xs text-red-500 font-bold">
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

          {/* Message si aucune plante */}
          {availablePlants.length === 0 && lockedPlants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium">Aucune plante disponible</p>
              <p className="text-sm text-gray-400">Débloquez de nouvelles plantes en montant de niveau</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
