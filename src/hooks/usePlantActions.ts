
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GameBalanceService } from '@/services/GameBalanceService';
import { StageGrowthService } from '@/services/StageGrowthService';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // L'arrosage fait maintenant progresser d'une étape
  const waterPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Obtenir les données actuelles de la parcelle
      const { data: plot } = await supabase
        .from('garden_plots')
        .select(`
          *, 
          plant_types(*)
        `)
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (!plot || !plot.plant_type) throw new Error('Aucune plante à arroser');

      const plantType = plot.plant_types;
      const newStage = StageGrowthService.advanceStage(plot.plant_stage, plantType.growth_stages);

      // Mettre à jour l'étape de la plante
      const { error } = await supabase
        .from('garden_plots')
        .update({
          plant_stage: newStage,
          plant_water_count: plot.plant_water_count + 1,
          last_watered: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (error) throw error;

      // Vérifier si la plante est maintenant prête à récolter
      const isReady = StageGrowthService.isReadyToHarvest(newStage, plantType.growth_stages);
      
      if (isReady) {
        toast.success('🌟 Plante prête à récolter !');
      } else {
        toast.success(`Étape ${newStage}/${plantType.growth_stages} atteinte !`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error('Erreur lors de l\'arrosage');
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
      if (!StageGrowthService.isReadyToHarvest(plot.plant_stage, plantType.growth_stages)) {
        throw new Error('La plante n\'est pas encore prête');
      }

      // Obtenir les données du jardin
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Jardin non trouvé');

      // Calculer les récompenses avec le nouveau système
      // Estimer le prix de la graine basé sur la rareté
      const priceRange = GameBalanceService.getSeedPriceRange(plantType.rarity || 'common');
      const estimatedSeedPrice = (priceRange.min + priceRange.max) / 2;
      
      const harvestReward = GameBalanceService.getHarvestReward(
        plot.plant_stage, 
        estimatedSeedPrice, 
        garden.level || 1,
        garden.permanent_multiplier || 1
      );
      
      const expReward = GameBalanceService.getExperienceReward(
        plot.plant_stage, 
        plantType.rarity || 'common'
      );
      
      const newExp = (garden.experience || 0) + expReward;
      const newLevel = GameBalanceService.getLevelFromExperience(newExp);

      // Vider la parcelle
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
      toast.error('Erreur lors de la récolte');
    }
  });

  return {
    waterPlant: (plotNumber: number) => waterPlantMutation.mutate(plotNumber),
    harvestPlant: (plotNumber: number) => harvestPlantMutation.mutate(plotNumber),
    isWatering: waterPlantMutation.isPending,
    isHarvesting: harvestPlantMutation.isPending
  };
};
