import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useAnimations } from '@/contexts/AnimationContext';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getActiveMultipliers } = useUpgrades();
  const { triggerCoinAnimation, triggerXPAnimation } = useAnimations();

  const harvestPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Validation stricte du numéro de parcelle
      if (!plotNumber || plotNumber < 1 || plotNumber > 9) {
        throw new Error('Numéro de parcelle invalide');
      }

      console.log(`🌾 Début de la récolte pour la parcelle ${plotNumber}`);

      // Obtenir les multiplicateurs actifs de manière sécurisée
      let multipliers;
      try {
        multipliers = getActiveMultipliers();
        console.log('💪 Multiplicateurs actifs:', multipliers);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération des multiplicateurs, utilisation des valeurs par défaut:', error);
        multipliers = { harvest: 1, growth: 1 };
      }

      // Obtenir les infos de la parcelle avec jointure
      const { data: plot, error: plotError } = await supabase
        .from('garden_plots')
        .select(`
          *, 
          plant_types(*)
        `)
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (plotError) {
        console.error('❌ Erreur parcelle:', plotError);
        throw new Error(`Erreur lors de la récupération de la parcelle: ${plotError.message}`);
      }
      
      if (!plot) {
        throw new Error('Parcelle non trouvée');
      }
      
      if (!plot.plant_type) {
        throw new Error('Aucune plante à récolter sur cette parcelle');
      }

      const plantType = plot.plant_types;
      if (!plantType) {
        throw new Error('Type de plante introuvable');
      }

      console.log('🌱 Plante trouvée:', plantType.display_name);
      
      // Vérification robuste de la maturité
      const growthTime = plot.growth_time_seconds || plantType.base_growth_seconds || 60;
      const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);
      
      if (!isReady) {
        const timeRemaining = PlantGrowthService.getTimeRemaining(plot.planted_at, growthTime);
        const timeString = PlantGrowthService.formatTimeRemaining(timeRemaining);
        console.log(`⏰ Plante pas encore prête, temps restant: ${timeString}`);
        throw new Error(`La plante n'est pas encore prête (${timeString} restantes)`);
      }

      console.log('✅ Plante prête pour la récolte');

      // Obtenir les données du jardin
      const { data: garden, error: gardenError } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (gardenError) {
        console.error('❌ Erreur jardin:', gardenError);
        throw new Error(`Erreur lors de la récupération du jardin: ${gardenError.message}`);
      }
      
      if (!garden) {
        throw new Error('Jardin non trouvé');
      }

      // Calculer les récompenses avec validation renforcée
      const plantLevel = Math.max(1, plantType.level_required || 1);
      const baseGrowthSeconds = Math.max(1, plantType.base_growth_seconds || 60);
      const playerLevel = Math.max(1, garden.level || 1);
      const harvestMultiplier = Math.max(0.1, multipliers.harvest || 1);

      const harvestReward = EconomyService.getHarvestReward(
        plantLevel,
        baseGrowthSeconds,
        playerLevel,
        harvestMultiplier
      );
      
      const expReward = EconomyService.getExperienceReward(plantLevel);
      
      console.log(`💰 Récompenses calculées: ${harvestReward} pièces, ${expReward} EXP`);

      const newExp = Math.max(0, (garden.experience || 0) + expReward);
      const oldLevel = Math.max(1, garden.level || 1);
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);
      const newCoins = Math.max(0, (garden.coins || 0) + harvestReward);
      const newHarvests = Math.max(0, (garden.total_harvests || 0) + 1);

      // Vider la parcelle en premier
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

      if (updatePlotError) {
        console.error('❌ Erreur mise à jour parcelle:', updatePlotError);
        throw new Error(`Erreur lors de la vidange de la parcelle: ${updatePlotError.message}`);
      }

      console.log('🧹 Parcelle vidée avec succès');

      // Mettre à jour les stats du jardin
      const { error: updateGardenError } = await supabase
        .from('player_gardens')
        .update({
          coins: newCoins,
          experience: newExp,
          level: newLevel,
          total_harvests: newHarvests,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateGardenError) {
        console.error('❌ Erreur mise à jour jardin:', updateGardenError);
        throw new Error(`Erreur lors de la mise à jour du jardin: ${updateGardenError.message}`);
      }

      console.log('🏡 Jardin mis à jour avec succès');

      // Enregistrer la transaction
      try {
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: harvestReward,
            transaction_type: 'harvest',
            description: `Récolte de ${plantType.display_name || plantType.name}`
          });
        console.log('💳 Transaction enregistrée');
      } catch (error) {
        console.warn('⚠️ Erreur lors de l\'enregistrement de la transaction:', error);
      }

      // Enregistrer la découverte
      try {
        await supabase
          .from('plant_discoveries')
          .insert({
            user_id: user.id,
            plant_type_id: plantType.id,
            discovery_method: 'harvest'
          });
        console.log('🔍 Découverte enregistrée');
      } catch (error) {
        console.warn('⚠️ Erreur lors de l\'enregistrement de la découverte:', error);
      }

      // Déclencher les animations dans le header - Gain de pièces (positif)
      triggerCoinAnimation(harvestReward);
      triggerXPAnimation(expReward);

      // Toast de niveau uniquement si montée de niveau
      if (newLevel > oldLevel) {
        toast.success(`🎉 Niveau ${newLevel} atteint !`);
        console.log(`🔥 Nouveau niveau atteint: ${newLevel}`);
      }

      console.log('✅ Récolte terminée avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      console.error('💥 Erreur lors de la récolte:', error);
      toast.error(error.message || 'Erreur lors de la récolte');
    }
  });

  return {
    harvestPlant: (plotNumber: number) => harvestPlantMutation.mutate(plotNumber),
    isHarvesting: harvestPlantMutation.isPending
  };
};
