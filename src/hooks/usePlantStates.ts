import { useMemo } from 'react';
import { GardenPlot, PlantType } from '@/types/game';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { useGameMultipliers } from './useGameMultipliers';
import { useGardenClock } from '@/contexts/GardenClockContext';

export interface PlantState {
  plotNumber: number;
  status: 'empty' | 'growing' | 'ready';
  progress: number;
  isReady: boolean;
  timeRemaining?: number;
}

/**
 * Hook centralisé pour calculer l'état de toutes les plantes
 * Évite les calculs redondants en calculant tout d'un coup
 */
export const usePlantStates = (plots: GardenPlot[], plantTypes: PlantType[]) => {
  const { getCombinedBoostMultiplier } = useGameMultipliers();
  const now = useGardenClock();

  const plantTypeMap = useMemo(() => {
    return plantTypes.reduce((acc, plant) => {
      acc[plant.id] = plant;
      return acc;
    }, {} as Record<string, PlantType>);
  }, [plantTypes]);

  const plantStates = useMemo(() => {
    const boosts = { getBoostMultiplier: getCombinedBoostMultiplier };
    
    return plots.map((plot): PlantState => {
      if (!plot.unlocked || !plot.plant_type || !plot.planted_at) {
        return {
          plotNumber: plot.plot_number,
          status: 'empty',
          progress: 0,
          isReady: false
        };
      }

      const plantType = plantTypeMap[plot.plant_type];
      if (!plantType) {
        return {
          plotNumber: plot.plot_number,
          status: 'empty',
          progress: 0,
          isReady: false
        };
      }

      const baseGrowthTime = plantType.base_growth_seconds || 60;
      const progress = PlantGrowthService.calculateGrowthProgress(plot.planted_at, baseGrowthTime, boosts);
      const isReady = PlantGrowthService.isReadyToHarvest(plot.planted_at, baseGrowthTime, boosts);
      const timeRemaining = isReady ? 0 : PlantGrowthService.getTimeRemaining(plot.planted_at, baseGrowthTime, boosts);

      return {
        plotNumber: plot.plot_number,
        status: isReady ? 'ready' : 'growing',
        progress,
        isReady,
        timeRemaining
      };
    });
  }, [plots, plantTypeMap, getCombinedBoostMultiplier, now]);

  const getPlantState = (plotNumber: number): PlantState => {
    return plantStates.find(state => state.plotNumber === plotNumber) || {
      plotNumber,
      status: 'empty',
      progress: 0,
      isReady: false
    };
  };

  return {
    plantStates,
    getPlantState
  };
};