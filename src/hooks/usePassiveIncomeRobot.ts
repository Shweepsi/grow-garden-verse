import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useAnimations } from '@/contexts/AnimationContext';
import { EconomyService } from '@/services/EconomyService';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export const usePassiveIncomeRobot = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playerUpgrades, getActiveMultipliers } = useUpgrades();
  const { triggerCoinAnimation } = useAnimations();
  const accumulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Vérifier si l'amélioration robot passif est débloquée
  const hasPassiveRobot = playerUpgrades.some(upgrade => 
    upgrade.level_upgrades?.effect_type === 'auto_harvest'
  );

  // Récupérer l'état du robot passif
  const { data: robotState } = useQuery({
    queryKey: ['passiveRobotState', user?.id],
    queryFn: async () => {
      if (!user?.id || !hasPassiveRobot) return null;

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('robot_plant_type, robot_last_collected, robot_accumulated_coins, robot_level')
        .eq('user_id', user.id)
        .single();

      if (!garden?.robot_plant_type) return {
        plantType: null,
        lastCollected: garden?.robot_last_collected || new Date().toISOString(),
        accumulatedCoins: garden?.robot_accumulated_coins || 0,
        robotLevel: garden?.robot_level || 1
      };

      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', garden.robot_plant_type)
        .single();

      return {
        plantType,
        lastCollected: garden.robot_last_collected,
        accumulatedCoins: garden.robot_accumulated_coins || 0,
        robotLevel: garden.robot_level || 1
      };
    },
    enabled: !!user?.id && hasPassiveRobot
  });

  // Calcul du revenu passif en temps réel
  const getCoinsPerMinute = () => {
    if (!robotState?.plantType) return 0;
    
    const multipliers = getActiveMultipliers();
    const plantLevel = robotState.plantType.level_required || 1;
    
    return EconomyService.getRobotPassiveIncome(plantLevel, multipliers.harvest);
  };

  // Gestion de l'accumulation en temps réel
  useEffect(() => {
    if (!hasPassiveRobot || !robotState?.plantType) {
      if (accumulationIntervalRef.current) {
        clearInterval(accumulationIntervalRef.current);
        accumulationIntervalRef.current = null;
      }
      return;
    }

    const updateAccumulation = async () => {
      try {
        const coinsPerMinute = getCoinsPerMinute();
        if (coinsPerMinute <= 0) return;

        const now = new Date();
        const lastCollected = new Date(robotState.lastCollected);
        const minutesElapsed = Math.floor((now.getTime() - lastCollected.getTime()) / (1000 * 60));
        
        if (minutesElapsed >= 1) {
          const newAccumulation = Math.min(
            robotState.accumulatedCoins + coinsPerMinute,
            coinsPerMinute * 24 * 60 // Maximum 24h d'accumulation
          );

          await supabase
            .from('player_gardens')
            .update({ 
              robot_accumulated_coins: newAccumulation,
              robot_last_collected: now.toISOString()
            })
            .eq('user_id', user.id);

          queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'accumulation:', error);
      }
    };

    // Mettre à jour l'accumulation toutes les minutes
    accumulationIntervalRef.current = setInterval(updateAccumulation, 60000);

    return () => {
      if (accumulationIntervalRef.current) {
        clearInterval(accumulationIntervalRef.current);
      }
    };
  }, [hasPassiveRobot, robotState?.plantType, robotState?.lastCollected, user?.id]);

  // Calcul de l'accumulation totale disponible
  const calculateCurrentAccumulation = () => {
    if (!robotState?.plantType) return 0;
    
    const coinsPerMinute = getCoinsPerMinute();
    const now = new Date();
    const lastCollected = new Date(robotState.lastCollected);
    const minutesElapsed = Math.floor((now.getTime() - lastCollected.getTime()) / (1000 * 60));
    
    const freshAccumulation = Math.min(
      minutesElapsed * coinsPerMinute,
      coinsPerMinute * 24 * 60 // Maximum 24h
    );
    
    return robotState.accumulatedCoins + freshAccumulation;
  };

  // Calculer les récompenses hors-ligne basées sur l'accumulation
  const calculateOfflineRewards = async () => {
    if (!user?.id || !hasPassiveRobot || !robotState?.plantType) return null;

    const { data: garden } = await supabase
      .from('player_gardens')
      .select('last_played, robot_last_collected')
      .eq('user_id', user.id)
      .single();

    if (!garden) return null;

    const lastPlayed = new Date(garden.last_played).getTime();
    const lastCollected = new Date(garden.robot_last_collected).getTime();
    const now = Date.now();
    
    // Prendre le plus récent entre last_played et robot_last_collected
    const startTime = Math.max(lastPlayed, lastCollected);
    const timeOffline = now - startTime;

    if (timeOffline <= 0) return null;

    const coinsPerMinute = getCoinsPerMinute();
    const minutesOffline = Math.floor(timeOffline / (1000 * 60));
    const maxMinutes = 24 * 60; // Maximum 24h d'accumulation
    
    const offlineCoins = Math.min(minutesOffline * coinsPerMinute, maxMinutes * coinsPerMinute);

    if (offlineCoins <= 0) return null;

    return {
      offlineCoins,
      minutesOffline: Math.min(minutesOffline, maxMinutes),
      plantName: robotState.plantType.display_name,
      coinsPerMinute
    };
  };

  // Mutation pour définir la plante du robot passif
  const setRobotPlantMutation = useMutation({
    mutationFn: async (plantTypeId: string) => {
      if (!user?.id || !hasPassiveRobot) throw new Error('Passive robot not available');

      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (!plantType) throw new Error('Plant type not found');

      const robotLevel = EconomyService.getRobotLevel(playerUpgrades);
      const plantLevel = plantType.level_required || 1;

      if (plantLevel > robotLevel) {
        throw new Error('Robot level too low for this plant');
      }

      const now = new Date().toISOString();

      // Mettre à jour le robot passif sans coût
      const { error: gardenError } = await supabase
        .from('player_gardens')
        .update({
          robot_plant_type: plantTypeId,
          robot_last_collected: now,
          robot_accumulated_coins: 0,
          last_played: now
        })
        .eq('user_id', user.id);

      if (gardenError) throw gardenError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
      toast.success('Robot passif configuré !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la configuration');
    }
  });

  // Mutation pour collecter les revenus accumulés
  const collectAccumulatedCoinsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !robotState) return null;

      const totalAccumulated = calculateCurrentAccumulation();
      if (totalAccumulated <= 0) return null;

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Garden not found');

      const now = new Date().toISOString();

      // Mettre à jour le jardin avec les revenus collectés
      const { error } = await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins + totalAccumulated,
          robot_accumulated_coins: 0,
          robot_last_collected: now,
          last_played: now
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: totalAccumulated,
          transaction_type: 'robot_collection',
          description: `Collecte robot passif: ${robotState.plantType?.display_name}`
        });

      return { totalAccumulated, plantName: robotState.plantType?.display_name };
    },
    onSuccess: (result) => {
      if (result) {
        triggerCoinAnimation(result.totalAccumulated);
        toast.success(`🤖 Revenus collectés !`, {
          description: `+${result.totalAccumulated.toLocaleString()} 🪙 de ${result.plantName}`
        });
      }
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la collecte');
    }
  });

  // Mutation pour réclamer les récompenses hors-ligne
  const claimOfflineRewardsMutation = useMutation({
    mutationFn: async () => {
      const rewards = await calculateOfflineRewards();
      if (!rewards || !user?.id) return null;

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, robot_accumulated_coins')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Garden not found');

      const now = new Date().toISOString();

      // Ajouter les récompenses hors-ligne à l'accumulation
      const { error } = await supabase
        .from('player_gardens')
        .update({
          robot_accumulated_coins: (garden.robot_accumulated_coins || 0) + rewards.offlineCoins,
          robot_last_collected: now,
          last_played: now
        })
        .eq('user_id', user.id);

      if (error) throw error;

      return rewards;
    },
    onSuccess: (rewards) => {
      if (rewards) {
        toast.success(`🤖 Revenus hors-ligne ajoutés !`, {
          description: `+${rewards.offlineCoins.toLocaleString()} 🪙 de ${rewards.plantName} (${rewards.minutesOffline}min)`
        });
      }
      queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la réclamation');
    }
  });

  return {
    hasPassiveRobot,
    robotState,
    coinsPerMinute: getCoinsPerMinute(),
    currentAccumulation: calculateCurrentAccumulation(),
    robotLevel: EconomyService.getRobotLevel(playerUpgrades),
    setRobotPlant: (plantTypeId: string) => setRobotPlantMutation.mutate(plantTypeId),
    collectAccumulatedCoins: () => collectAccumulatedCoinsMutation.mutate(),
    claimOfflineRewards: () => claimOfflineRewardsMutation.mutate(),
    calculateOfflineRewards,
    isSettingPlant: setRobotPlantMutation.isPending,
    isCollecting: collectAccumulatedCoinsMutation.isPending,
    isClaimingRewards: claimOfflineRewardsMutation.isPending
  };
};
