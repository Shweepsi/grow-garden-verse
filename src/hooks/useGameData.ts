
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export const useGameData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Configuration du realtime pour garden_plots
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('garden_plots_realtime')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

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
    // Optimisation : intervalles de rafraîchissement plus intelligents et rapides
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.plots) return 30000; // 30 secondes par défaut si pas de données
      
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
      
      // Si des plantes sont prêtes, rafraîchir moins souvent (elles restent prêtes)
      if (hasReadyPlants && growingPlants.length === 0) return 30000; // 30 secondes
      
      // Si des plantes poussent, adapter la fréquence selon la plus courte
      if (growingPlants.length > 0) {
        const shortestGrowthTime = Math.min(
          ...growingPlants.map(plot => plot.growth_time_seconds!)
        );
        
        // Calculer le temps restant minimum
        const shortestTimeRemaining = Math.min(
          ...growingPlants.map(plot => {
            const elapsed = (Date.now() - new Date(plot.planted_at!).getTime()) / 1000;
            return Math.max(0, plot.growth_time_seconds! - elapsed);
          })
        );
        
        // Rafraîchir très fréquemment pour les plantes courtes ou presque prêtes
        if (shortestGrowthTime < 120 || shortestTimeRemaining < 30) return 2000;  // 2s pour < 2min ou < 30s restantes
        if (shortestGrowthTime < 600 || shortestTimeRemaining < 120) return 5000; // 5s pour < 10min ou < 2min restantes
        if (shortestTimeRemaining < 300) return 10000; // 10s pour < 5min restantes
        return 15000; // 15s pour le reste
      }
      
      // Pas de plantes actives, rafraîchir rarement
      return 60000; // 1 minute
    },
    // Optimisation : éviter les re-rendus inutiles
    structuralSharing: true,
    // Réduire la fréquence de vérification des données obsolètes pour la réactivité
    staleTime: 5000, // 5 secondes pour une réactivité accrue
  });
};
