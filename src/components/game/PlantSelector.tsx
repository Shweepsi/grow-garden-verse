
import { PlantType } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Lock, TrendingUp, Clock, Calculator } from 'lucide-react';
import { EconomyService } from '@/services/EconomyService';
import { useGameData } from '@/hooks/useGameData';

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
  const playerLevel = gameData?.garden?.level || 1;

  const getPlantCost = (plantType: PlantType): number => {
    return EconomyService.getPlantDirectCost(plantType.level_required || 1);
  };

  const getPlantReward = (plantType: PlantType): number => {
    return EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_minutes || 60,
      playerLevel
    );
  };

  const getROI = (plantType: PlantType): number => {
    return EconomyService.getROIPercentage(
      plantType.level_required || 1,
      plantType.base_growth_minutes || 60
    );
  };

  const getProfitPerMinute = (plantType: PlantType): number => {
    return EconomyService.getProfitPerMinute(
      plantType.level_required || 1,
      plantType.base_growth_minutes || 60
    );
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            Choisir une plante - Parcelle {plotNumber}
            <div className="ml-auto flex items-center gap-1 text-sm text-yellow-600">
              <Coins className="h-4 w-4" />
              {coins.toLocaleString()}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plantes disponibles */}
          {availablePlants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-700">
                Plantes disponibles
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availablePlants.map((plantType) => {
                  const cost = getPlantCost(plantType);
                  const reward = getPlantReward(plantType);
                  const roi = getROI(plantType);
                  const profitPerMin = getProfitPerMinute(plantType);
                  const canAfford = coins >= cost;

                  return (
                    <Card
                      key={plantType.id}
                      className={`cursor-pointer transition-all hover:shadow-lg border-green-200 ${
                        canAfford ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 opacity-60'
                      }`}
                      onClick={() => canAfford ? onPlantDirect(plotNumber, plantType.id, cost) : null}
                    >
                      <CardContent className="p-4">
                        <div className="text-center space-y-2">
                          <div className="text-3xl mb-2">{plantType.emoji}</div>
                          
                          <h4 className="font-medium text-sm">{plantType.display_name}</h4>
                          
                          <div className="flex items-center justify-center gap-2 text-xs">
                            <Badge variant="outline" className="text-xs bg-blue-100">
                              Niv. {plantType.level_required}
                            </Badge>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="h-3 w-3" />
                              {plantType.base_growth_minutes}min
                            </div>
                          </div>

                          {/* Coût de plantation */}
                          <div className="bg-red-50 p-2 rounded border border-red-200">
                            <div className="text-xs text-red-600 font-medium">Coût</div>
                            <div className="flex items-center justify-center gap-1 text-sm font-bold text-red-700">
                              <Coins className="h-3 w-3" />
                              {cost.toLocaleString()}
                            </div>
                          </div>

                          {/* Gain à la récolte */}
                          <div className="bg-green-50 p-2 rounded border border-green-200">
                            <div className="text-xs text-green-600 font-medium">Gain</div>
                            <div className="flex items-center justify-center gap-1 text-sm font-bold text-green-700">
                              <TrendingUp className="h-3 w-3" />
                              {reward.toLocaleString()}
                            </div>
                          </div>

                          {/* Rentabilité */}
                          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                            <div className="text-xs text-yellow-600 font-medium">Rentabilité</div>
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <Calculator className="h-3 w-3" />
                              <span className="font-bold text-yellow-700">+{roi}%</span>
                              <span className="text-gray-600">({profitPerMin}/min)</span>
                            </div>
                          </div>

                          {/* Indicateur de fonds */}
                          <div className={`text-xs font-medium ${
                            canAfford ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {canAfford ? '✓ Fonds suffisants' : '✗ Fonds insuffisants'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plantes verrouillées */}
          {lockedPlants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-500">
                🔒 Plantes Verrouillées
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {lockedPlants.map((plantType) => {
                  const cost = getPlantCost(plantType);
                  const reward = getPlantReward(plantType);
                  const roi = getROI(plantType);

                  return (
                    <Card
                      key={plantType.id}
                      className="opacity-50 border-gray-200 bg-gray-50"
                    >
                      <CardContent className="p-4">
                        <div className="text-center space-y-2">
                          <div className="text-3xl mb-2 grayscale">{plantType.emoji}</div>
                          
                          <h4 className="font-medium text-sm text-gray-500">
                            {plantType.display_name}
                          </h4>
                          
                          <div className="flex items-center justify-center gap-1">
                            <Lock className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-500">
                              Niveau {plantType.level_required} requis
                            </span>
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Coût: {cost.toLocaleString()} 🪙</div>
                            <div>Gain: {reward.toLocaleString()} 🪙</div>
                            <div>ROI: +{roi}%</div>
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
            <div className="text-center py-8 text-gray-500">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Aucune plante disponible.</p>
              <p className="text-sm mt-2">
                Récoltez des plantes pour gagner de l'expérience !
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
