
import { useState, useMemo } from 'react';
import { GardenPlot, PlantType } from '@/types/game';
import { PlotCard } from './PlotCard';
import { PlantSelector } from './PlantSelector';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';

interface PlotGridProps {
  plots: GardenPlot[];
  plantTypes: PlantType[];
  coins: number;
  onHarvestPlant: (plotNumber: number) => void;
  onUnlockPlot: (plotNumber: number) => void;
}

export const PlotGrid = ({ 
  plots, 
  plantTypes, 
  coins,
  onHarvestPlant, 
  onUnlockPlot 
}: PlotGridProps) => {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const { plantDirect, isPlanting } = useDirectPlanting();

  // Mémoriser les données des plantes pour éviter les recalculs
  const plantTypeMap = useMemo(() => {
    const map = new Map<string, PlantType>();
    plantTypes.forEach(pt => map.set(pt.id, pt));
    return map;
  }, [plantTypes]);

  const handlePlotClick = (plot: GardenPlot) => {
    if (!plot.unlocked) return;
    
    const hasPlant = !!plot.plant_type;
    const isReady = hasPlant && plot.planted_at && plot.growth_time_seconds
      ? Date.now() - new Date(plot.planted_at).getTime() >= (plot.growth_time_seconds * 1000)
      : false;
    
    if (!hasPlant) {
      setSelectedPlot(plot.plot_number);
      setShowPlantSelector(true);
    } else if (isReady) {
      onHarvestPlant(plot.plot_number);
    }
  };

  const handlePlantSelection = (plotNumber: number, plantTypeId: string, cost: number) => {
    plantDirect(plotNumber, plantTypeId, cost);
  };

  const handleClosePlantSelector = () => {
    setShowPlantSelector(false);
    setSelectedPlot(null);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 p-3">
        {plots.map((plot) => (
          <PlotCard
            key={plot.id}
            plot={plot}
            plantType={plantTypeMap.get(plot.plant_type || '')}
            plantTypesCount={plantTypes.length}
            coins={coins}
            isPlanting={isPlanting}
            onPlotClick={handlePlotClick}
            onUnlockPlot={onUnlockPlot}
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
};
