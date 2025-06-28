
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useGameData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gameData', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [gardenResult, plotsResult, plantTypesResult, activeEffectsResult] = await Promise.all([
        supabase.from('player_gardens').select('*').eq('user_id', user.id).single(),
        supabase.from('garden_plots').select('*').eq('user_id', user.id).order('plot_number'),
        supabase.from('plant_types').select('*'),
        supabase.from('active_effects').select('*').eq('user_id', user.id)
      ]);

      return {
        garden: gardenResult.data,
        plots: plotsResult.data || [],
        plantTypes: plantTypesResult.data || [],
        activeEffects: activeEffectsResult.data || []
      };
    },
    enabled: !!user?.id,
    // Ajuster la fréquence de rafraîchissement selon les plantes actives
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.plots) return 30000;
      
      // Vérifier s'il y a des plantes avec des temps de croissance courts
      const hasShortGrowthPlants = data.plots.some(plot => 
        plot.planted_at && 
        plot.growth_time_seconds && 
        plot.growth_time_seconds < 120 &&
        plot.plant_type // S'assurer qu'il y a bien une plante
      );
      
      // Si on a des plantes rapides, rafraîchir plus souvent
      return hasShortGrowthPlants ? 5000 : 15000;
    }
  });
};
