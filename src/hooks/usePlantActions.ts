
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

      // Validation du numéro de parcelle
      if (!plotNumber || plotNumber < 1 || plotNumber > 9) {
        throw new Error('Numéro de parcelle invalide');
      }

      // Obtenir les multiplicateurs actifs de manière sécurisée
      let multipliers;
      try {
        multipliers = getActiveMultipliers();
      } catch (error) {
        console.warn('Erreur lors de la récupération des multiplicateurs, utilisation des valeurs par défaut:', error);
        multipliers = { harvest: 1, growth: 1 };
      }

      // Obtenir les infos de la parcelle et de la plante
      const { data: plot, error: plotError } = await supabase
        .from('garden_plots')
        .select(`
          *, 
          plant_types(*)
        `)
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (plotError) throw new Error(`Erreur lors de la récupération de la parcelle: ${plotError.message}`);
      if (!plot || !plot.plant_type) throw new Error('Aucune plante à récolter');

      const plantType = plot.plant_types;
      if (!plantType) throw new Error('Type de plante introuvable');
      
      // Vérifier que la plante est prête avec validation renforcée
      const isReady = PlantGrowthService.isPlantReady(plot.planted_at, plot.growth_time_seconds || 3600);
      if (!isReady) {
        const timeRemaining = PlantGrowthService.getTimeRemaining(plot.planted_at, plot.growth_time_seconds || 3600);
        throw new Error(`La plante n'est pas encore prête (${PlantGrowthService.formatTimeRemaining(timeRemaining)} restantes)`);
      }

      // Obtenir les données du jardin
      const { data: garden, error: gardenError } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (gardenError) throw new Error(`Erreur lors de la récupération du jardin: ${gardenError.message}`);
      if (!garden) throw new Error('Jardin non trouvé');

      // Calculer les récompenses avec validation
      const harvestReward = EconomyService.getHarvestReward(
        plantType.level_required || 1,
        plantType.base_growth_seconds || 60,
        garden.level || 1,
        multipliers.harvest
      );
      
      const expReward = EconomyService.getExperienceReward(
        plantType.level_required || 1
      );
      
      const newExp = (garden.experience || 0) + expReward;
      const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1;

      // Vider la parcelle
      const { error: updatePlotError } = await supabase
        .from('garden_plots')
        .update({
          plant_type: null,
          planted_at: null,
          growth_time_seconds: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (updatePlotError) throw new Error(`Erreur lors de la vidange de la parcelle: ${updatePlotError.message}`);

      // Mettre à jour les stats du jardin
      const { error: updateGardenError } = await supabase
        .from('player_gardens')
        .update({
          coins: Math.max(0, garden.coins + harvestReward),
          experience: Math.max(0, newExp),
          level: Math.max(1, newLevel),
          total_harvests: Math.max(0, (garden.total_harvests || 0) + 1),
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateGardenError) throw new Error(`Erreur lors de la mise à jour du jardin: ${updateGardenError.message}`);

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: harvestReward,
          transaction_type: 'harvest',
          description: `Récolte de ${plantType.display_name || plantType.name}`
        });

      // Enregistrer la découverte
      await supabase
        .from('plant_discoveries')
        .insert({
          user_id: user.id,
          plant_type_id: plantType.id,
          discovery_method: 'harvest'
        });

      toast.success(`Récolte effectuée ! +${harvestReward.toLocaleString()} pièces, +${expReward} EXP !`);
      
      if (newLevel > (garden.level || 1)) {
        toast.success(`🎉 Niveau ${newLevel} atteint !`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      console.error('Erreur lors de la récolte:', error);
      toast.error(error.message || 'Erreur lors de la récolte');
    }
  });

  return {
    harvestPlant: (plotNumber: number) => harvestPlantMutation.mutate(plotNumber),
    isHarvesting: harvestPlantMutation.isPending
  };
};
