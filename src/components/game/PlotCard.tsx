
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';
import { AutoHarvestRobot } from './AutoHarvestRobot';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { GameBalanceService } from '@/services/GameBalanceService';
import { EconomyService } from '@/services/EconomyService';
import { useAutoHarvest } from '@/hooks/useAutoHarvest';

interface PlotCardProps {
  plot: GardenPlot;
  plantType?: PlantType;
  plantTypesCount: number;
  plantTypes: PlantType[];
  coins: number;
  isPlanting: boolean;
  onPlotClick: (plot: GardenPlot) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

export const PlotCard = memo(({
  plot,
  plantType,
  plantTypesCount,
  plantTypes,
  coins,
  isPlanting,
  onPlotClick,
  onUnlockPlot
}: PlotCardProps) => {
  const { hasAutoHarvest, selectedPlantType, setSelectedPlantType } = useAutoHarvest();
  
  const getPlantState = () => {
    if (!plot.plant_type) return 'empty';
    const growthTime = plot.growth_time_seconds || 3600;
    const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);
    return isReady ? 'ready' : 'growing';
  };

  const state = getPlantState();
  const unlockCost = GameBalanceService.getUnlockCost(plot.plot_number);
  const canAffordUnlock = EconomyService.canAffordUpgrade(coins, unlockCost);
  const isPlot1 = plot.plot_number === 1;

  const handleClick = () => {
    if (!isPlanting) {
      onPlotClick(plot);
    }
  };

  const handleUnlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnlockPlot(plot.plot_number);
  };

  const handleRobotPlantSelect = (plantTypeId: string) => {
    setSelectedPlantType(plantTypeId);
  };

  const selectedPlant = plantTypes.find(p => p.id === selectedPlantType);

  return (
    <div className="aspect-square relative group touch-target">
      {/* Robot de récolte automatique - affiché uniquement au-dessus de la parcelle 1 */}
      {isPlot1 && plot.unlocked && hasAutoHarvest && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20">
          <AutoHarvestRobot
            isActive={true}
            selectedPlantType={selectedPlant}
            plantTypes={plantTypes}
            coins={coins}
            onPlantSelect={handleRobotPlantSelect}
            onToggleRobot={() => {}}
          />
        </div>
      )}

      {/* Carte de la parcelle */}
      <div 
        className={`h-full cursor-pointer transition-transform duration-200 relative ${
          isPlanting ? 'pointer-events-none opacity-50' : ''
        } ${
          plot.unlocked && state === 'ready' ? 'hover:scale-105' : ''
        }`} 
        onClick={handleClick}
      >
        <div className={`premium-card rounded-xl p-2 h-full flex flex-col items-center justify-center relative overflow-hidden ${
          plot.unlocked 
            ? state === 'ready' 
              ? 'ring-2 ring-yellow-400/50 shadow-yellow-400/20 shadow-lg' 
              : 'hover:shadow-lg' 
            : 'opacity-60'
        }`}>
          
          {!plot.unlocked ? (
            <div className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center mb-2 mx-auto">
                <Lock className="h-5 w-5 text-gray-600" />
              </div>
              <p className="mobile-text-xs text-gray-500 mb-2 font-medium">Parcelle {plot.plot_number}</p>
              <Button
                size="sm"
                onClick={handleUnlockClick}
                disabled={!canAffordUnlock}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white mobile-text-xs px-2 py-1 h-auto rounded-md shadow-lg transform hover:scale-105 transition-all duration-200 touch-target disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unlockCost >= 1000000 
                  ? `${(unlockCost / 1000000).toFixed(1)}M 🪙` 
                  : unlockCost >= 1000 
                  ? `${(unlockCost / 1000).toFixed(1)}K 🪙` 
                  : `${unlockCost.toLocaleString()} 🪙`}
              </Button>
              {!canAffordUnlock && (
                <p className="mobile-text-xs text-red-500 mt-1 font-medium">
                  Garde 100🪙
                </p>
              )}
            </div>
          ) : (
            <div className="text-center h-full flex flex-col justify-center w-full">
              {state === 'empty' ? (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300">
                    <Sprout className="h-5 w-5 text-white" />
                  </div>
                  <p className="mobile-text-sm text-green-700 font-semibold mb-1">
                    {isPlot1 && hasAutoHarvest ? 'Auto-Récolte' : 'Planter'}
                  </p>
                  <p className="mobile-text-xs text-gray-600">
                    {plantTypesCount} variétés
                  </p>
                </>
              ) : (
                <>
                  {plantType ? (
                    <PlantDisplay
                      plantType={plantType}
                      plantedAt={plot.planted_at}
                      growthTimeSeconds={plot.growth_time_seconds || 3600}
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-lg mb-1">❌</div>
                      <p className="mobile-text-xs text-red-500">Plante inconnue</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {plot.unlocked && state !== 'empty' && (
            <div className="absolute top-1.5 right-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                state === 'ready' ? 'bg-yellow-400' : 'bg-blue-400'
              }`}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PlotCard.displayName = 'PlotCard';
