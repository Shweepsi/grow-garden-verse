
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useGameData = () => {
  const { user } = useAuth();

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
        activeEffects: [] // Tableau vide pour compatibilité
      };
    },
    enabled: !!user?.id,
    // Optimisation : intervalles de rafraîchissement plus intelligents
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.plots) return 60000; // 1 minute par défaut
      
      // Vérifier s'il y a des plantes qui poussent
      const hasGrowingPlants = data.plots.some(plot => 
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
      if (hasReadyPlants && !hasGrowingPlants) return 60000; // 1 minute
      
      // Si des plantes poussent, adapter la fréquence selon la plus courte
      if (hasGrowingPlants) {
        const shortestGrowthTime = Math.min(
          ...data.plots
            .filter(plot => plot.planted_at && plot.plant_type && plot.growth_time_seconds)
            .map(plot => plot.growth_time_seconds!)
        );
        
        // Rafraîchir plus souvent pour les plantes courtes, moins pour les longues
        if (shortestGrowthTime < 300) return 10000;  // 10s pour < 5min
        if (shortestGrowthTime < 1800) return 30000; // 30s pour < 30min
        return 60000; // 1min pour le reste
      }
      
      // Pas de plantes actives, rafraîchir rarement
      return 120000; // 2 minutes
    },
    // Optimisation : éviter les re-rendus inutiles
    structuralSharing: true,
    // Réduire la fréquence de vérification des données obsolètes
    staleTime: 30000, // 30 secondes
  });
};
