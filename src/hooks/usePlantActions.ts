
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { MAX_PLOTS } from '@/constants';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getCompleteMultipliers, applyAllBoosts } = useGameMultipliers();
  const { triggerCoinAnimation, triggerXpAnimation, triggerGemAnimation } = useAnimations();

  const harvestPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Validation stricte du numéro de parcelle
      if (!plotNumber || plotNumber < 1 || plotNumber > MAX_PLOTS) {
        throw new Error('Numéro de parcelle invalide');
      }

      console.log(`🌾 Début de la récolte pour la parcelle ${plotNumber}`);

      // Obtenir les multiplicateurs complets (permanents + boosts temporaires)
      let multipliers;
      try {
        multipliers = getCompleteMultipliers();
        console.log('💪 Multiplicateurs complets (permanent + boosts):', multipliers);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération des multiplicateurs, utilisation des valeurs par défaut:', error);
        multipliers = { harvest: 1, growth: 1, exp: 1, plantCostReduction: 1, gemChance: 0, coins: 1, gems: 1 };
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
        const timeString = timeRemaining > 60 
          ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s`
          : `${timeRemaining}s`;
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

      // Calculer les récompenses avec validation renforcée et tous les multiplicateurs
      const plantLevel = Math.max(1, plantType.level_required || 1);
      const baseGrowthSeconds = Math.max(1, plantType.base_growth_seconds || 60);
      const playerLevel = Math.max(1, garden.level || 1);
      const harvestMultiplier = Math.max(0.1, multipliers.harvest || 1);
      const expMultiplier = Math.max(0.1, multipliers.exp || 1);
      const plantCostReduction = Math.max(0.1, multipliers.plantCostReduction || 1);
      const gemChance = Math.max(0, multipliers.gemChance || 0);

      const harvestReward = EconomyService.getHarvestReward(
        plantLevel,
        baseGrowthSeconds,
        playerLevel,
        harvestMultiplier,
        plantCostReduction,
        garden.permanent_multiplier || 1
      );
      
      const expReward = EconomyService.getExperienceReward(plantLevel, expMultiplier);
      
      // Calculer les gemmes avec la chance d'amélioration
      let gemReward = 0;
      if (gemChance > 0) {
        const randomChance = Math.random();
        console.log(`💎 Chance de gemmes: ${(gemChance * 100).toFixed(1)}%, tirage: ${(randomChance * 100).toFixed(1)}%`);
        
        if (randomChance <= gemChance) {
          // Récompense de gemmes basée sur le niveau de la plante (1-3 gemmes)
          gemReward = Math.floor(Math.random() * Math.min(3, plantLevel)) + 1;
          console.log(`💎 Drop de gemmes réussi ! Récompense: ${gemReward} gemmes`);
        } else {
          console.log(`💎 Pas de drop de gemmes cette fois`);
        }
      }
      
      console.log(`💰 Récompenses calculées: ${harvestReward} pièces, ${expReward} EXP, ${gemReward} gemmes`);
      console.log(`🔥 Multiplicateurs appliqués - Récolte: x${harvestMultiplier}, EXP: x${expMultiplier}, Coût: x${plantCostReduction}, Gemmes: ${(gemChance * 100).toFixed(1)}%`);

      const newExp = Math.max(0, (garden.experience || 0) + expReward);
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);
      const newCoins = Math.max(0, (garden.coins || 0) + harvestReward);
      const newGems = Math.max(0, (garden.gems || 0) + gemReward);
      const newHarvests = Math.max(0, (garden.total_harvests || 0) + 1);

      // Fallback to original approach if transaction function is not available
      try {
        // Try the transaction first
        const { error: transactionError } = await supabase.rpc('harvest_plant_transaction', {
          p_user_id: user.id,
          p_plot_number: plotNumber,
          p_new_coins: newCoins,
          p_new_gems: newGems,
          p_new_exp: newExp,
          p_new_level: newLevel,
          p_new_harvests: newHarvests
        });

        if (transactionError) {
          console.warn('⚠️ Transaction function not available, using fallback approach');
          throw new Error('Transaction function not available');
        }

        console.log('✅ Récolte effectuée avec succès via transaction');
      } catch (error) {
        // Fallback to original approach
        console.log('🔄 Utilisation de l\'approche de fallback pour la récolte');
        
        // Update garden first (more critical)
        const { error: updateGardenError } = await supabase
          .from('player_gardens')
          .update({
            coins: newCoins,
            gems: newGems,
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

        // Then clear the plot
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
          // Try to revert the garden update if plot update fails
          await supabase
            .from('player_gardens')
            .update({
              coins: garden.coins,
              gems: garden.gems,
              experience: garden.experience,
              level: garden.level,
              total_harvests: garden.total_harvests,
              last_played: garden.last_played
            })
            .eq('user_id', user.id);
          throw new Error(`Erreur lors de la vidange de la parcelle: ${updatePlotError.message}`);
        }

        console.log('✅ Récolte effectuée avec succès via fallback');
      }

      console.log('🏡 Jardin mis à jour avec succès');

      // Appliquer les boosts aux récompenses pour les animations
      const boostedRewards = applyAllBoosts(harvestReward, gemReward);
      
      // Déclencher les animations de récompense avec les montants boostés
      triggerCoinAnimation(boostedRewards.coins);
      triggerXpAnimation(expReward);
      if (boostedRewards.gems > 0) {
        triggerGemAnimation(boostedRewards.gems);
      }

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

      // Messages de réussite  
      if (newLevel > (garden.level || 1)) {
        toast.success(`🎉 Niveau ${newLevel} atteint !`);
        console.log(`🔥 Nouveau niveau atteint: ${newLevel}`);
      }

      console.log('✅ Récolte terminée avec succès');
    },
    onSuccess: (_, plotNumber) => {
      // Animation de récolte subtile - léger zoom
      const plotElement = document.querySelector(`[data-plot="${plotNumber}"]`) as HTMLElement;
      if (plotElement) {
        plotElement.style.transform = 'scale(1.05)';
        plotElement.style.transition = 'transform 0.15s ease-out';
        setTimeout(() => {
          plotElement.style.transform = 'scale(1)';
          setTimeout(() => {
            plotElement.style.transform = '';
            plotElement.style.transition = '';
          }, 150);
        }, 150);
      }
      
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
