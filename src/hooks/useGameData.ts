
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';

export const useGameData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getCombinedBoostMultiplier } = useGameMultipliers();

  // OPTIMISATION: Réduire les invalidations automatiques pour éviter les conflits avec les mises à jour optimistes
  // Les real-time subscriptions sont désactivées car nous gérons manuellement les mises à jour via optimistic updates

  // Periodic cache cleanup to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      PlantGrowthService.cleanupCache();
    }, 300000); // Clean up every 5 minutes

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return useQuery({
    queryKey: ['gameData', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('🔄 Fetching fresh game data for user:', user.id);

      const [gardenResult, plotsResult, plantTypesResult] = await Promise.all([
        supabase.from('player_gardens').select('*').eq('user_id', user.id).single(),
        supabase.from('garden_plots').select('*').eq('user_id', user.id).order('plot_number'),
        supabase.from('plant_types').select('*')
      ]);

      const result = {
        garden: gardenResult.data,
        plots: plotsResult.data || [],
        plantTypes: plantTypesResult.data || [],
      };

      // LOG détaillé de l'état des parcelles pour debug
      console.log('📊 Game data fetched - Plots status:', 
        result.plots.map(p => ({
          plot: p.plot_number,
          unlocked: p.unlocked,
          plant_type: p.plant_type,
          planted_at: p.planted_at,
          isEmpty: p.plant_type === null && p.planted_at === null
        }))
      );

      return result;
    },
    enabled: !!user?.id,
    // PHASE 1: Smart adaptive polling with dramatic optimization
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.plots) return 30000; // 30 seconds default (increased from 10s)
      
      // Créer un objet boosts pour PlantGrowthService
      const boosts = { getBoostMultiplier: getCombinedBoostMultiplier };
      
      // Vérifier s'il y a des plantes qui poussent (en tenant compte des boosts)
      const growingPlants = data.plots.filter(plot => {
        if (!plot.planted_at || !plot.plant_type) return false;
        
        const plantType = data.plantTypes?.find(pt => pt.id === plot.plant_type);
        if (!plantType) return false;
        
        const baseGrowthTime = plantType.base_growth_seconds || 60;
        return !PlantGrowthService.isPlantReady(plot.planted_at, baseGrowthTime, boosts);
      });
      
      // PHASE 1: Dramatic polling reduction when no activity
      if (growingPlants.length === 0) {
        return 300000; // 5 minutes if no growing plants (increased from 1 min)
      }
      
      // Calculer le temps restant le plus court en tenant compte des boosts
      const shortestTimeRemaining = Math.min(
        ...growingPlants.map(plot => {
          const plantType = data.plantTypes?.find(pt => pt.id === plot.plant_type);
          if (!plantType) return Infinity;
          
          const baseGrowthTime = plantType.base_growth_seconds || 60;
          return PlantGrowthService.getTimeRemaining(plot.planted_at!, baseGrowthTime, boosts);
        }).filter(time => time !== Infinity)
      );
      
      // PHASE 1: Optimized intervals for better performance
      if (shortestTimeRemaining < 3) return 1000;    // 1s only for final 3 seconds
      if (shortestTimeRemaining < 10) return 2000;   // 2s for < 10s remaining
      if (shortestTimeRemaining < 30) return 5000;   // 5s for < 30s remaining
      if (shortestTimeRemaining < 120) return 10000; // 10s for < 2min remaining
      return 30000; // 30s for longer growth times (increased from 3s)
    },
    // PHASE 1: Ultra-reactive for rewards with dynamic stale time
    structuralSharing: true,
    staleTime: 0, // 0ms pour une réactivité instantanée après récompenses
    // Garder les données en cache plus longtemps
    gcTime: 300000, // 5 minutes
  });
};
