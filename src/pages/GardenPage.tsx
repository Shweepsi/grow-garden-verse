
import { useEffect } from 'react';
import { GameHeader } from '@/components/garden/GameHeader';
import { PlotGrid } from '@/components/garden/PlotGrid';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { Loader2 } from 'lucide-react';

export const GardenPage = () => {
  const { 
    gameState, 
    loading, 
    harvestPlant, 
    unlockPlot 
  } = useRefactoredGame();

  useEffect(() => {
    // Réinitialiser le scroll en haut de la page
    window.scrollTo(0, 0);
    
    // Bloquer le scroll sur cette page
    document.body.style.overflow = 'hidden';
    
    // Nettoyer en quittant la page
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

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
    <div className="h-screen garden-background overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
        <GameHeader />
      </div>
      
      {/* Content with padding to avoid overlap */}
      <div className="px-3 pb-6 space-y-3 h-full overflow-y-auto">
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
