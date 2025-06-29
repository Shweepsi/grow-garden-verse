
import { GameHeader } from '@/components/game/GameHeader';
import { PlotGrid } from '@/components/game/PlotGrid';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { Loader2 } from 'lucide-react';

export const GardenPage = () => {
  const { 
    gameState, 
    loading, 
    harvestPlant, 
    unlockPlot 
  } = useRefactoredGame();

  if (loading) {
    return (
      <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen garden-background flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/20 to-transparent backdrop-blur-sm">
        <GameHeader garden={gameState.garden} />
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 space-y-3">
        {/* Garden Grid with premium styling - Optimisé mobile */}
        <PlotGrid
          plots={gameState.plots}
          plantTypes={gameState.plantTypes}
          coins={gameState.garden?.coins || 0}
          onHarvestPlant={harvestPlant}
          onUnlockPlot={unlockPlot}
        />
      </div>
    </div>
  );
};
