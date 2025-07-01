import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useAnimations } from '@/contexts/AnimationContext';
import { EconomyService } from '@/services/EconomyService';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export const useAutoHarvest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playerUpgrades, getActiveMultipliers } = useUpgrades();
  const { triggerCoinAnimation, triggerXpAnimation } = useAnimations();
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offlineRewardsClaimedRef = useRef(false);

  // Vérifier si l'amélioration auto-récolte est débloquée
  const hasAutoHarvest = playerUpgrades.some(upgrade => 
    upgrade.level_upgrades?.effect_type === 'auto_harvest'
  );

  // Récupérer l'état de l'auto-récolte
  const { data: autoHarvestState } = useQuery({
    queryKey: ['autoHarvestState', user?.id],
    queryFn: async () => {
      if (!user?.id || !hasAutoHarvest) return null;

      const { data: plot } = await supabase
        .from('garden_plots')
        .select('*')
        .eq('user_id', user.id)
        .eq('plot_number', 1)
        .single();

      return plot;
    },
    enabled: !!user?.id && hasAutoHarvest
  });

  // Gestion des récompenses en temps réel
  useEffect(() => {
    if (!hasAutoHarvest || !autoHarvestState?.plant_type || !autoHarvestState?.planted_at) {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
      return;
    }

    const checkAndHarvestRealtime = async () => {
      try {
        const growthTime = autoHarvestState.growth_time_seconds || 3600;
        const isReady = PlantGrowthService.isPlantReady(autoHarvestState.planted_at, growthTime);
        
        if (isReady) {
          await processAutoHarvest();
        }
      } catch (error) {
        console.error('Erreur lors de la vérification auto-récolte:', error);
      }
    };

    // Vérifier toutes les 5 secondes si une récolte est prête
    realtimeIntervalRef.current = setInterval(checkAndHarvestRealtime, 5000);

    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
      }
    };
  }, [hasAutoHarvest, autoHarvestState?.plant_type, autoHarvestState?.planted_at, autoHarvestState?.growth_time_seconds]);

  // Traitement de l'auto-récolte
  const processAutoHarvest = async () => {
    if (!user?.id || !autoHarvestState?.plant_type) return;

    const { data: garden } = await supabase
      .from('player_gardens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!garden) return;

    const { data: plantType } = await supabase
      .from('plant_types')
      .select('*')
      .eq('id', autoHarvestState.plant_type)
      .single();

    if (!plantType) return;

    const multipliers = getActiveMultipliers();
    
    // Calculer les récompenses
    const harvestReward = EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_seconds,
      garden.level || 1,
      multipliers.harvest,
      multipliers.plantCostReduction
    );

    const expReward = EconomyService.getExperienceReward(
      plantType.level_required || 1,
      multipliers.exp
    );

    const newExp = (garden.experience || 0) + expReward;
    const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);
    const newCoins = (garden.coins || 0) + harvestReward;
    const newHarvests = (garden.total_harvests || 0) + 1;

    // Mettre à jour le jardin
    const { error: gardenError } = await supabase
      .from('player_gardens')
      .update({
        coins: newCoins,
        experience: newExp,
        level: newLevel,
        total_harvests: newHarvests,
        last_played: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (gardenError) throw gardenError;

    // Replanter immédiatement
    const { error: plotError } = await supabase
      .from('garden_plots')
      .update({
        planted_at: new Date().toISOString(),
        growth_time_seconds: EconomyService.getAdjustedGrowthTime(
          plantType.base_growth_seconds,
          multipliers.growth
        ),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('plot_number', 1);

    if (plotError) throw plotError;

    // Déclencher les animations
    triggerCoinAnimation(harvestReward);
    triggerXpAnimation(expReward);

    // Invalider les requêtes pour rafraîchir l'UI
    queryClient.invalidateQueries({ queryKey: ['gameData'] });
    queryClient.invalidateQueries({ queryKey: ['autoHarvestState'] });
};

  // Calculer les récompenses hors-ligne
  const calculateOfflineRewards = async () => {
    if (!user?.id || !hasAutoHarvest || !autoHarvestState?.plant_type) return null;

    const { data: garden } = await supabase
      .from('player_gardens')
      .select('last_played, level')
      .eq('user_id', user.id)
      .single();

    if (!garden) return null;

    const { data: plantType } = await supabase
      .from('plant_types')
      .select('*')
      .eq('id', autoHarvestState.plant_type)
      .single();

    if (!plantType) return null;

    const lastPlayed = new Date(garden.last_played).getTime();
    const now = Date.now();
    const timeOffline = now - lastPlayed;

    // Calculer le temps de croissance ajusté
    const multipliers = getActiveMultipliers();
    const adjustedGrowthTime = EconomyService.getAdjustedGrowthTime(
      plantType.base_growth_seconds, 
      multipliers.growth
    );

    // Nombre de cycles complets pendant l'absence
    const completeCycles = Math.floor(timeOffline / (adjustedGrowthTime * 1000));

    if (completeCycles <= 0) return null;

    // Calculer les récompenses pour chaque cycle
    const harvestReward = EconomyService.getHarvestReward(
      plantType.level_required || 1,
      plantType.base_growth_seconds,
      garden.level || 1,
      multipliers.harvest,
      multipliers.plantCostReduction
    );

    const expReward = EconomyService.getExperienceReward(
      plantType.level_required || 1,
      multipliers.exp
    );

    const totalCoins = harvestReward * completeCycles;
    const totalExp = expReward * completeCycles;

    return {
      cycles: completeCycles,
      totalCoins,
      totalExp,
      plantName: plantType.display_name,
      timeOffline: Math.floor(timeOffline / 1000 / 60) // en minutes
    };
  };

  // Mutation pour définir la plante d'auto-récolte
  const setAutoHarvestPlantMutation = useMutation({
    mutationFn: async (plantTypeId: string) => {
      if (!user?.id || !hasAutoHarvest) throw new Error('Auto-harvest not available');

      // Vérifier le coût de la plante
      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (!plantType) throw new Error('Plant type not found');

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, level')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Garden not found');

      const multipliers = getActiveMultipliers();
      const plantCost = EconomyService.getAdjustedPlantCost(
        EconomyService.getPlantDirectCost(plantType.level_required || 1),
        multipliers.plantCostReduction
      );

      if (!EconomyService.canAffordPlant(garden.coins, plantCost)) {
        throw new Error('Not enough coins for auto-harvest plant');
      }

      // Mettre à jour la parcelle 1 avec la plante d'auto-récolte
      const { error: plotError } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          planted_at: new Date().toISOString(),
          growth_time_seconds: EconomyService.getAdjustedGrowthTime(
            plantType.base_growth_seconds,
            multipliers.growth
          ),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('plot_number', 1);

      if (plotError) throw plotError;

      // Déduire le coût initial
      const { error: gardenError } = await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - plantCost,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (gardenError) throw gardenError;

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -plantCost,
          transaction_type: 'auto_harvest_setup',
          description: `Configuration auto-récolte: ${plantType.display_name}`
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      queryClient.invalidateQueries({ queryKey: ['autoHarvestState'] });
      toast.success('Auto-récolte configurée !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la configuration');
    }
  });

  // Mutation pour réclamer les récompenses hors-ligne
  const claimOfflineRewardsMutation = useMutation({
    mutationFn: async () => {
      const rewards = await calculateOfflineRewards();
      if (!rewards || !user?.id) return;

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Garden not found');

      const newExp = (garden.experience || 0) + rewards.totalExp;
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);
      const newCoins = (garden.coins || 0) + rewards.totalCoins;
      const newHarvests = (garden.total_harvests || 0) + rewards.cycles;

      // Mettre à jour le jardin
      const { error } = await supabase
        .from('player_gardens')
        .update({
          coins: newCoins,
          experience: newExp,
          level: newLevel,
          total_harvests: newHarvests,
          last_played: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Déclencher les animations
      triggerCoinAnimation(rewards.totalCoins);
      triggerXpAnimation(rewards.totalExp);

      return rewards;
    },
    onSuccess: (rewards) => {
      if (rewards) {
        toast.success(`🤖 Récompenses hors-ligne réclamées !`, {
          description: `${rewards.cycles} récoltes • +${rewards.totalCoins.toLocaleString()} 🪙 • +${rewards.totalExp} EXP`
        });
      }
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    }
  });

  return {
    hasAutoHarvest,
    autoHarvestState,
    setAutoHarvestPlant: (plantTypeId: string) => setAutoHarvestPlantMutation.mutate(plantTypeId),
    claimOfflineRewards: () => claimOfflineRewardsMutation.mutate(),
    calculateOfflineRewards,
    isSettingPlant: setAutoHarvestPlantMutation.isPending,
    isClaimingRewards: claimOfflineRewardsMutation.isPending
  };
};
