import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GameState, GardenPlot, PlayerGarden, PlantType } from '@/types/game';
import { toast } from 'sonner';

export const useSimpleGame = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>({
    garden: null,
    plots: [],
    plantTypes: [],
    loading: true
  });

  // Fetch game data
  const { data: gameData, isLoading } = useQuery({
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
    enabled: !!user?.id
  });

  useEffect(() => {
    if (gameData) {
      setGameState({
        garden: gameData.garden,
        plots: gameData.plots,
        plantTypes: gameData.plantTypes,
        loading: false
      });
    }
  }, [gameData]);

  // Plant seed mutation (enhanced to check inventory)
  const plantSeedMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId }: { plotNumber: number; plantTypeId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Find the plant type to get the seed name
      const plantType = gameState.plantTypes.find(pt => pt.id === plantTypeId);
      if (!plantType) throw new Error('Plant type not found');

      const seedName = `${plantType.name}_seed`;

      // Check if user has the seed in inventory
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('player_inventory_items')
        .select(`
          id,
          quantity,
          shop_item:shop_items (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('shop_items.name', seedName)
        .gt('quantity', 0)
        .single();

      if (inventoryError || !inventoryItem) {
        throw new Error('Vous n\'avez pas cette graine dans votre inventaire');
      }

      // Plant the seed
      const { error } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          plant_stage: 0,
          plant_water_count: 0,
          last_watered: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (error) throw error;

      // Decrease seed quantity
      if (inventoryItem.quantity <= 1) {
        await supabase
          .from('player_inventory_items')
          .delete()
          .eq('id', inventoryItem.id);
      } else {
        await supabase
          .from('player_inventory_items')
          .update({ quantity: inventoryItem.quantity - 1 })
          .eq('id', inventoryItem.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Graine plantée avec succès !');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la plantation');
      console.error(error);
    }
  });

  // Water plant mutation (enhanced with effects)
  const waterPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      const plot = gameState.plots.find(p => p.plot_number === plotNumber);
      if (!plot || !plot.plant_type) throw new Error('No plant to water');

      const plantType = gameState.plantTypes.find(pt => pt.id === plot.plant_type);
      if (!plantType) throw new Error('Plant type not found');

      // Check for growth boost effects
      const { data: growthBoost } = await supabase
        .from('active_effects')
        .select('*')
        .eq('user_id', user.id)
        .eq('effect_type', 'growth_boost')
        .gt('expires_at', new Date().toISOString())
        .single();

      const waterMultiplier = growthBoost ? growthBoost.effect_value : 1;
      const newWaterCount = plot.plant_water_count + (1 * waterMultiplier);
      const shouldAdvanceStage = newWaterCount >= plantType.water_per_stage;

      const { error } = await supabase
        .from('garden_plots')
        .update({
          plant_water_count: shouldAdvanceStage ? 0 : newWaterCount,
          plant_stage: shouldAdvanceStage ? Math.min(plot.plant_stage + 1, plantType.growth_stages) : plot.plant_stage,
          last_watered: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      toast.success('Plante arrosée !');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'arrosage');
      console.error(error);
    }
  });

  // Harvest plant mutation (enhanced with effects)
  const harvestPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      const plot = gameState.plots.find(p => p.plot_number === plotNumber);
      if (!plot || !plot.plant_type) throw new Error('No plant to harvest');

      const plantType = gameState.plantTypes.find(pt => pt.id === plot.plant_type);
      if (!plantType) throw new Error('Plant type not found');

      if (plot.plant_stage < plantType.growth_stages) {
        throw new Error('Plant not ready for harvest');
      }

      // Check for harvest multiplier effects
      const { data: harvestMultiplier } = await supabase
        .from('active_effects')
        .select('*')
        .eq('user_id', user.id)
        .eq('effect_type', 'harvest_multiplier')
        .gt('expires_at', new Date().toISOString())
        .single();

      const multiplier = harvestMultiplier ? harvestMultiplier.effect_value : 1;
      const harvestReward = Math.floor(plantType.growth_stages * 10 * multiplier);

      // Update plot and garden in transaction
      const { error: plotError } = await supabase
        .from('garden_plots')
        .update({
          plant_type: null,
          plant_stage: 0,
          plant_water_count: 0,
          last_watered: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (plotError) throw plotError;

      const { error: gardenError } = await supabase
        .from('player_gardens')
        .update({
          coins: (gameState.garden?.coins || 0) + harvestReward,
          total_harvests: (gameState.garden?.total_harvests || 0) + 1,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (gardenError) throw gardenError;

      // Record transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: harvestReward,
          transaction_type: 'harvest',
          description: `Récolte de ${plantType.display_name}${multiplier > 1 ? ' (bonus x' + multiplier + ')' : ''}`
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      toast.success('Récolte effectuée !');
    },
    onError: (error) => {
      toast.error('Erreur lors de la récolte');
      console.error(error);
    }
  });

  // Unlock plot mutation
  const unlockPlotMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      const unlockCosts = [0, 100, 250, 500]; // Cost for plots 1,2,3,4
      const cost = unlockCosts[plotNumber - 1] || 0;

      if ((gameState.garden?.coins || 0) < cost) {
        throw new Error('Pas assez de pièces');
      }

      // Update plot and deduct coins
      const { error: plotError } = await supabase
        .from('garden_plots')
        .update({ unlocked: true })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (plotError) throw plotError;

      const { error: gardenError } = await supabase
        .from('player_gardens')
        .update({
          coins: (gameState.garden?.coins || 0) - cost,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (gardenError) throw gardenError;

      // Record transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -cost,
          transaction_type: 'unlock',
          description: `Déblocage parcelle ${plotNumber}`
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      toast.success('Parcelle débloquée !');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors du déblocage');
      console.error(error);
    }
  });

  // Wrapper functions to handle the correct parameter format
  const plantSeed = (plotNumber: number, plantTypeId: string) => {
    plantSeedMutation.mutate({ plotNumber, plantTypeId });
  };

  const waterPlant = (plotNumber: number) => {
    waterPlantMutation.mutate(plotNumber);
  };

  const harvestPlant = (plotNumber: number) => {
    harvestPlantMutation.mutate(plotNumber);
  };

  const unlockPlot = (plotNumber: number) => {
    unlockPlotMutation.mutate(plotNumber);
  };

  return {
    gameState,
    loading: isLoading || gameState.loading,
    plantSeed,
    waterPlant,
    harvestPlant,
    unlockPlot
  };
};
