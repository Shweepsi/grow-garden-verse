
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GameBalanceService } from '@/services/GameBalanceService';
import { PlantGrowthService } from '@/services/PlantGrowthService';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const plantSeedMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId, seedPrice }: { plotNumber: number; plantTypeId: string; seedPrice: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Vérifier les fonds
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (!garden || garden.coins < seedPrice) {
        throw new Error('Pas assez de pièces');
      }

      // Obtenir les infos de la plante
      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (!plantType) throw new Error('Type de plante non trouvé');

      // Planter la graine
      await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          planted_at: new Date().toISOString(),
          growth_time_minutes: plantType.base_growth_minutes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      // Déduire le coût
      await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - seedPrice,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -seedPrice,
          transaction_type: 'purchase',
          description: `Achat de ${plantType.display_name}`
        });

      toast.success(`${plantType.display_name} plantée ! Elle sera prête dans ${PlantGrowthService.formatTimeRemaining(plantType.base_growth_minutes || 1)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la plantation');
    }
  });

  const harvestPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Obtenir les infos de la parcelle et de la plante
      const { data: plot } = await supabase
        .from('garden_plots')
        .select(`
          *, 
          plant_types(*)
        `)
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (!plot || !plot.plant_type) throw new Error('Aucune plante à récolter');

      const plantType = plot.plant_types;
      
      // Vérifier que la plante est prête
      if (!PlantGrowthService.isPlantReady(plot.planted_at, plot.growth_time_minutes || 60)) {
        throw new Error('La plante n\'est pas encore prête');
      }

      // Obtenir les données du jardin
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Jardin non trouvé');

      // Calculer les récompenses basées sur la rareté et le niveau
      const priceRange = GameBalanceService.getSeedPriceRange(plantType.rarity || 'common');
      const estimatedSeedPrice = (priceRange.min + priceRange.max) / 2;
      
      const harvestReward = GameBalanceService.getHarvestReward(
        5, // Score fixe pour le système temps réel
        estimatedSeedPrice, 
        garden.level || 1,
        garden.permanent_multiplier || 1
      );
      
      const expReward = GameBalanceService.getExperienceReward(
        5, 
        plantType.rarity || 'common'
      );
      
      const newExp = (garden.experience || 0) + expReward;
      const newLevel = GameBalanceService.getLevelFromExperience(newExp);

      // Vider la parcelle
      await supabase
        .from('garden_plots')
        .update({
          plant_type: null,
          planted_at: null,
          growth_time_minutes: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      // Mettre à jour les stats du jardin
      await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins + harvestReward,
          experience: newExp,
          level: newLevel,
          total_harvests: (garden.total_harvests || 0) + 1,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: harvestReward,
          transaction_type: 'harvest',
          description: `Récolte de ${plantType.display_name}`
        });

      // Enregistrer la découverte
      await supabase
        .from('plant_discoveries')
        .insert({
          user_id: user.id,
          plant_type_id: plantType.id,
          discovery_method: 'harvest'
        });

      toast.success(`Récolte effectuée ! +${harvestReward} pièces, +${expReward} EXP !`);
      
      if (newLevel > (garden.level || 1)) {
        toast.success(`🎉 Niveau ${newLevel} atteint !`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la récolte');
    }
  });

  return {
    plantSeed: (plotNumber: number, plantTypeId: string, seedPrice: number) => 
      plantSeedMutation.mutate({ plotNumber, plantTypeId, seedPrice }),
    harvestPlant: (plotNumber: number) => harvestPlantMutation.mutate(plotNumber),
    isPlanting: plantSeedMutation.isPending,
    isHarvesting: harvestPlantMutation.isPending
  };
};
