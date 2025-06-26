import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantType } from '@/types/game';
import { EconomyService } from '@/services/EconomyService';
import { useUpgrades } from './useUpgrades';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getActiveMultipliers } = useUpgrades();

  const harvestPlantMutation = useMutation({
    mutationFn: async ({ plotNumber, plantType }: { plotNumber: number; plantType: PlantType }) => {
      return harvestPlant(plotNumber, plantType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la récolte', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  const plantDirectMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId, cost }: { plotNumber: number; plantTypeId: string; cost: number }) => {
      if (!user?.id) throw new Error('Non authentifié');

      // Vérifier les fonds
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Jardin non trouvé');
      if (garden.coins < cost) throw new Error('Pas assez de pièces');

      // Planter directement
      const { error: plantError } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          planted_at: new Date().toISOString(),
          growth_time_seconds: null
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (plantError) throw plantError;

      // Déduire le coût
      const { error: gardenError } = await supabase
        .from('player_gardens')
        .update({ coins: garden.coins - cost })
        .eq('user_id', user.id);

      if (gardenError) throw gardenError;

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -cost,
          transaction_type: 'plant',
          description: `Plantation directe sur la parcelle ${plotNumber}`
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      toast.success('Plante plantée !');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la plantation', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  const harvestPlant = async (plotNumber: number, plantType: PlantType) => {
    if (!user?.id) throw new Error('Non authentifié');

    const multipliers = getActiveMultipliers();

    // Calculer les récompenses avec les multiplicateurs
    const baseCoins = EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_seconds || 60,
      1, // Niveau joueur sera récupéré du contexte si nécessaire
      multipliers.harvest
    );

    const baseExp = EconomyService.getExperienceReward(
      plantType.level_required || 1,
      multipliers.exp
    );

    // Calcul de la chance de gemmes
    const gemChance = EconomyService.getGemChance(multipliers.gemChance);
    const shouldGetGem = Math.random() < gemChance;
    const gemReward = shouldGetGem ? 1 : 0;

    // Récompenses finales
    const coinsReward = Math.max(1, baseCoins);
    const expReward = Math.max(1, baseExp);

    // Mettre à jour le jardin du joueur
    const { data: updatedGarden, error: gardenError } = await supabase
      .from('player_gardens')
      .update({
        coins: (garden?.coins || 0) + coinsReward,
        experience: (garden?.experience || 0) + expReward,
        gems: (garden?.gems || 0) + gemReward,
        total_harvests: (garden?.total_harvests || 0) + 1,
        last_played: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (gardenError) throw gardenError;

    // Réinitialiser la parcelle
    const { error: plotError } = await supabase
      .from('garden_plots')
      .update({
        plant_type: null,
        planted_at: null,
        growth_time_seconds: null
      })
      .eq('user_id', user.id)
      .eq('plot_number', plotNumber);

    if (plotError) throw plotError;

    // Enregistrer les transactions
    await supabase
      .from('coin_transactions')
      .insert([
        {
          user_id: user.id,
          amount: coinsReward,
          transaction_type: 'harvest',
          description: `Récolte de ${plantType.display_name} sur la parcelle ${plotNumber}`
        },
        {
          user_id: user.id,
          amount: gemReward,
          transaction_type: 'gem_reward',
          description: `Gemme trouvée lors de la récolte de ${plantType.display_name} sur la parcelle ${plotNumber}`
        }
      ]);

    return updatedGarden;
  };

  const onHarvest = (plotNumber: number, plantType: PlantType) => {
    harvestPlantMutation.mutate({ plotNumber, plantType });
  };

  const onPlantDirect = (plotNumber: number, plantTypeId: string, cost: number) => {
    plantDirectMutation.mutate({ plotNumber, plantTypeId, cost });
  };

  const isHarvesting = harvestPlantMutation.isPending;
  const isPlanting = plantDirectMutation.isPending;

  return {
    onHarvest,
    onPlantDirect,
    isHarvesting,
    isPlanting
  };
};
