import { useMemo, useCallback } from 'react';
import { GardenPlot, PlantType } from '@/types/game';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { useGardenClock } from '@/contexts/GardenClockContext';
import { PerformanceService } from '@/services/PerformanceService';

export interface PlantState {
  plotNumber: number;
  status: 'empty' | 'growing' | 'ready';
  progress: number;
  isReady: boolean;
  timeRemaining: number;
}

export const useOptimizedPlantStates = (plots: GardenPlot[], plantTypes: PlantType[]) => {
  const { getCombinedBoostMultiplier } = useGameMultipliers();
  const now = useGardenClock();

  // Memoized plant type map for O(1) lookups
  const plantTypeMap = useMemo(() => {
    const finishMeasure = PerformanceService.startRenderMeasure();
    const map = new Map<string, PlantType>();
    plantTypes.forEach(pt => map.set(pt.id, pt));
    finishMeasure();
    return map;
  }, [plantTypes]);

  // Optimized plant states calculation with smart caching
  const plantStates = useMemo(() => {
    const finishMeasure = PerformanceService.startRenderMeasure();
    
    // Use performance service cache for plant states
    const cacheKey = `plant_states_${plots.length}_${now}_${getCombinedBoostMultiplier('growth_speed')}`;
    const cached = PerformanceService.getCache<PlantState[]>(cacheKey);
    
    if (cached) {
      finishMeasure();
      return cached;
    }

    const boosts = { getBoostMultiplier: getCombinedBoostMultiplier };
    
    const states = plots.map((plot): PlantState => {
      if (!plot.unlocked) {
        return {
          plotNumber: plot.plot_number,
          status: 'empty',
          progress: 0,
          isReady: false,
          timeRemaining: 0
        };
      }

      const hasPlant = plot.plant_type && plot.planted_at;
      if (!hasPlant) {
        return {
          plotNumber: plot.plot_number,
          status: 'empty',
          progress: 0,
          isReady: false,
          timeRemaining: 0
        };
      }

      const plantType = plantTypeMap.get(plot.plant_type!);
      if (!plantType) {
        return {
          plotNumber: plot.plot_number,
          status: 'empty',
          progress: 0,
          isReady: false,
          timeRemaining: 0
        };
      }

      const growthTimeSeconds = plantType.base_growth_seconds || 60;
      
      // Use cached calculations from PlantGrowthService
      const isReady = PlantGrowthService.isPlantReady(plot.planted_at!, growthTimeSeconds, boosts);
      const progress = isReady ? 100 : PlantGrowthService.calculateGrowthProgress(plot.planted_at!, growthTimeSeconds, boosts);
      const timeRemaining = isReady ? 0 : PlantGrowthService.getTimeRemaining(plot.planted_at!, growthTimeSeconds, boosts);

      return {
        plotNumber: plot.plot_number,
        status: isReady ? 'ready' : 'growing',
        progress: Math.round(progress),
        isReady,
        timeRemaining
      };
    });

    // Cache the result with short TTL
    PerformanceService.setCache(cacheKey, states, 1000);
    finishMeasure();
    return states;
  }, [plots, plantTypeMap, now, getCombinedBoostMultiplier]);

  // Optimized getter with memoization
  const getPlantState = useCallback((plotNumber: number): PlantState => {
    const state = plantStates.find(state => state.plotNumber === plotNumber);
    return state || {
      plotNumber,
      status: 'empty',
      progress: 0,
      isReady: false,
      timeRemaining: 0
    };
  }, [plantStates]);

  // Calculate next completion time for GardenClock optimization
  const nextCompletionTime = useMemo(() => {
    const growingPlants = plantStates.filter(state => state.status === 'growing');
    if (growingPlants.length === 0) return Infinity;
    
    return Math.min(...growingPlants.map(state => state.timeRemaining));
  }, [plantStates]);

  // Check if there are active plants for GardenClock optimization
  const hasActivePlants = useMemo(() => {
    return plantStates.some(state => state.status === 'growing');
  }, [plantStates]);

  return {
    plantStates,
    getPlantState,
    nextCompletionTime,
    hasActivePlants
  };
};