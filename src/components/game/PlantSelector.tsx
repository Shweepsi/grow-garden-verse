
import { PlantType } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Lock, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
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
    return EconomyService.getPlantDirectCost(plantType.level_required || 1);
  };

  const getPlantReward = (plantType: PlantType): number => {
    const baseReward = EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_seconds || 60,
      playerLevel
    );
    // Appliquer le multiplicateur de récolte
    return Math.floor(baseReward * multipliers.harvest);
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
          {/* Message d'information compact */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <div className="flex items-center gap-2 text-blue-700">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">
                Gardez au moins 100 pièces sauf pour acheter une carotte
              </span>
            </div>
          </div>

          {/* Multiplicateur actif */}
          {multipliers.harvest > 1 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="flex items-center gap-2 text-green-700">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">
                  Bonus de récolte actif: +{Math.round((multipliers.harvest - 1) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Plantes disponibles */}
          {availablePlants.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-green-700">
                Plantes disponibles
              </h3>
              
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {availablePlants.map((plantType) => {
                  const cost = getPlantCost(plantType);
                  const reward = getPlantReward(plantType);
                  const plantLevel = plantType.level_required || 1;
                  const canAfford = EconomyService.canAffordPlant(coins, cost, plantLevel);

                  return (
                    <Card
                      key={plantType.id}
                      className={`cursor-pointer transition-all hover:shadow-md border-green-200 ${
                        canAfford ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 opacity-60'
                      }`}
                      onClick={() => canAfford ? handlePlantClick(plantType.id, cost) : null}
                    >
                      <CardContent className="p-2">
                        <div className="text-center space-y-2">
                          <div className="text-xl mb-1">{plantType.emoji}</div>
                          
                          <h4 className="font-medium text-xs">{plantType.display_name}</h4>
                          
                          {/* Niveau et Temps */}
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <Badge variant="outline" className="text-xs bg-blue-100 font-semibold px-1 py-0">
                              Niv.{plantType.level_required}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-center gap-1 text-gray-600 text-xs">
                            <Clock className="h-2 w-2" />
                            {formatGrowthTime(plantType.base_growth_seconds)}
                          </div>

                          {/* Économie très compacte */}
                          <div className="space-y-1">
                            {/* Coût */}
                            <div className="bg-red-50 px-1 py-1 rounded border border-red-200">
                              <div className="flex items-center justify-center gap-1 text-xs font-bold text-red-700">
                                <Coins className="h-2 w-2" />
                                -{cost.toLocaleString()}
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

                          {/* Statut compact */}
                          <div className={`text-xs font-medium ${
                            canAfford ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {canAfford ? '✓' : 
                             coins >= cost ? '⚠️' : '✗'}
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
                  const cost = getPlantCost(plantType);
                  const reward = getPlantReward(plantType);

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
