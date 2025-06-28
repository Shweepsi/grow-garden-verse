
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';

export const useGameData = () => {
  const { user } = useAuth();

  // Mémoriser l'état d'activation pour éviter des re-renders
  const isEnabled = useMemo(() => !!user?.id, [user?.id]);

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
    enabled: isEnabled,
    // Optimisations pour mobile - cache plus agressif
    staleTime: 30000, // Les données restent fraîches 30s
    gcTime: 300000, // Garder en cache 5 minutes
    // Polling optimisé selon l'état des plantes
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.plots) return false; // Pas de polling si pas de données
      
      // Vérifier s'il y a des plantes en croissance
      const hasGrowingPlants = data.plots.some(plot => 
        plot.planted_at && 
        plot.plant_type &&
        plot.growth_time_seconds
      );
      
      if (!hasGrowingPlants) return false; // Pas de polling si pas de plantes
      
      // Polling adaptatif selon les temps de croissance
      const hasShortGrowthPlants = data.plots.some(plot => 
        plot.planted_at && 
        plot.growth_time_seconds && 
        plot.growth_time_seconds < 120 &&
        plot.plant_type
      );
      
      // Polling moins fréquent pour économiser la batterie sur mobile
      return hasShortGrowthPlants ? 10000 : 30000; // 10s ou 30s au lieu de 5s/15s
    },
    // Éviter les requêtes en arrière-plan pour économiser la batterie
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always'
  });
};
