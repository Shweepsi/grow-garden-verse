
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useAnimations } from '@/contexts/AnimationContext';
import { usePassiveIncomeRobot } from '@/hooks/usePassiveIncomeRobot';
import { MAX_PLOTS } from '@/constants';

export const useDirectPlanting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getActiveMultipliers } = useUpgrades();
  const { triggerCoinAnimation } = useAnimations();
  const { syncRobotTimestamp, hasPassiveRobot } = usePassiveIncomeRobot();
  
  // État pour suivre les parcelles en cours de plantation (spécifique par parcelle)
  const [plantingPlots, setPlantingPlots] = useState<Set<number>>(new Set());

  const plantDirectMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId, cost }: { plotNumber: number; plantTypeId: string; cost: number }) => {
      // Ajouter la parcelle aux parcelles en cours de plantation
      setPlantingPlots(prev => new Set(prev).add(plotNumber));
      if (!user?.id) throw new Error('Not authenticated');

      // Validation stricte des paramètres
      if (!plotNumber || plotNumber < 1 || plotNumber > MAX_PLOTS) {
        throw new Error('Numéro de parcelle invalide');
      }
      
      if (!plantTypeId || !cost || cost < 0) {
        throw new Error('Paramètres de plantation invalides');
      }

      console.log(`🌱 Début de la plantation sur la parcelle ${plotNumber}`);
      console.log(`📋 Type de plante: ${plantTypeId}, Coût: ${cost}`);

      // Vérifier les fonds (sans protection des 100 pièces)
      const { data: garden, error: gardenError } = await supabase
        .from('player_gardens')
        .select('coins, level')
        .eq('user_id', user.id)
        .single();

      if (gardenError) {
        console.error('❌ Erreur récupération jardin:', gardenError);
        throw new Error('Erreur lors de la récupération des données du jardin');
      }

      if (!garden) {
        throw new Error('Jardin non trouvé');
      }

      const currentCoins = garden.coins || 0;

      // Obtenir les infos de la plante pour connaître son niveau
      const { data: plantType, error: plantError } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (plantError) {
        console.error('❌ Erreur récupération plante:', plantError);
        throw new Error('Type de plante non trouvé');
      }

      if (!plantType) {
        throw new Error('Type de plante non trouvé');
      }
      
      // Vérification simple : a-t-on assez de pièces ?
      if (!EconomyService.canAffordPlant(currentCoins, cost)) {
        throw new Error(`Pas assez de pièces (${currentCoins}/${cost})`);
      }

      console.log(`💰 Fonds suffisants: ${currentCoins} >= ${cost}`);

      // Obtenir les multiplicateurs actifs
      let multipliers;
      try {
        multipliers = getActiveMultipliers();
        console.log('💪 Multiplicateurs actifs:', multipliers);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération des multiplicateurs:', error);
        multipliers = { harvest: 1, growth: 1 };
      }

      // Vérifier que la parcelle est débloquée et vide
      const { data: plot, error: plotCheckError } = await supabase
        .from('garden_plots')
        .select('unlocked, plant_type')
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (plotCheckError) {
        console.error('❌ Erreur vérification parcelle:', plotCheckError);
        throw new Error('Erreur lors de la vérification de la parcelle');
      }

      if (!plot) {
        throw new Error('Parcelle non trouvée');
      }

      if (!plot.unlocked) {
        throw new Error('Cette parcelle n\'est pas encore débloquée');
      }

      if (plot.plant_type) {
        throw new Error('Cette parcelle contient déjà une plante');
      }

      console.log('✅ Parcelle valide et disponible');

      // Vérifier le niveau requis
      const playerLevel = garden.level || 1;
      const requiredLevel = plantType.level_required || 1;
      
      if (playerLevel < requiredLevel) {
        throw new Error(`Niveau ${requiredLevel} requis (vous êtes niveau ${playerLevel})`);
      }

      console.log(`🌱 Plante validée: ${plantType.display_name}`);

      // Calculer le temps de croissance ajusté
      const baseGrowthSeconds = Math.max(1, plantType.base_growth_seconds || 60);
      const growthMultiplier = Math.max(0.1, multipliers.growth || 1);
      const adjustedGrowthTime = EconomyService.getAdjustedGrowthTime(
        baseGrowthSeconds,
        growthMultiplier
      );

      console.log(`⏰ Temps de croissance: ${baseGrowthSeconds}s → ${adjustedGrowthTime}s (x${growthMultiplier})`);

      const now = new Date().toISOString();

      // Planter la plante
      const { error: plantError2 } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          planted_at: now,
          growth_time_seconds: adjustedGrowthTime,
          updated_at: now
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (plantError2) {
        console.error('❌ Erreur plantation:', plantError2);
        throw new Error('Erreur lors de la plantation');
      }

      console.log('🌱 Plante plantée avec succès');

      // Mettre à jour les pièces sans affecter l'accumulation du robot
      const updateData: any = {
        coins: Math.max(0, currentCoins - cost),
        last_played: now
      };

      console.log(`🌱 Plantation sans affecter l'accumulation du robot`);

      const { error: updateCoinsError } = await supabase
        .from('player_gardens')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateCoinsError) {
        console.error('❌ Erreur mise à jour pièces:', updateCoinsError);
        throw new Error('Erreur lors de la déduction du coût');
      }

      // Déclencher l'animation de déduction des pièces
      triggerCoinAnimation(-cost);

      console.log(`💰 Coût déduit: ${currentCoins} → ${Math.max(0, currentCoins - cost)}`);

      // Enregistrer la transaction
      try {
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: -cost,
            transaction_type: 'plant_direct',
            description: `Plantation directe de ${plantType.display_name}`
          });
        console.log('💳 Transaction enregistrée');
      } catch (error) {
        console.warn('⚠️ Erreur lors de l\'enregistrement de la transaction:', error);
      }

      console.log('✅ Plantation terminée avec succès');

      return { plotNumber, plantTypeId, cost, adjustedGrowthTime };
    },
    onMutate: async ({ plotNumber, plantTypeId, cost }) => {
      // Mise à jour optimiste ciblée pour une réactivité immédiate
      await queryClient.cancelQueries({ queryKey: ['gameData'] });
      
      const previousData = queryClient.getQueryData(['gameData']);
      
      // Mettre à jour uniquement la parcelle spécifique dans le cache
      queryClient.setQueryData(['gameData'], (old: any) => {
        if (!old || !old.garden || !old.plots) return old;
        
        const now = new Date().toISOString();
        const newCoins = Math.max(0, (old.garden.coins || 0) - cost);
        
        return {
          ...old,
          garden: {
            ...old.garden,
            coins: newCoins,
            last_played: now,
            robot_last_collected: old.garden.robot_last_collected
          },
          plots: old.plots.map((plot: any) => 
            plot.plot_number === plotNumber 
              ? {
                  ...plot,
                  plant_type: plantTypeId,
                  planted_at: now,
                  growth_time_seconds: 3600, // Valeur temporaire
                  updated_at: now
                }
              : plot
          )
        };
      });
      
      return { previousData };
    },
    onSuccess: (data) => {
      // Retirer la parcelle des parcelles en cours de plantation
      const { plotNumber } = data;
      setPlantingPlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(plotNumber);
        return newSet;
      });
      
      // Invalidation ciblée pour optimiser les performances
      queryClient.invalidateQueries({ 
        queryKey: ['gameData'],
        refetchType: 'active' // Ne refetch que les queries actives
      });
      
      // Feedback visuel immédiat pour la parcelle plantée
      const plotElement = document.querySelector(`[data-plot="${plotNumber}"]`) as HTMLElement;
      if (plotElement) {
        plotElement.style.transform = 'scale(1.05)';
        plotElement.style.transition = 'transform 0.2s ease-out';
        setTimeout(() => {
          plotElement.style.transform = 'scale(1)';
          setTimeout(() => {
            plotElement.style.transform = '';
            plotElement.style.transition = '';
          }, 200);
        }, 200);
      }
      
      console.log(`✅ Plantation réussie sur la parcelle ${plotNumber}`);
    },
    onError: (error: any, variables, context: any) => {
      // Retirer la parcelle des parcelles en cours de plantation en cas d'erreur
      const { plotNumber } = variables;
      setPlantingPlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(plotNumber);
        return newSet;
      });
      
      // Restaurer les données précédentes en cas d'erreur
      if (context?.previousData) {
        queryClient.setQueryData(['gameData'], context.previousData);
      }
      console.error('💥 Erreur lors de la plantation:', error);
      toast.error(error.message || 'Erreur lors de la plantation');
    }
  });

  return {
    plantDirect: (plotNumber: number, plantTypeId: string, cost: number) => 
      plantDirectMutation.mutate({ plotNumber, plantTypeId, cost }),
    isPlantingPlot: (plotNumber: number) => plantingPlots.has(plotNumber),
    isPlanting: plantDirectMutation.isPending
  };
};
