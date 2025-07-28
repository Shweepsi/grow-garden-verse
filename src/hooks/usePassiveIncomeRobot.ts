import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameData } from '@/hooks/useGameData';
import { EconomyService } from '@/services/EconomyService';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export const usePassiveIncomeRobot = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getCompleteMultipliers } = useGameMultipliers();
  const { data: gameData } = useGameData();
  const { triggerCoinAnimation } = useAnimations();
  const accumulationIntervalRef = useRef<number | null>(null);

  // Récupérer les améliorations du joueur
  const { data: playerUpgrades = [] } = useQuery({
    queryKey: ['playerUpgrades', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('player_upgrades')
        .select(`
          *,
          level_upgrades(*)
        `)
        .eq('user_id', user.id)
        .eq('active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Vérifier si l'amélioration robot passif est débloquée
  const hasPassiveRobot = playerUpgrades.some(upgrade => 
    upgrade.level_upgrades?.effect_type === 'auto_harvest'
  );

  // Calculer le niveau du robot et la plante correspondante
  const robotLevel = EconomyService.getRobotLevel(playerUpgrades);
  const robotPlantLevel = EconomyService.getRobotPlantLevel(robotLevel);

  // Récupérer la plante correspondant au niveau du robot
  const { data: robotPlantType } = useQuery({
    queryKey: ['robotPlantType', robotPlantLevel],
    queryFn: async () => {
      const { data: plantType } = await supabase
        .from('plant_types')
        .select('*')
        .eq('level_required', robotPlantLevel)
        .maybeSingle();

      return plantType;
    },
    enabled: hasPassiveRobot && robotPlantLevel > 0
  });

  // Récupérer l'état du robot passif
  const { data: robotState } = useQuery({
    queryKey: ['passiveRobotState', user?.id],
    queryFn: async () => {
      if (!user?.id || !hasPassiveRobot) return null;

      const { data: garden } = await supabase
        .from('player_gardens')
        .select('robot_last_collected, robot_accumulated_coins')
        .eq('user_id', user.id)
        .single();

      return {
        lastCollected: garden?.robot_last_collected || new Date().toISOString(),
        accumulatedCoins: garden?.robot_accumulated_coins || 0,
        robotLevel
      };
    },
    enabled: !!user?.id && hasPassiveRobot
  });

  // Calcul du revenu passif en temps réel
  const getCoinsPerMinute = () => {
    if (!hasPassiveRobot || !robotPlantType) return 0;
    
    const multipliers = getCompleteMultipliers();
    const permanentMultiplier = gameData?.garden?.permanent_multiplier || 1;
    
    return EconomyService.getRobotPassiveIncome(robotLevel, multipliers.harvest, permanentMultiplier);
  };

  // Gestion de l'accumulation en temps réel
  useEffect(() => {
    if (!hasPassiveRobot || !robotPlantType || !robotState) {
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
        
        // Récupérer l'état actuel depuis la base de données pour éviter les désynchronisations
        const { data: currentGarden } = await supabase
          .from('player_gardens')
          .select('robot_last_collected, robot_accumulated_coins')
          .eq('user_id', user.id)
          .single();
          
        if (!currentGarden) return;
        
        const lastCollected = new Date(currentGarden.robot_last_collected);
        const minutesElapsed = Math.floor((now.getTime() - lastCollected.getTime()) / (1000 * 60));
        
        // Vérification de sécurité : pas plus de 24h d'accumulation
        const maxMinutes = 24 * 60;
        const safeMinutesElapsed = Math.min(minutesElapsed, maxMinutes);
        
        if (safeMinutesElapsed >= 1) {
          // Calculer UNIQUEMENT les nouvelles pièces depuis la dernière mise à jour
          const newCoins = safeMinutesElapsed * coinsPerMinute;
          const maxAccumulation = coinsPerMinute * maxMinutes;
          
          // L'accumulation totale ne doit pas dépasser 24h de production
          const newAccumulation = Math.min(newCoins, maxAccumulation);

          console.log(`🤖 Robot accumulation update: ${safeMinutesElapsed}min × ${coinsPerMinute} = ${newAccumulation} coins (total stocké)`);

          // Mettre à jour l'accumulation ET le timestamp pour éviter les doubles calculs
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
    updateAccumulation(); // Appel initial
    accumulationIntervalRef.current = window.setInterval(updateAccumulation, 60000);

    return () => {
      if (accumulationIntervalRef.current) {
        clearInterval(accumulationIntervalRef.current);
      }
    };
  }, [hasPassiveRobot, robotPlantType, robotState?.lastCollected, user?.id, queryClient, getCoinsPerMinute]);

  // Calcul de l'accumulation totale disponible (corrigé pour éviter le double calcul)
  const calculateCurrentAccumulation = () => {
    if (!robotState || !robotPlantType) return 0;
    
    // Utiliser directement l'accumulation stockée dans la base de données
    // L'accumulation est mise à jour toutes les minutes par updateAccumulation
    return robotState.accumulatedCoins || 0;
  };

  // Calculer les récompenses hors-ligne basées sur l'accumulation
  const calculateOfflineRewards = async () => {
    if (!user?.id || !hasPassiveRobot || !robotPlantType) return null;

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
    const safeMinutesOffline = Math.min(minutesOffline, maxMinutes);
    
    const offlineCoins = safeMinutesOffline * coinsPerMinute;

    if (offlineCoins <= 0) return null;

    console.log(`🤖 Récompenses hors-ligne: ${safeMinutesOffline}min × ${coinsPerMinute} = ${offlineCoins} coins`);

    return {
      offlineCoins,
      minutesOffline: safeMinutesOffline,
      plantName: robotPlantType.display_name,
      coinsPerMinute
    };
  };

  // Mutation pour collecter les revenus accumulés
  const collectAccumulatedCoinsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !robotState) return null;

      // Récupérer l'accumulation actuelle depuis la base de données
      const { data: currentGarden } = await supabase
        .from('player_gardens')
        .select('coins, experience, level, robot_accumulated_coins')
        .eq('user_id', user.id)
        .single();

      if (!currentGarden) throw new Error('Garden not found');
      
      const totalAccumulated = currentGarden.robot_accumulated_coins || 0;
      if (totalAccumulated <= 0) return null;

      // Calculer l'expérience basée sur le niveau du robot et le montant collecté
      const baseExp = Math.floor(totalAccumulated / 100); // 1 EXP par 100 pièces collectées
      const levelBonus = robotLevel * 2; // 2 EXP bonus par niveau du robot
      const expReward = Math.max(1, baseExp + levelBonus); // Minimum 1 EXP

      const currentExp = currentGarden.experience || 0;
      const newExp = currentExp + expReward;
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);

      const now = new Date().toISOString();

      // Mettre à jour le jardin avec les revenus collectés et l'expérience
      const { error } = await supabase
        .from('player_gardens')
        .update({
          coins: currentGarden.coins + totalAccumulated,
          experience: newExp,
          level: newLevel,
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
          description: `Collecte robot passif: ${robotPlantType?.display_name} (+${expReward} EXP)`
        });

      console.log(`🤖 Collecte réussie: ${totalAccumulated} coins + ${expReward} EXP`);

      return { totalAccumulated, expReward, plantName: robotPlantType?.display_name };
    },
    onSuccess: (result) => {
      if (result) {
        triggerCoinAnimation(result.totalAccumulated);
        toast.success(`🤖 Revenus collectés !`, {
          description: `+${result.totalAccumulated.toLocaleString()} 🪙 + ${result.expReward} EXP de ${result.plantName}`
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
        .select('robot_accumulated_coins')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Garden not found');

      const now = new Date().toISOString();

      // Ajouter les récompenses hors-ligne à l'accumulation (avec limite de sécurité)
      const maxAccumulation = getCoinsPerMinute() * 24 * 60;
      const newAccumulation = Math.min(
        (garden.robot_accumulated_coins || 0) + rewards.offlineCoins,
        maxAccumulation
      );

      const { error } = await supabase
        .from('player_gardens')
        .update({
          robot_accumulated_coins: newAccumulation,
          robot_last_collected: now,
          last_played: now
        })
        .eq('user_id', user.id);

      if (error) throw error;

      return rewards;
    },
    onSuccess: (rewards) => {
      queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la réclamation');
    }
  });

  // Fonction utilitaire pour synchroniser robot_last_collected UNIQUEMENT lors de la collecte
  const syncRobotTimestamp = async () => {
    if (!user?.id || !hasPassiveRobot) return;
    
    const now = new Date().toISOString();
    console.log(`🤖 Synchronisation timestamp robot lors de la collecte: ${now}`);
    
    try {
      await supabase
        .from('player_gardens')
        .update({ 
          robot_last_collected: now,
          robot_accumulated_coins: 0, // Réinitialiser l'accumulation après collecte
          last_played: now
        })
        .eq('user_id', user.id);
      
      queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
    } catch (error) {
      console.error('Erreur synchronisation robot timestamp:', error);
    }
  };

  return {
    hasPassiveRobot,
    robotState,
    robotPlantType,
    coinsPerMinute: getCoinsPerMinute(),
    currentAccumulation: calculateCurrentAccumulation(),
    robotLevel,
    collectAccumulatedCoins: () => collectAccumulatedCoinsMutation.mutate(),
    claimOfflineRewards: () => claimOfflineRewardsMutation.mutate(),
    calculateOfflineRewards,
    syncRobotTimestamp,
    isCollecting: collectAccumulatedCoinsMutation.isPending,
    isClaimingRewards: claimOfflineRewardsMutation.isPending
  };
};