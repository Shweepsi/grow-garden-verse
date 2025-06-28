
import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GardenPlot, PlantType } from '@/types/game';
import { Lock, Sprout, Gift } from 'lucide-react';
import { PlantDisplay } from './PlantDisplay';
import { PlantSelector } from './PlantSelector';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { GameBalanceService } from '@/services/GameBalanceService';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';

interface PlotGridProps {
  plots: GardenPlot[];
  plantTypes: PlantType[];
  coins: number;
  onHarvestPlant: (plotNumber: number) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

// Composant mémorisé pour chaque parcelle individuelle
const PlotItem = memo(({ 
  plot, 
  plantType, 
  unlockCost, 
  coins, 
  isPlanting,
  onPlotClick,
  onUnlockPlot,
  plantTypesCount 
}: {
  plot: GardenPlot;
  plantType?: PlantType;
  unlockCost: number;
  coins: number;
  isPlanting: boolean;
  onPlotClick: (plot: GardenPlot) => void;
  onUnlockPlot: (plotNumber: number) => void;
  plantTypesCount: number;
}) => {
  // Mémoriser l'état de la plante pour éviter les recalculs
  const plantState = useMemo(() => {
    if (!plot.plant_type) return 'empty';
    
    const growthTime = plot.growth_time_seconds || 3600;
    const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);
    
    return isReady ? 'ready' : 'growing';
  }, [plot.plant_type, plot.planted_at, plot.growth_time_seconds]);

  // Mémoriser le formatage du coût
  const formattedCost = useMemo(() => {
    if (unlockCost >= 1000000) return `${(unlockCost / 1000000).toFixed(1)}M 🪙`;
    if (unlockCost >= 1000) return `${(unlockCost / 1000).toFixed(1)}K 🪙`;
    return `${unlockCost.toLocaleString()} 🪙`;
  }, [unlockCost]);

  const handleClick = useCallback(() => {
    if (!isPlanting) onPlotClick(plot);
  }, [isPlanting, onPlotClick, plot]);

  const handleUnlock = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUnlockPlot(plot.plot_number);
  }, [onUnlockPlot, plot.plot_number]);

  return (
    <div
      className={`aspect-square cursor-pointer transition-all duration-300 relative group touch-target ${
        isPlanting ? 'pointer-events-none opacity-50' : ''
      }`}
      onClick={handleClick}
      style={{ willChange: 'transform' }} // GPU optimization
    >
      <div className={`premium-card rounded-xl p-2 h-full flex flex-col items-center justify-center relative overflow-hidden ${
        plot.unlocked 
          ? plantState === 'ready' 
            ? 'sparkle-border glow-effect' 
            : 'hover:shadow-2xl'
          : 'opacity-60'
      }`}>
        
        {/* Effet de brillance pour les plantes prêtes - GPU optimisé */}
        {plot.unlocked && plantState === 'ready' && (
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer"
            style={{ transform: 'translate3d(0,0,0)' }}
          ></div>
        )}
        
        {!plot.unlocked ? (
          <div className="text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Lock className="h-5 w-5 text-gray-600" />
            </div>
            <p className="mobile-text-xs text-gray-500 mb-2 font-medium">Parcelle {plot.plot_number}</p>
            <Button
              size="sm"
              onClick={handleUnlock}
              disabled={coins < unlockCost}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white mobile-text-xs px-2 py-1 h-auto rounded-md shadow-lg transform hover:scale-105 transition-all duration-200 touch-target"
            >
              {formattedCost}
            </Button>
          </div>
        ) : (
          <div className="text-center h-full flex flex-col justify-center w-full relative z-10">
            {plantState === 'empty' ? (
              <>
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Sprout className="h-5 w-5 text-white" />
                </div>
                <p className="mobile-text-sm text-green-700 font-semibold mb-1">Planter</p>
                <p className="mobile-text-xs text-gray-600">
                  {plantTypesCount} variétés
                </p>
              </>
            ) : plantState === 'growing' ? (
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
                <div className="mt-1 flex items-center justify-center">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center space-x-1 pulse-grow">
                    <Gift className="h-2.5 w-2.5" />
                    <span className="mobile-text-xs font-bold">Récolter</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Indicator for active state */}
        {plot.unlocked && plantState !== 'empty' && (
          <div className="absolute top-1.5 right-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              plantState === 'ready' 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 animate-ping' 
                : 'bg-gradient-to-r from-blue-400 to-green-500 animate-pulse'
            }`}></div>
          </div>
        )}
      </div>
    </div>
  );
});

PlotItem.displayName = 'PlotItem';

export const PlotGrid = memo(({ 
  plots, 
  plantTypes, 
  coins,
  onHarvestPlant, 
  onUnlockPlot 
}: PlotGridProps) => {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const { plantDirect, isPlanting } = useDirectPlanting();

  // Mémoriser les calculs coûteux
  const plotsWithData = useMemo(() => {
    return plots.map(plot => ({
      plot,
      plantType: plantTypes.find(pt => pt.id === plot.plant_type),
      unlockCost: GameBalanceService.getUnlockCost(plot.plot_number)
    }));
  }, [plots, plantTypes]);

  const plantTypesCount = useMemo(() => plantTypes.length, [plantTypes.length]);

  // Mémoriser les handlers pour éviter les re-renders
  const handlePlotClick = useCallback((plot: GardenPlot) => {
    if (!plot.unlocked) return;
    
    const state = !plot.plant_type ? 'empty' : 
      PlantGrowthService.isPlantReady(plot.planted_at, plot.growth_time_seconds || 3600) ? 'ready' : 'growing';
    
    if (state === 'empty') {
      setSelectedPlot(plot.plot_number);
      setShowPlantSelector(true);
    } else if (state === 'ready') {
      onHarvestPlant(plot.plot_number);
    }
  }, [onHarvestPlant]);

  const handlePlantSelection = useCallback((plotNumber: number, plantTypeId: string, cost: number) => {
    plantDirect(plotNumber, plantTypeId, cost);
  }, [plantDirect]);

  const handleClosePlantSelector = useCallback(() => {
    setShowPlantSelector(false);
    setSelectedPlot(null);
  }, []);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 p-3">
        {plotsWithData.map(({ plot, plantType, unlockCost }) => (
          <PlotItem
            key={plot.id}
            plot={plot}
            plantType={plantType}
            unlockCost={unlockCost}
            coins={coins}
            isPlanting={isPlanting}
            onPlotClick={handlePlotClick}
            onUnlockPlot={onUnlockPlot}
            plantTypesCount={plantTypesCount}
          />
        ))}
      </div>

      <PlantSelector
        isOpen={showPlantSelector}
        onClose={handleClosePlantSelector}
        plotNumber={selectedPlot || 1}
        plantTypes={plantTypes}
        coins={coins}
        onPlantDirect={handlePlantSelection}
      />
    </>
  );
});

PlotGrid.displayName = 'PlotGrid';
