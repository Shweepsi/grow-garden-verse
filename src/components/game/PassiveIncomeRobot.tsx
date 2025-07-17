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
  const { coinsPerMinute, currentAccumulation, collectAccumulatedCoins, isCollecting, robotLevel } = usePassiveIncomeRobot();
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [realTimeAccumulation, setRealTimeAccumulation] = useState(0);

  const multipliers = getActiveMultipliers();

  // Filtrer les plantes disponibles selon le niveau du robot
  const availablePlants = plantTypes
    .filter(plant => (plant.level_required || 1) <= robotLevel)
    .sort((a, b) => (a.level_required || 1) - (b.level_required || 1));

  // Plantes verrouillées pour le prochain niveau
  const lockedPlants = plantTypes
    .filter(plant => (plant.level_required || 1) > robotLevel)
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

  const getPlantCoinsPerMinute = (plantType: PlantType): number => {
    const plantLevel = plantType.level_required || 1;
    const permanentMultiplier = gameData?.garden?.permanent_multiplier || 1;
    return EconomyService.getRobotPassiveIncome(plantLevel, multipliers.harvest, permanentMultiplier);
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
          <div className="flex items-center justify-between">
            <p className="text-green-600 text-sm">
              Génère des pièces automatiquement en continu
            </p>
            <Badge variant="outline" className="bg-green-100 text-green-700">
              Niveau {robotLevel}/10
            </Badge>
          </div>
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

            {/* Plantes disponibles */}
            <div>
              <h3 className="font-bold text-green-800 mb-3">
                {currentPlantType ? 'Changer de plante' : 'Sélectionner une plante'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availablePlants.map(plantType => {
                  const plantCoinsPerMin = getPlantCoinsPerMinute(plantType);
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
                            : 'hover:shadow-lg hover:scale-105 border-gray-200'
                      }`}
                      onClick={() => setSelectedPlant(plantType.id)}
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
                              {plantCoinsPerMin.toLocaleString()}/min
                            </span>
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

            {/* Plantes verrouillées */}
            {lockedPlants.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-600 mb-3">
                  Plantes verrouillées (améliorer le robot)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {lockedPlants.slice(0, 4).map(plantType => {
                    const plantCoinsPerMin = getPlantCoinsPerMinute(plantType);
                    const requiredLevel = plantType.level_required || 1;

                    return (
                      <Card 
                        key={plantType.id} 
                        className="opacity-60 border-gray-300 cursor-not-allowed"
                      >
                        <CardContent className="p-3 text-center space-y-2">
                          <div className="text-2xl grayscale">{plantType.emoji}</div>
                          <h4 className="font-bold text-sm text-gray-600">
                            {plantType.display_name}
                          </h4>
                          
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600">
                            Niv.{requiredLevel} requis
                          </Badge>

                          {/* Revenus potentiels */}
                          <div className="bg-gray-50 rounded p-1.5 border border-gray-200">
                            <div className="flex items-center justify-center gap-1 text-gray-600">
                              <Zap className="h-2.5 w-2.5" />
                              <span className="text-xs font-medium">
                                {plantCoinsPerMin.toLocaleString()}/min
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-red-600 font-medium">
                            🔒 Verrouillé
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
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