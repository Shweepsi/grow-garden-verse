
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GameBalanceService } from '@/services/GameBalanceService';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const plantSeedMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId }: { plotNumber: number; plantTypeId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get plant type info for growth time
      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (!plantType) throw new Error('Plant type not found');

      const seedName = `${plantType.name}_seed`;

      // Check inventory for seed
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('player_inventory_items')
        .select('id, quantity, shop_item:shop_items(name)')
        .eq('user_id', user.id)
        .eq('shop_items.name', seedName)
        .gt('quantity', 0)
        .single();

      if (inventoryError || !inventoryItem) {
        throw new Error('Vous n\'avez pas cette graine dans votre inventaire');
      }

      // Plant the seed with real-time growth
      const { error } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          plant_stage: 0,
          plant_water_count: 0,
          planted_at: new Date().toISOString(),
          growth_time_minutes: plantType.base_growth_minutes,
          last_watered: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (error) throw error;

      // Decrease seed quantity
      if (inventoryItem.quantity <= 1) {
        await supabase.from('player_inventory_items').delete().eq('id', inventoryItem.id);
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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la plantation');
    }
  });

  const waterPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current plot data
      const { data: plot } = await supabase
        .from('garden_plots')
        .select('growth_time_minutes')
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (!plot) throw new Error('Plot not found');

      // Watering reduces growth time by 10 minutes instead of advancing stages
      const newGrowthTime = Math.max(30, (plot.growth_time_minutes || 60) - 10);

      const { error } = await supabase
        .from('garden_plots')
        .update({
          growth_time_minutes: newGrowthTime,
          last_watered: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .not('plant_type', 'is', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      toast.success('Plante arrosée ! Croissance accélérée.');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de l\'arrosage');
    }
  });

  const harvestPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get plot and plant info
      const { data: plot } = await supabase
        .from('garden_plots')
        .select('*, plant_types(*)')
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (!plot || !plot.plant_type) throw new Error('No plant to harvest');

      // Get current garden data
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Garden not found');

      const plantType = plot.plant_types;
      const harvestReward = GameBalanceService.getHarvestReward(plantType.growth_stages, garden.level);
      const expReward = GameBalanceService.getExperienceReward(plantType.growth_stages);
      const newExp = garden.experience + expReward;
      const newLevel = GameBalanceService.getLevelFromExperience(newExp);

      // Clear plot
      await supabase
        .from('garden_plots')
        .update({
          plant_type: null,
          plant_stage: 0,
          plant_water_count: 0,
          planted_at: null,
          growth_time_minutes: null,
          last_watered: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      // Update garden stats - only coins and experience, no seed drops
      await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins + harvestReward,
          experience: newExp,
          level: newLevel,
          total_harvests: garden.total_harvests + 1,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Record transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: harvestReward,
          transaction_type: 'harvest',
          description: `Récolte de ${plantType.display_name}`
        });

      // Record plant discovery
      await supabase
        .from('plant_discoveries')
        .insert({
          user_id: user.id,
          plant_type_id: plantType.id,
          discovery_method: 'harvest'
        });

      toast.success(`Récolte effectuée ! +${harvestReward} pièces gagnées !`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la récolte');
    }
  });

  return {
    plantSeed: (plotNumber: number, plantTypeId: string) => 
      plantSeedMutation.mutate({ plotNumber, plantTypeId }),
    waterPlant: (plotNumber: number) => 
      waterPlantMutation.mutate(plotNumber),
    harvestPlant: (plotNumber: number) => 
      harvestPlantMutation.mutate(plotNumber),
    isPlanting: plantSeedMutation.isPending,
    isWatering: waterPlantMutation.isPending,
    isHarvesting: harvestPlantMutation.isPending
  };
};
