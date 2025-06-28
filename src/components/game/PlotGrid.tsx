
import React, { useMemo, useCallback } from 'react';
import { PlantDisplay } from './PlantDisplay';
import { GardenPlot, PlantType } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { PlantGrowthService } from '@/services/PlantGrowthService';

interface PlotGridProps {
  plots: GardenPlot[];
  plantTypes: PlantType[];
  coins: number;
  onHarvestPlant: (plotNumber: number) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

// Mémorisation pour éviter les re-renders inutiles
export const PlotGrid = React.memo(({ 
  plots, 
  plantTypes, 
  coins, 
  onHarvestPlant, 
  onUnlockPlot 
}: PlotGridProps) => {
  
  // Mémoriser les calculs coûteux
  const plotsWithPlantInfo = useMemo(() => {
    return plots.map(plot => {
      if (!plot.plant_type) return { ...plot, plantType: null, isReady: false };
      
      const plantType = plantTypes.find(pt => pt.id === plot.plant_type);
      const growthTime = plot.growth_time_seconds || plantType?.base_growth_seconds || 60;
      const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);
      
      return {
        ...plot,
        plantType,
        isReady
      };
    });
  }, [plots, plantTypes]);

  // Mémoriser les handlers pour éviter les re-renders
  const handleHarvest = useCallback((plotNumber: number) => {
    onHarvestPlant(plotNumber);
  }, [onHarvestPlant]);

  const handleUnlock = useCallback((plotNumber: number) => {
    onUnlockPlot(plotNumber);
  }, [onUnlockPlot]);

  return (
    <div className="container mx-auto px-4 pt-24 pb-8">
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto will-change-transform">
        {plotsWithPlantInfo.map((plot) => (
          <div 
            key={plot.id} 
            className="aspect-square relative bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl border-2 border-amber-200 shadow-sm transition-all duration-200 hover:shadow-md will-change-transform"
            style={{ contain: 'layout style paint' }}
          >
            {plot.unlocked ? (
              <div className="h-full flex flex-col items-center justify-center p-2">
                {plot.plantType ? (
                  <PlantDisplay
                    plot={plot}
                    plantType={plot.plantType}
                    isReady={plot.isReady}
                    onHarvest={() => handleHarvest(plot.plot_number)}
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-2xl mb-1">🌱</div>
                    <div className="text-xs text-gray-600">Parcelle vide</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-2 opacity-50">
                <Lock className="h-6 w-6 text-gray-400 mb-1" />
                <div className="text-xs text-gray-500 text-center mb-2">
                  Parcelle #{plot.plot_number}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => handleUnlock(plot.plot_number)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Débloquer
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

PlotGrid.displayName = 'PlotGrid';
