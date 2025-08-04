import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { MAX_PLOTS } from '@/constants';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getCompleteMultipliers, applyGemsBoost, getCombinedBoostMultiplier } = useGameMultipliers();
  const { triggerCoinAnimation, triggerXpAnimation, triggerGemAnimation } = useAnimations();

  const harvestPlantMutation = useMutation({
    mutationFn: async (plotNumber: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Validation stricte du numéro de parcelle
      if (!plotNumber || plotNumber < 1 || plotNumber > MAX_PLOTS) {
        throw new Error('Numéro de parcelle invalide');
      }

      console.log(`🌾 Début de la récolte pour la parcelle ${plotNumber}`);

      // OPTIMISATION: Obtenir les données depuis le cache d'abord
      const cachedData = queryClient.getQueryData(['gameData', user.id]) as any;
      let plot, garden, plantType;

      if (cachedData) {
        plot = cachedData.plots?.find((p: any) => p.plot_number === plotNumber);
        garden = cachedData.garden;
        plantType = cachedData.plantTypes?.find((pt: any) => pt.id === plot?.plant_type);
        
        console.log('📋 Utilisation des données en cache pour la validation rapide');
      }

      // Fallback sur les requêtes réseau si les données ne sont pas en cache
      if (!plot || !garden || !plantType) {
        console.log('🌐 Données manquantes en cache, requête réseau...');
        
        // Obtenir les infos en parallèle pour plus de rapidité
        const [plotResult, gardenResult] = await Promise.all([
          supabase
            .from('garden_plots')
            .select(`*, plant_types(*)`)
            .eq('user_id', user.id)
            .eq('plot_number', plotNumber)
            .single(),
          supabase
            .from('player_gardens')
            .select('*')
            .eq('user_id', user.id)
            .single()
        ]);

        if (plotResult.error) {
          console.error('❌ Erreur parcelle:', plotResult.error);
          throw new Error(`Erreur lors de la récupération de la parcelle: ${plotResult.error.message}`);
        }

        if (gardenResult.error) {
          console.error('❌ Erreur jardin:', gardenResult.error);
          throw new Error(`Erreur lors de la récupération du jardin: ${gardenResult.error.message}`);
        }

        plot = plotResult.data;
        garden = gardenResult.data;
        plantType = plot?.plant_types;
      }
      
      if (!plot) {
        throw new Error('Parcelle non trouvée');
      }
      
      if (!plot.plant_type) {
        throw new Error('Aucune plante à récolter sur cette parcelle');
      }

      if (!plantType) {
        throw new Error('Type de plante introuvable');
      }

      console.log('🌱 Plante trouvée:', plantType.display_name);

      // Obtenir les multiplicateurs complets (permanents + boosts temporaires)
      let multipliers;
      try {
        multipliers = getCompleteMultipliers();
        console.log('💪 Multiplicateurs complets (permanent + boosts):', multipliers);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération des multiplicateurs, utilisation des valeurs par défaut:', error);
        multipliers = { harvest: 1, growth: 1, exp: 1, plantCostReduction: 1, gemChance: 0, coins: 1, gems: 1 };
      }
      
      // Vérification robuste de la maturité avec application des boosts
      const baseGrowthTime = plantType.base_growth_seconds || 60;
      const boosts = { getBoostMultiplier: getCombinedBoostMultiplier };
      const isReady = PlantGrowthService.isPlantReady(plot.planted_at, baseGrowthTime, boosts);
      
      if (!isReady) {
        const timeRemaining = PlantGrowthService.getTimeRemaining(plot.planted_at, baseGrowthTime, boosts);
        const timeString = timeRemaining > 60 
          ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s`
          : `${timeRemaining}s`;
        console.log(`⏰ Plante pas encore prête avec boosts, temps restant: ${timeString}`);
        throw new Error(`La plante n'est pas encore prête (${timeString} restantes)`);
      }

      console.log('✅ Plante prête pour la récolte');

      // Calculer les récompenses avec validation renforcée et tous les multiplicateurs
      const plantLevel = Math.max(1, plantType.level_required || 1);
      const baseGrowthSeconds = Math.max(1, plantType.base_growth_seconds || 60);
      const playerLevel = Math.max(1, garden.level || 1);
      const harvestMultiplier = Math.max(0.1, multipliers.harvest || 1);
      const expMultiplier = Math.max(0.1, multipliers.exp || 1);
      const plantCostReduction = Math.max(0.1, multipliers.plantCostReduction || 1);
      const gemChance = Math.max(0, Math.min(1, multipliers.gemChance || 0));
      
      const harvestReward = EconomyService.getHarvestReward(
        plantType.level_required,
        baseGrowthSeconds,
        playerLevel,
        harvestMultiplier,
        plantCostReduction,
        garden.permanent_multiplier || 1
      );
      
      const expReward = EconomyService.calculateExpReward(
        plantType.level_required,
        plantType.rarity,
        expMultiplier
      );
      
      const gemReward = EconomyService.calculateGemReward(
        plantType.rarity,
        gemChance
      );

      console.log(`💰 Récompenses calculées: ${harvestReward} pièces, ${expReward} EXP, ${gemReward} gemmes`);

      const newExp = Math.max(0, (garden.experience || 0) + expReward);
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);
      const newCoins = Math.max(0, (garden.coins || 0) + harvestReward);
      const newGems = Math.max(0, (garden.gems || 0) + gemReward);
      const newHarvests = Math.max(0, (garden.total_harvests || 0) + 1);

      // Utiliser la fonction atomique SQL pour une meilleure cohérence des données
      console.log('🚀 Utilisation de la transaction atomique harvest_plant_transaction');
      
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
        console.error('❌ Erreur transaction atomique:', transactionError);
        throw new Error(`Erreur lors de la transaction: ${transactionError.message}`);
      }

      console.log('✅ Transaction atomique réussie');

      // Déclencher les animations de récompense
      triggerCoinAnimation(harvestReward);
      triggerXpAnimation(expReward);
      const boostedGems = applyGemsBoost(gemReward);
      if (boostedGems > 0) {
        triggerGemAnimation(boostedGems);
      }

      // OPTIMISATION: Batching des logs pour réduire les requêtes
      const logPromises = [];
      
      // Enregistrer la transaction
      logPromises.push(
        supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: harvestReward,
            transaction_type: 'harvest',
            description: `Récolte de ${plantType.display_name || plantType.name}`
          })
      );

      // Enregistrer la découverte
      logPromises.push(
        supabase
          .from('plant_discoveries')
          .insert({
            user_id: user.id,
            plant_type_id: plantType.id,
            discovery_method: 'harvest'
          })
      );

      // Exécuter tous les logs en parallèle (non-bloquant)
      Promise.allSettled(logPromises).catch(error => {
        console.warn('⚠️ Erreur lors de l\'enregistrement des logs:', error);
      });

      // Messages de réussite  
      if (newLevel > (garden.level || 1)) {
        toast.success(`🎉 Niveau ${newLevel} atteint !`);
        console.log(`🔥 Nouveau niveau atteint: ${newLevel}`);
      }

      console.log('✅ Récolte terminée avec succès');
      
      // Retourner les données pour la mise à jour optimiste
      return {
        plotNumber,
        newCoins,
        newGems,
        newExp,
        newLevel,
        newHarvests,
        harvestReward,
        expReward,
        gemReward: boostedGems,
        plantType
      };
    },
    onMutate: async (plotNumber: number) => {
      // OPTIMISATION CRITIQUE: Mise à jour optimiste immédiate
      await queryClient.cancelQueries({ queryKey: ['gameData', user?.id] });
      
      const previousData = queryClient.getQueryData(['gameData', user?.id]);
      
      // Mise à jour optimiste instantanée
      queryClient.setQueryData(['gameData', user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        
        const plot = oldData.plots?.find((p: any) => p.plot_number === plotNumber);
        if (!plot?.plant_type) return oldData;
        
        return {
          ...oldData,
          plots: oldData.plots.map((p: any) => 
            p.plot_number === plotNumber
              ? {
                  ...p,
                  plant_type: null,
                  planted_at: null,
                  growth_time_seconds: null,
                  updated_at: new Date().toISOString()
                }
              : p
          )
        };
      });

      // Animation de récolte immédiate
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
      
      return { previousData };
    },
    onSuccess: (data) => {
      // Mise à jour des stats du jardin après confirmation serveur
      queryClient.setQueryData(['gameData', user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          garden: {
            ...oldData.garden,
            coins: data.newCoins,
            gems: data.newGems,
            experience: data.newExp,
            level: data.newLevel,
            total_harvests: data.newHarvests
          }
        };
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousData) {
        queryClient.setQueryData(['gameData', user?.id], context.previousData);
      }
      
      console.error('💥 Erreur lors de la récolte:', error);
      toast.error(error.message || 'Erreur lors de la récolte');
    }
  });

  return {
    harvestPlant: (plotNumber: number) => harvestPlantMutation.mutate(plotNumber),
    isHarvesting: harvestPlantMutation.isPending
  };
};