import { useState, useEffect } from 'react';
import { PlantType } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Settings, Zap, Clock, Sparkles } from 'lucide-react';
import { EconomyService } from '@/services/EconomyService';
import { useGameData } from '@/hooks/useGameData';
import { useUpgrades } from '@/hooks/useUpgrades';
import { usePassiveIncomeRobot } from '@/hooks/usePassiveIncomeRobot';

interface PassiveIncomeRobotProps {
  isOpen: boolean;
  onClose: () => void;
  plantTypes: PlantType[];
  coins: number;
  currentPlantType?: PlantType;
  onSetPlant: (plantTypeId: string) => void;
}

export const PassiveIncomeRobot = ({
  isOpen,
  onClose,
  plantTypes,
  coins,
  currentPlantType,
  onSetPlant
}: PassiveIncomeRobotProps) => {
  const { data: gameData } = useGameData();
  const { getActiveMultipliers } = useUpgrades();
  const { coinsPerMinute, currentAccumulation, collectAccumulatedCoins, isCollecting } = usePassiveIncomeRobot();
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [realTimeAccumulation, setRealTimeAccumulation] = useState(0);

  const playerLevel = gameData?.garden?.level || 1;
  const multipliers = getActiveMultipliers();

  // Filtrer les plantes disponibles selon le niveau
  const availablePlants = plantTypes
    .filter(plant => EconomyService.canAccessPlant(plant.level_required || 1, playerLevel))
    .sort((a, b) => (a.level_required || 1) - (b.level_required || 1));

  // Mettre à jour l'accumulation en temps réel
  useEffect(() => {
    setRealTimeAccumulation(currentAccumulation);
    
    if (coinsPerMinute > 0) {
      const interval = setInterval(() => {
        setRealTimeAccumulation(prev => prev + Math.round(coinsPerMinute / 60));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [currentAccumulation, coinsPerMinute]);

  const getPlantCost = (plantType: PlantType): number => {
    const baseCost = EconomyService.getPlantDirectCost(plantType.level_required || 1);
    return EconomyService.getAdjustedPlantCost(baseCost, multipliers.plantCostReduction);
  };

  const getPlantCoinsPerMinute = (plantType: PlantType): number => {
    const harvestReward = EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_seconds,
      playerLevel,
      multipliers.harvest,
      multipliers.plantCostReduction,
      1
    );
    
    const growthTimeMinutes = plantType.base_growth_seconds / 60;
    return Math.round(harvestReward / growthTimeMinutes);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const handleConfirmSelection = () => {
    if (selectedPlant) {
      onSetPlant(selectedPlant);
      onClose();
    }
  };

  const handleCollectCoins = () => {
    collectAccumulatedCoins();
    setRealTimeAccumulation(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-green-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              🤖
            </div>
            Robot de Revenus Passifs
          </DialogTitle>
          <p className="text-green-600 text-sm">
            Génère des pièces automatiquement en continu
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {/* État actuel du robot */}
            {currentPlantType && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{currentPlantType.emoji}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-green-800 text-lg">
                      Robot actif: {currentPlantType.display_name}
                    </h3>
                    <p className="text-green-600 text-sm">
                      Génère {coinsPerMinute.toLocaleString()} 🪙/min
                    </p>
                  </div>
                </div>
                
                {/* Affichage des revenus accumulés */}
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Revenus accumulés</p>
                      <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                        <Coins className="h-5 w-5" />
                        {realTimeAccumulation.toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      onClick={handleCollectCoins}
                      disabled={realTimeAccumulation === 0 || isCollecting}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Collecter
                    </Button>
                  </div>
                  {realTimeAccumulation > 0 && (
                    <div className="mt-2 bg-green-50 rounded p-2">
                      <p className="text-xs text-green-600">
                        Maximum: {(coinsPerMinute * 24 * 60).toLocaleString()} 🪙 (24h)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sélection de plante */}
            <div>
              <h3 className="font-bold text-green-800 mb-3">
                {currentPlantType ? 'Changer de plante' : 'Sélectionner une plante'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availablePlants.map(plantType => {
                  const cost = getPlantCost(plantType);
                  const plantCoinsPerMin = getPlantCoinsPerMinute(plantType);
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

                        {/* Revenus par minute */}
                        <div className="bg-green-50 rounded p-1.5 border border-green-200">
                          <div className="flex items-center justify-center gap-1 text-green-700">
                            <Zap className="h-2.5 w-2.5" />
                            <span className="text-xs font-medium">
                              {plantCoinsPerMin}/min
                            </span>
                          </div>
                        </div>

                        {/* Coût initial */}
                        <div className="bg-red-50 rounded p-1 border border-red-200">
                          <div className="flex items-center justify-center gap-1 text-red-700">
                            <Coins className="h-2 w-2" />
                            <span className="text-xs">-{cost.toLocaleString()}</span>
                          </div>
                        </div>

                        {isCurrent && (
                          <div className="text-xs text-green-600 font-medium">
                            ✓ Actif
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleConfirmSelection} 
            disabled={!selectedPlant} 
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurer le Robot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};