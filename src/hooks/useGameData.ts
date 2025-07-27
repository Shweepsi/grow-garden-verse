
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { PlantGrowthService } from '@/services/PlantGrowthService';

export const useGameData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Configuration du realtime pour garden_plots et player_gardens
  useEffect(() => {
    if (!user?.id) return;

    // Create a unique channel name to prevent conflicts
    const channelName = `garden_realtime_${user.id}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'garden_plots',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Invalider et refetch les données quand une parcelle change
          queryClient.invalidateQueries({ queryKey: ['gameData', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_gardens',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Invalider et refetch les données quand le jardin change
          queryClient.invalidateQueries({ queryKey: ['gameData', user.id] });
        }
      )
      .subscribe();

    return () => {
      // Ensure proper cleanup of the channel
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // Remove queryClient from dependencies as it's stable

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
    // Optimisation : intervalles plus fréquents pour une meilleure réactivité
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.plots) return 5000; // 5 secondes par défaut
      
      // Vérifier s'il y a des plantes qui poussent
      const growingPlants = data.plots.filter(plot => 
        plot.planted_at && 
        plot.plant_type &&
        plot.growth_time_seconds &&
        Date.now() - new Date(plot.planted_at).getTime() < (plot.growth_time_seconds * 1000)
      );
      
      // Vérifier s'il y a des plantes prêtes à être récoltées
      const hasReadyPlants = data.plots.some(plot => 
        plot.planted_at && 
        plot.plant_type &&
        plot.growth_time_seconds &&
        Date.now() - new Date(plot.planted_at).getTime() >= (plot.growth_time_seconds * 1000)
      );
      
      // Intervalles adaptatifs basés sur l'état des plantes
      if (hasReadyPlants && growingPlants.length === 0) return 10000; // 10 secondes si toutes sont prêtes
      
      if (growingPlants.length > 0) {
        const shortestGrowthTime = Math.min(
          ...growingPlants.map(plot => plot.growth_time_seconds!)
        );
        
        const shortestTimeRemaining = Math.min(
          ...growingPlants.map(plot => {
            const elapsed = (Date.now() - new Date(plot.planted_at!).getTime()) / 1000;
            return Math.max(0, plot.growth_time_seconds! - elapsed);
          })
        );
        
        // Intervalles optimisés pour la réactivité
        if (shortestGrowthTime < 60 || shortestTimeRemaining < 10) return 1000;   // 1s pour < 1min ou < 10s restantes
        if (shortestGrowthTime < 300 || shortestTimeRemaining < 60) return 2000;  // 2s pour < 5min ou < 1min restantes
        if (shortestTimeRemaining < 300) return 5000; // 5s pour < 5min restantes
        return 10000; // 10s pour le reste
      }
      
      // Pas de plantes actives, intervalles moins fréquents
      return 30000; // 30 secondes
    },
    // Optimisation : réactivité accrue
    structuralSharing: true,
    staleTime: 2000, // 2 secondes pour une réactivité maximale
    // Garder les données en cache plus longtemps
    gcTime: 300000, // 5 minutes
  });
};
