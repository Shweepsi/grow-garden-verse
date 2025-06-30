
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUpgrades } from '@/hooks/useUpgrades';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';
import { toast } from 'sonner';
import { useAnimations } from '@/contexts/AnimationContext';

export const useAutoHarvest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isUpgradePurchased, getActiveMultipliers } = useUpgrades();
  const { triggerCoinAnimation, triggerXpAnimation } = useAnimations();
  const [selectedPlantType, setSelectedPlantType] = useState<string | null>(null);

  // Vérifier si l'amélioration de récolte automatique est achetée
  const hasAutoHarvest = isUpgradePurchased('auto_harvest_upgrade_id'); // ID à définir dans la DB

  const autoHarvestMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedPlantType || !hasAutoHarvest) return;

      // Vérifier si la parcelle 1 a une plante prête
      const { data: plot } = await supabase
        .from('garden_plots')
        .select(`
          *, 
          plant_types(*)
        `)
        .eq('user_id', user.id)
        .eq('plot_number', 1)
        .single();

      if (!plot || !plot.plant_type || !plot.planted_at) return;

      const growthTime = plot.growth_time_seconds || plot.plant_types?.base_growth_seconds || 60;
      const isReady = PlantGrowthService.isPlantReady(plot.planted_at, growthTime);

      if (!isReady) return;

      // Récolter automatiquement
      const multipliers = getActiveMultipliers();
      const plantType = plot.plant_types;
      
      if (!plantType) return;

      // Obtenir les données du jardin
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!garden) return;

      // Calculer les récompenses
      const plantLevel = Math.max(1, plantType.level_required || 1);
      const baseGrowthSeconds = Math.max(1, plantType.base_growth_seconds || 60);
      const playerLevel = Math.max(1, garden.level || 1);
      const harvestMultiplier = Math.max(0.1, multipliers.harvest || 1);
      const expMultiplier = Math.max(0.1, multipliers.exp || 1);
      const plantCostReduction = Math.max(0.1, multipliers.plantCostReduction || 1);

      const harvestReward = EconomyService.getHarvestReward(
        plantLevel,
        baseGrowthSeconds,
        playerLevel,
        harvestMultiplier,
        plantCostReduction
      );
      
      const expReward = EconomyService.getExperienceReward(plantLevel, expMultiplier);

      const newExp = Math.max(0, (garden.experience || 0) + expReward);
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);
      const newCoins = Math.max(0, (garden.coins || 0) + harvestReward);
      const newHarvests = Math.max(0, (garden.total_harvests || 0) + 1);

      // Replanter automatiquement le même type de plante
      const plantCost = EconomyService.getPlantDirectCost(plantLevel);
      const adjustedCost = EconomyService.getAdjustedPlantCost(plantCost, plantCostReduction);

      if (newCoins >= adjustedCost + 100) { // Garder 100 pièces de réserve
        // Mettre à jour la parcelle avec la nouvelle plante
        await supabase
          .from('garden_plots')
          .update({
            plant_type: selectedPlantType,
            planted_at: new Date().toISOString(),
            growth_time_seconds: EconomyService.getAdjustedGrowthTime(
              plantType.base_growth_seconds,
              multipliers.growth
            ),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('plot_number', 1);

        // Mettre à jour le jardin (déduire le coût de replantation)
        await supabase
          .from('player_gardens')
          .update({
            coins: newCoins - adjustedCost,
            experience: newExp,
            level: newLevel,
            total_harvests: newHarvests,
            last_played: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Enregistrer la transaction
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: harvestReward - adjustedCost,
            transaction_type: 'auto_harvest',
            description: `Récolte automatique de ${plantType.display_name}`
          });
      } else {
        // Pas assez d'argent pour replanter, juste vider la parcelle
        await supabase
          .from('garden_plots')
          .update({
            plant_type: null,
            planted_at: null,
            growth_time_seconds: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('plot_number', 1);

        // Mettre à jour le jardin
        await supabase
          .from('player_gardens')
          .update({
            coins: newCoins,
            experience: newExp,
            level: newLevel,
            total_harvests: newHarvests,
            last_played: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Enregistrer la transaction
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: harvestReward,
            transaction_type: 'auto_harvest',
            description: `Récolte automatique de ${plantType.display_name}`
          });
      }

      // Déclencher les animations
      triggerCoinAnimation(harvestReward);
      triggerXpAnimation(expReward);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      console.error('Erreur récolte automatique:', error);
    }
  });

  // Vérifier automatiquement toutes les 10 secondes
  useEffect(() => {
    if (!hasAutoHarvest || !selectedPlantType) return;

    const interval = setInterval(() => {
      autoHarvestMutation.mutate();
    }, 10000); // Vérifier toutes les 10 secondes

    return () => clearInterval(interval);
  }, [hasAutoHarvest, selectedPlantType, autoHarvestMutation]);

  return {
    hasAutoHarvest,
    selectedPlantType,
    setSelectedPlantType,
    isProcessing: autoHarvestMutation.isPending
  };
};
