
import { GameHeader } from '@/components/game/GameHeader';
import { PlotGrid } from '@/components/game/PlotGrid';
import { useSimpleGame } from '@/hooks/useSimpleGame';
import { Loader2 } from 'lucide-react';

export const GardenPage = () => {
  const { gameState, loading, plantSeed, waterPlant, harvestPlant, unlockPlot } = useSimpleGame();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100">
      <GameHeader garden={gameState.garden} />
      
      <div className="pb-20">
        <PlotGrid
          plots={gameState.plots}
          plantTypes={gameState.plantTypes}
          coins={gameState.garden?.coins || 0}
          onPlantSeed={plantSeed}
          onWaterPlant={waterPlant}
          onHarvestPlant={harvestPlant}
          onUnlockPlot={unlockPlot}
        />
      </div>
    </div>
  );
};
