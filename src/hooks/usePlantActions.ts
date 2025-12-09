import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useUnifiedCalculations } from '@/hooks/useUnifiedCalculations';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { useAudio } from '@/contexts/AudioContext';
import { MAX_PLOTS } from '@/constants';

export const usePlantActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const calculations = useUnifiedCalculations();
  const { applyGemsBoost } = useGameMultipliers();
  const { triggerCoinAnimation, triggerGemAnimation } = useAnimations();
  const { playSound } = useAudio();

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

      // UNIFIED VERIFICATION: Use the same logic as backend
      console.log('💪 Multiplicateurs unifiés:', calculations.multipliers);
      
      const harvestCheck = calculations.canHarvestPlant(plot);
      
      if (!harvestCheck.canHarvest) {
        if (harvestCheck.timeRemaining) {
          const timeString = harvestCheck.timeRemaining > 60 
            ? `${Math.floor(harvestCheck.timeRemaining / 60)}m ${harvestCheck.timeRemaining % 60}s`
            : `${harvestCheck.timeRemaining}s`;
          console.log(`⏰ Plante pas encore prête (unified check), temps restant: ${timeString}`);
          throw new Error(`La plante n'est pas encore prête (${timeString} restantes)`);
        }
        throw new Error(harvestCheck.reason || 'Impossible de récolter cette plante');
      }

      console.log('✅ Plante prête pour la récolte');

      // UNIFIED CALCULATIONS: Use the same service as backend
      const backendParams = calculations.createBackendParams(plot, plantType, garden);
      const boostedGems = applyGemsBoost(backendParams.gemReward);

      console.log(`💰 Récompenses calculées (unified): ${backendParams.harvestReward} pièces, ${backendParams.expReward} EXP, ${backendParams.gemReward} gemmes (${boostedGems} avec boost)`);

      // UNIFIED BACKEND CALL: Use exact same parameters
      console.log('🚀 Utilisation de la transaction atomique unified avec synchronisation parfaite');
      
      const { data: transactionResult, error: transactionError } = await supabase.rpc('harvest_plant_transaction', {
        p_user_id: user.id,
        p_plot_number: plotNumber,
        p_harvest_reward: backendParams.harvestReward,
        p_exp_reward: backendParams.expReward,
        p_gem_reward: boostedGems,
        p_growth_time_seconds: backendParams.actualGrowthTime,
        p_multipliers: calculations.multipliers as any
      });

      if (transactionError) {
        console.error('❌ Erreur transaction atomique:', transactionError);
        throw new Error(`Erreur lors de la transaction: ${transactionError.message}`);
      }

      const result = transactionResult as any;
      if (!result?.success) {
        console.error('❌ Transaction échouée:', result?.error);
        throw new Error(`Transaction échouée: ${result?.error || 'Erreur inconnue'}`);
      }

      console.log('✅ Transaction atomique réussie avec synchronisation');
      
      // Extract results for consistent level checking
      const finalLevel = result.final_level;

      // Déclencher les animations et sons de récompense de manière asynchrone
      setTimeout(() => {
        triggerCoinAnimation(result.harvest_reward);
        playSound('harvest');
        playSound('coin');
        if (result.gem_reward > 0) {
          triggerGemAnimation(result.gem_reward);
          playSound('gems');
        }
      }, 0);

      // OPTIMISATION: Batching des logs pour réduire les requêtes
      const logPromises = [];
      
      // Enregistrer la transaction
        logPromises.push(
          supabase
            .from('coin_transactions')
            .insert({
              user_id: user.id,
              amount: result.harvest_reward,
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

      // Exécuter tous les logs en parallèle et de manière asynchrone (non-bloquant)
      setTimeout(() => {
        Promise.allSettled(logPromises).catch(error => {
          console.warn('⚠️ Erreur lors de l\'enregistrement des logs:', error);
        });
      }, 0);

      // Messages de réussite  
      if (finalLevel > (garden.level || 1)) {
        console.log(`🔥 Nouveau niveau atteint: ${finalLevel}`);
      }

      console.log('✅ Récolte terminée avec succès');
      
      // Retourner les données exactes du backend pour synchronisation parfaite
      return {
        plotNumber,
        newCoins: result.final_coins,
        newGems: result.final_gems,
        newExp: result.final_experience,
        newLevel: result.final_level,
        newHarvests: result.final_harvests,
        harvestReward: result.harvest_reward,
        expReward: result.exp_reward,
        gemReward: result.gem_reward,
        plantType
      };
    },
    onMutate: async (plotNumber: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['gameData', user?.id] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['gameData', user?.id]);

      // Optimistically update the UI
      queryClient.setQueryData(['gameData', user?.id], (old: any) => {
        if (!old) return old;

        const plot = old.plots?.find((p: any) => p.plot_number === plotNumber);
        if (!plot || !plot.plant_type) return old;

        const plantType = old.plantTypes?.find((pt: any) => pt.id === plot.plant_type);
        if (!plantType) return old;

        // UNIFIED OPTIMISTIC CALCULATIONS: Use the same service
        const harvestReward = calculations.calculateHarvestReward(
          plantType.level_required,
          plot,
          old.garden?.level || 1,
          old.garden?.permanent_multiplier || 1
        );
        const expReward = calculations.calculateExpReward(plantType.level_required, plantType.rarity);
        const gemReward = 0; // Conservative: no gems in optimistic update

        return {
          ...old,
          garden: {
            ...old.garden,
            coins: (old.garden?.coins || 0) + harvestReward,
            gems: (old.garden?.gems || 0) + gemReward,
            experience: (old.garden?.experience || 0) + expReward,
            total_harvests: (old.garden?.total_harvests || 0) + 1,
          },
          plots: old.plots.map((p: any) => 
            p.plot_number === plotNumber 
              ? { ...p, plant_type: null, planted_at: null, growth_time_seconds: null }
              : p
          )
        };
      });

      // Immediate visual feedback
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
      // Selective invalidation - mark as stale but don't refetch immediately
      // The optimistic update should be mostly accurate
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['gameData', user?.id],
          refetchType: 'none' // Just mark as stale, don't refetch
        });
      }, 100);

      // Success feedback
      console.log(`🌱 ${data.plantType?.display_name || 'Plante'} récoltée! +${data.harvestReward} pièces, +${data.expReward} XP${data.gemReward > 0 ? `, +${data.gemReward} gemmes` : ''}`);
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