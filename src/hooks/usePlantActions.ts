
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';
import { useUpgrades } from '@/hooks/useUpgrades';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getActiveMultipliers } = useUpgrades();

  const harvestPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Obtenir les multiplicateurs actifs
      const multipliers = getActiveMultipliers();

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

      // Calculer les récompenses avec la nouvelle économie simplifiée
      const harvestReward = EconomyService.getHarvestReward(
        plantType.level_required || 1,
        plantType.base_growth_minutes || 60,
        garden.level || 1,
        multipliers.harvest
      );
      
      const expReward = EconomyService.getExperienceReward(
        plantType.level_required || 1
      );
      
      const newExp = (garden.experience || 0) + expReward;
      const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1; // Formule de niveau ajustée

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
    harvestPlant: (plotNumber: number) => harvestPlantMutation.mutate(plotNumber),
    isHarvesting: harvestPlantMutation.isPending
  };
};
