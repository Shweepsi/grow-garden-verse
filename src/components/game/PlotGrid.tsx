
import { useState, useMemo, useEffect } from 'react';
import { GardenPlot, PlantType } from '@/types/game';
import { PlotCard } from './PlotCard';
import { PlantSelector } from './PlantSelector';
import { PassiveIncomeRobot } from './PassiveIncomeRobot';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';
import { usePassiveIncomeRobot } from '@/hooks/usePassiveIncomeRobot';
import { toast } from 'sonner';

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
  const [showAutoHarvestConfig, setShowAutoHarvestConfig] = useState(false);
  const { plantDirect, isPlanting } = useDirectPlanting();
  const { 
    hasPassiveRobot, 
    robotState, 
    setRobotPlant, 
    claimOfflineRewards,
    calculateOfflineRewards,
    isSettingPlant,
    coinsPerMinute,
    currentAccumulation
  } = usePassiveIncomeRobot();

  // Mémoriser les données des plantes pour éviter les recalculs
  const plantTypeMap = useMemo(() => {
    const map = new Map<string, PlantType>();
    plantTypes.forEach(pt => map.set(pt.id, pt));
    return map;
  }, [plantTypes]);

  // Vérifier et réclamer les récompenses hors-ligne au chargement
  useEffect(() => {
    if (hasPassiveRobot && robotState?.plantType) {
      calculateOfflineRewards().then(rewards => {
        if (rewards && rewards.offlineCoins > 0) {
          claimOfflineRewards();
        }
      });
    }
  }, [hasPassiveRobot, robotState?.plantType]);

  const handlePlotClick = (plot: GardenPlot) => {
    if (!plot.unlocked) return;
    
    // Parcelle 1 avec robot passif actif
    if (plot.plot_number === 1 && hasPassiveRobot) {
      setShowAutoHarvestConfig(true);
      return;
    }
    
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

  const handleCloseAutoHarvestConfig = () => {
    setShowAutoHarvestConfig(false);
  };

  const handleSetAutoHarvestPlant = (plantTypeId: string) => {
    setRobotPlant(plantTypeId);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 p-4">
        {plots.map((plot) => {
          const plantType = plantTypeMap.get(plot.plant_type || '');
          const isAutoHarvestPlot = plot.plot_number === 1 && hasPassiveRobot;
          
          // Vérifier si le robot a atteint la limite de capacité (24h)
          const robotAtCapacity = isAutoHarvestPlot && coinsPerMinute > 0 && 
            currentAccumulation >= (coinsPerMinute * 24 * 60);
          
          return (
            <PlotCard
              key={plot.id}
              plot={plot}
              plantType={plantType}
              plantTypesCount={plantTypes.length}
              coins={coins}
              isPlanting={isPlanting || isSettingPlant}
              hasAutoHarvest={isAutoHarvestPlot}
              robotAtCapacity={robotAtCapacity}
              onPlotClick={handlePlotClick}
              onUnlockPlot={onUnlockPlot}
            />
          );
        })}
      </div>

      {/* Sélecteur de plante classique */}
      <PlantSelector
        isOpen={showPlantSelector}
        onClose={handleClosePlantSelector}
        plotNumber={selectedPlot || 1}
        plantTypes={plantTypes}
        coins={coins}
        onPlantDirect={handlePlantSelection}
      />

      {/* Configuration du robot auto-récolte */}
      <PassiveIncomeRobot
        isOpen={showAutoHarvestConfig}
        onClose={handleCloseAutoHarvestConfig}
        plantTypes={plantTypes}
        coins={coins}
        currentPlantType={robotState?.plantType}
        onSetPlant={handleSetAutoHarvestPlant}
      />
    </>
  );
};
