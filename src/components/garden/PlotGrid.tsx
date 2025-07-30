
import { useState, useMemo, useEffect, useCallback } from 'react';
import { GardenPlot, PlantType } from '@/types/game';
import { PlotCard } from './PlotCard';
import { PlantSelector } from './PlantSelector';
import { PassiveIncomeRobot } from './PassiveIncomeRobot';
import { useDirectPlanting } from '@/hooks/useDirectPlanting';
import { usePassiveIncomeRobot } from '@/hooks/usePassiveIncomeRobot';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';

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
  const [showRobotInterface, setShowRobotInterface] = useState(false);
  
  const { plantDirect, isPlantingPlot } = useDirectPlanting();
  const { getCombinedBoostMultiplier } = useGameMultipliers();
  const { 
    hasPassiveRobot, 
    robotPlantType,
    claimOfflineRewards,
    calculateOfflineRewards,
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
    if (hasPassiveRobot && robotPlantType) {
      calculateOfflineRewards().then(rewards => {
        if (rewards && rewards.offlineCoins > 0) {
          claimOfflineRewards();
        }
      });
    }
  }, [hasPassiveRobot, robotPlantType, calculateOfflineRewards, claimOfflineRewards]);

  // Optimiser le handler de clic avec useCallback
  const handlePlotClick = useCallback((plot: GardenPlot) => {
    if (!plot.unlocked) return;
    
    // Parcelle 1 avec robot passif actif
    if (plot.plot_number === 1 && hasPassiveRobot) {
      setShowRobotInterface(true);
      return;
    }
    
    const hasPlant = !!plot.plant_type;
    
    // Utiliser PlantGrowthService avec les boosts pour vérifier si la plante est prête
    let isReady = false;
    if (hasPlant && plot.planted_at) {
      const plantType = plantTypeMap.get(plot.plant_type || '');
      if (plantType) {
        const boosts = { getBoostMultiplier: getCombinedBoostMultiplier };
        const baseGrowthTime = plantType.base_growth_seconds || 60;
        
        isReady = PlantGrowthService.isPlantReady(plot.planted_at, baseGrowthTime, boosts);
      }
    }
    
    if (!hasPlant) {
      setSelectedPlot(plot.plot_number);
      setShowPlantSelector(true);
    } else if (isReady) {
      // Feedback immédiat optimiste
      onHarvestPlant(plot.plot_number);
    }
  }, [hasPassiveRobot, onHarvestPlant, plantTypeMap, getCombinedBoostMultiplier]);

  // Optimiser les handlers de sélection
  const handlePlantSelection = useCallback((plotNumber: number, plantTypeId: string, cost: number) => {
    plantDirect(plotNumber, plantTypeId, cost);
  }, [plantDirect]);

  const handleClosePlantSelector = useCallback(() => {
    setShowPlantSelector(false);
    setSelectedPlot(null);
  }, []);

  const handleCloseRobotInterface = useCallback(() => {
    setShowRobotInterface(false);
  }, []);

  // Mémoriser les données calculées pour chaque parcelle
  const plotsData = useMemo(() => {
    return plots.map((plot) => {
      const isAutoHarvestPlot = plot.plot_number === 1 && hasPassiveRobot;
      const plantType = isAutoHarvestPlot 
        ? robotPlantType 
        : plantTypeMap.get(plot.plant_type || '');
      
      // Vérifier si le robot a atteint la limite de capacité (24h)
      const robotAtCapacity = isAutoHarvestPlot && coinsPerMinute > 0 && 
        currentAccumulation >= (coinsPerMinute * 24 * 60);
      
      return {
        plot,
        plantType,
        isAutoHarvestPlot,
        robotAtCapacity
      };
    });
  }, [plots, hasPassiveRobot, robotPlantType, plantTypeMap, coinsPerMinute, currentAccumulation]);

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-4">
        {plotsData.map(({ plot, plantType, isAutoHarvestPlot, robotAtCapacity }) => (
          <PlotCard
            key={plot.id}
            plot={plot}
            plantType={plantType}
            plantTypesCount={plantTypes.length}
            coins={coins}
            isPlanting={isPlantingPlot(plot.plot_number)}
            hasAutoHarvest={isAutoHarvestPlot}
            robotAtCapacity={robotAtCapacity}
            onPlotClick={handlePlotClick}
            onUnlockPlot={onUnlockPlot}
          />
        ))}
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

      {/* Interface du robot passif */}
      <PassiveIncomeRobot
        isOpen={showRobotInterface}
        onClose={handleCloseRobotInterface}
      />
    </>
  );
};
