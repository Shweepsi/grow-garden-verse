import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coins, Bot, Loader2 } from 'lucide-react';
import { useGameData } from '@/hooks/useGameData';
import { useUpgrades } from '@/hooks/useUpgrades';
import { usePassiveIncomeRobot } from '@/hooks/usePassiveIncomeRobot';
import { EconomyService } from '@/services/EconomyService';

interface PassiveIncomeRobotProps {
  isOpen: boolean;
  onClose: () => void;
  coinsPerMinute: number;
  currentAccumulation: number;
  collectAccumulatedCoins: () => void;
  isCollecting: boolean;
  currentPlantType?: any;
}

export const PassiveIncomeRobot = ({
  isOpen,
  onClose,
  coinsPerMinute,
  currentAccumulation,
  collectAccumulatedCoins,
  isCollecting,
  currentPlantType
}: PassiveIncomeRobotProps) => {
  const { data: gameData } = useGameData();
  const { getActiveMultipliers } = useUpgrades();
  const { robotLevel } = usePassiveIncomeRobot();
  const [realTimeAccumulation, setRealTimeAccumulation] = useState(0);

  const multipliers = getActiveMultipliers();

  // Mise à jour en temps réel de l'accumulation
  useEffect(() => {
    if (currentAccumulation > 0) {
      setRealTimeAccumulation(currentAccumulation);
    }
  }, [currentAccumulation]);

  // Calculer les revenus par minute de la plante actuelle
  const calculatePlantRevenue = (plantLevel: number): number => {
    if (!gameData?.garden) return 0;
    const permanentMultiplier = gameData.garden.permanent_multiplier || 1;
    return EconomyService.getRobotPassiveIncome(plantLevel, multipliers.harvest, permanentMultiplier);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-green-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              🤖
            </div>
            Robot de Revenus Passifs
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-green-600 text-sm">
              Génère des pièces automatiquement avec {currentPlantType?.display_name || 'Pomme de terre'}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{currentPlantType.emoji}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">
                        Robot actif: {currentPlantType.display_name}
                      </p>
                      <p className="text-sm text-green-600">
                        Niveau {currentPlantType.level_required} • {coinsPerMinute.toLocaleString()} pièces/min
                      </p>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>

                {/* Accumulation actuelle */}
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">Revenus Accumulés</span>
                    <span className="text-lg font-bold text-green-800">
                      {realTimeAccumulation.toLocaleString()} 🪙
                    </span>
                  </div>
                  
                  <Button 
                    onClick={collectAccumulatedCoins} 
                    disabled={isCollecting || realTimeAccumulation <= 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                  >
                    {isCollecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Collecte...
                      </>
                    ) : (
                      <>
                        <Coins className="h-4 w-4 mr-2" />
                        Collecter {realTimeAccumulation.toLocaleString()} 🪙
                      </>
                    )}
                  </Button>
                </div>

                {/* Informations sur la production */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-green-600 mb-1">Revenus/minute</p>
                    <p className="font-bold text-green-800">{coinsPerMinute.toLocaleString()} 🪙</p>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-green-600 mb-1">Revenus/heure</p>
                    <p className="font-bold text-green-800">{(coinsPerMinute * 60).toLocaleString()} 🪙</p>
                  </div>
                </div>
              </div>
            )}

            {/* Information sur l'automatisation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Automatisation Active
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                Le robot utilise automatiquement la plante correspondant à son niveau.
              </p>
              <div className="bg-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600">
                  <strong>Niveau {robotLevel}:</strong> {currentPlantType?.display_name || 'Pomme de terre'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Améliorez le robot dans l'onglet "Améliorations" pour débloquer de meilleures plantes !
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex-shrink-0 p-4 bg-white/50 border-t border-green-200">
          <Button 
            onClick={onClose}
            variant="outline" 
            className="w-full border-green-300 text-green-700 hover:bg-green-50"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};