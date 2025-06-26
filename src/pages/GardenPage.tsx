
import { GameHeader } from '@/components/game/GameHeader';
import { PlotGrid } from '@/components/game/PlotGrid';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { AnimationProvider, useAnimations } from '@/contexts/AnimationContext';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const GardenContent = () => {
  const { 
    gameState, 
    loading, 
    harvestPlant, 
    unlockPlot,
    harvestData
  } = useRefactoredGame();
  
  const { showCoinAnimation, showXPAnimation } = useAnimations();

  // Déclencher les animations quand harvestData change
  useEffect(() => {
    if (harvestData) {
      showCoinAnimation(harvestData.harvestReward);
      showXPAnimation(harvestData.expReward);
    }
  }, [harvestData, showCoinAnimation, showXPAnimation]);

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
    <div className="min-h-screen garden-background">
      <GameHeader garden={gameState.garden} />
      
      <div className="pb-20 space-y-3">
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

export const GardenPage = () => {
  return (
    <AnimationProvider>
      <GardenContent />
    </AnimationProvider>
  );
};
