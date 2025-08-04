
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

      const [gardenResult, plotsResult, plantTypesResult] = await Promise.all([
        supabase.from('player_gardens').select('*').eq('user_id', user.id).single(),
        supabase.from('garden_plots').select('*').eq('user_id', user.id).order('plot_number'),
        supabase.from('plant_types').select('*')
      ]);

      return {
        garden: gardenResult.data,
        plots: plotsResult.data || [],
        plantTypes: plantTypesResult.data || [],
      };
    },
    enabled: !!user?.id,
    // OPTIMISATION: Polling adaptatif pour réduire les requêtes inutiles
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.plots) return 10000; // 10 secondes par défaut
      
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
      
      // OPTIMISATION: Réduire drastiquement le polling quand il n'y a pas d'activité
      if (growingPlants.length === 0) {
        return 60000; // 1 minute si aucune plante ne pousse
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
      
      // Intervalles adaptatifs mais moins agressifs
      if (shortestTimeRemaining < 5) return 1000;    // 1s pour < 5s restantes
      if (shortestTimeRemaining < 30) return 3000;   // 3s pour < 30s restantes  
      if (shortestTimeRemaining < 120) return 10000; // 10s pour < 2min restantes
      return 30000; // 30s pour le reste
    },
    // Optimisation : réactivité accrue
    structuralSharing: true,
    staleTime: 2000, // 2 secondes pour une réactivité maximale
    // Garder les données en cache plus longtemps
    gcTime: 300000, // 5 minutes
  });
};
