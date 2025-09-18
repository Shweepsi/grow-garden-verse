import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGameData } from '@/hooks/useGameData';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { useUnifiedCalculations } from '@/hooks/useUnifiedCalculations';

import { toast } from 'sonner';
import { MAX_PLOTS } from '@/constants';
import { useState, useEffect } from 'react';
import { useAnimations } from '@/contexts/AnimationContext';

export const useDirectPlanting = () => {
  const { user } = useAuth();
  const calculations = useUnifiedCalculations();
  const queryClient = useQueryClient();
  const { data: gameData } = useGameData();
  const [plantingPlotNumber, setPlantingPlotNumber] = useState<number | null>(null);
  const { triggerCoinAnimation } = useAnimations();
  const { getCompleteMultipliers } = useGameMultipliers();

  // Direct planting without cache

  const plantDirectMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId, expectedCost }: {
      plotNumber: number;
      plantTypeId: string;
      expectedCost: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      setPlantingPlotNumber(plotNumber);

      // Basic validation
      if (!plotNumber || plotNumber < 1 || plotNumber > MAX_PLOTS) {
        throw new Error('Numéro de parcelle invalide');
      }

      console.log(`🌱 Optimized direct planting on plot ${plotNumber}`);

      // Direct validation without cache
      let garden = gameData?.garden;
      let plot = gameData?.plots?.find((p: any) => p.plot_number === plotNumber);
      let plantType = gameData?.plantTypes?.find((pt: any) => pt.id === plantTypeId);

      // Only fetch from DB if cache miss or critical validation
      if (!garden || !plot || !plantType) {
        console.log('🔍 Cache miss, fetching from DB');
        const [plotResult, gardenResult, plantTypeResult] = await Promise.all([
          !plot ? supabase
            .from('garden_plots')
            .select('*')
            .eq('user_id', user.id)
            .eq('plot_number', plotNumber)
            .single() : { data: plot, error: null },
          !garden ? supabase
            .from('player_gardens')
            .select('*')
            .eq('user_id', user.id)
            .single() : { data: garden, error: null },
          !plantType ? supabase
            .from('plant_types')
            .select('*')
            .eq('id', plantTypeId)
            .single() : { data: plantType, error: null }
        ]);

        if (plotResult.error) throw new Error(`Plot error: ${plotResult.error.message}`);
        if (gardenResult.error) throw new Error(`Garden error: ${gardenResult.error.message}`);
        if (plantTypeResult.error) throw new Error('Plant type not found');

        plot = plotResult.data;
        garden = gardenResult.data;
        plantType = plantTypeResult.data;
      }

      // Quick validations
      if (!plot?.unlocked) throw new Error('Plot not unlocked');
      if (plot.plant_type || plot.planted_at) throw new Error('Plot already occupied');
      
      const playerLevel = garden.level || 1;
      const requiredLevel = plantType.level_required || 1;
      if (playerLevel < requiredLevel) throw new Error(`Level ${requiredLevel} required`);

      // Get multipliers
      const multipliers = getCompleteMultipliers();
      const baseCost = calculations.getPlantDirectCost(requiredLevel);
      const actualCost = Math.floor(baseCost * (multipliers.plantCostReduction || 1));

      // Cost validation
      if (Math.abs(actualCost - expectedCost) > 1) {
        throw new Error('Cost mismatch, please reload');
      }
      if (garden.coins < actualCost) {
        throw new Error('Insufficient coins');
      }

      const baseGrowthSeconds = plantType.base_growth_seconds || 60;

      console.log(`⚡ Using atomic DB function for plot ${plotNumber}`);
      
      // Use the new atomic function
      const { data: result, error } = await supabase.rpc('plant_direct_atomic', {
        p_user_id: user.id,
        p_plot_number: plotNumber,
        p_plant_type_id: plantTypeId,
        p_cost_amount: actualCost,
        p_base_growth_seconds: baseGrowthSeconds
      });

      if (error) {
        console.error('❌ Atomic function error:', error);
        throw new Error(`Planting failed: ${error.message}`);
      }

      // Type the result properly
      const typedResult = result as {
        success: boolean;
        error?: string;
        planted_at?: string;
        new_coin_balance?: number;
        plant_name?: string;
      };

      if (!typedResult.success) {
        throw new Error(typedResult.error || 'Planting failed');
      }

      console.log('✅ Atomic planting successful:', typedResult);
      
      // Trigger coin animation
      triggerCoinAnimation(-actualCost);
      
      return {
        plotNumber,
        plantTypeId,
        actualCost,
        adjustedGrowthTime: baseGrowthSeconds,
        plantedAt: typedResult.planted_at || new Date().toISOString(),
        newCoinBalance: typedResult.new_coin_balance || (garden.coins - actualCost)
      };
    },
    onMutate: async ({ plotNumber, plantTypeId, expectedCost }) => {
      console.log('🚀 Optimistic update enabled');
      
      // Cancel outgoing refetches so they don't override optimistic update
      await queryClient.cancelQueries({ queryKey: ['gameData', user?.id] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['gameData', user?.id]);
      
      // Optimistically update to new value
      if (previousData) {
        queryClient.setQueryData(['gameData', user?.id], (old: any) => {
          if (!old?.garden || !old?.plots) return old;
          
          const updatedPlots = old.plots.map((plot: any) => {
            if (plot.plot_number === plotNumber) {
              return {
                ...plot,
                plant_type: plantTypeId,
                planted_at: new Date().toISOString(),
                growth_time_seconds: old.plantTypes?.find((pt: any) => pt.id === plantTypeId)?.base_growth_seconds || 60,
                updated_at: new Date().toISOString()
              };
            }
            return plot;
          });
          
          return {
            ...old,
            garden: {
              ...old.garden,
              coins: old.garden.coins - expectedCost
            },
            plots: updatedPlots
          };
        });
      }
      
      return { previousData };
    },
    onSuccess: (data) => {
      // Confirmation serveur - forcer un refresh complet
      console.log('✅ Plantation confirmée par le serveur');
      
      // Invalider et refetch pour synchroniser avec la DB
      queryClient.invalidateQueries({ queryKey: ['gameData', user?.id] });
      
      // Réinitialiser l'état de plantation
      setPlantingPlotNumber(null);
    },
    onError: (error: any, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousData) {
        queryClient.setQueryData(['gameData', user?.id], context.previousData);
      }
      
      console.error('💥 Erreur lors de la plantation directe:', error);
      toast.error(error.message || 'Erreur lors de la plantation');
      
      // Réinitialiser l'état de plantation en cas d'erreur
      setPlantingPlotNumber(null);
    }
  });


  return {
    plantDirect: (plotNumber: number, plantTypeId: string, expectedCost: number) => 
      plantDirectMutation.mutate({ plotNumber, plantTypeId, expectedCost }),
    isPlanting: plantDirectMutation.isPending,
    isPlantingPlot: (plotNumber: number) => plantingPlotNumber === plotNumber,
    getActiveMultipliers: () => calculations.multipliers
  };
};