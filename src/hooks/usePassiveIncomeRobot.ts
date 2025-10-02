import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { useAnimations } from '@/contexts/AnimationContext';
import { useGameData } from '@/hooks/useGameData';
import { useUnifiedCalculations } from '@/hooks/useUnifiedCalculations';
import { UnifiedCalculationService } from '@/services/UnifiedCalculationService';
import { toast } from 'sonner';
import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { ROBOT_MAX_ACCUMULATION_HOURS } from '@/constants';

export const usePassiveIncomeRobot = () => {
  const { user } = useAuth();
  const calculations = useUnifiedCalculations();
  const queryClient = useQueryClient();
  const { getPermanentMultipliersOnly } = useGameMultipliers();
  const { data: gameData } = useGameData();
  const { triggerCoinAnimation } = useAnimations();
  const accumulationIntervalRef = useRef<number | null>(null);

  /**
   * Affiche une erreur liée au robot.
   * – En développement : toast visuel + stack complète pour faciliter le debug.
   * – En production   : simple warning dans la console afin d'éviter de
   *                     polluer l'expérience utilisateur (une nouvelle
   *                     collecte règle généralement le problème).
   */
  const showRobotError = (message: string) => {
    if (import.meta.env.DEV) {
      toast.error(message);
    } else {
      // Log minimal pour monitoring sans alerter l'utilisateur final.
      logger.debug(`[Robot] ${message}`);
    }
  };
  
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
  const robotLevel = UnifiedCalculationService.getRobotLevel(playerUpgrades);
  const robotPlantLevel = Math.max(1, Math.min(robotLevel, 10));

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
    
    // Utiliser UNIQUEMENT les multiplicateurs permanents (pas les boosts publicitaires)
    const permanentMultipliers = getPermanentMultipliersOnly();
    const permanentMultiplier = gameData?.garden?.permanent_multiplier || 1;
    
    // Appeler directement le service avec les multiplicateurs permanents
    return UnifiedCalculationService.getRobotPassiveIncome(
      robotLevel, 
      permanentMultipliers.harvest,  // Multiplicateur de récolte permanent uniquement
      permanentMultiplier
    );
  };

  // Synchroniser le robot avec son niveau quand il change
  useEffect(() => {
    if (!gameData?.garden) return;
    
    const currentRobotLevel = UnifiedCalculationService.getRobotLevel(playerUpgrades);
    
    // Vérifier si le robot_level dans la DB correspond au niveau calculé
    if (gameData.garden.robot_level !== currentRobotLevel) {
      logger.debug(`Robot level sync: ${gameData.garden.robot_level} -> ${currentRobotLevel}`);
      // La synchronisation sera automatique grâce au trigger
    }
  }, [gameData?.garden, playerUpgrades]);

  // First activation logic: Reset robot state when unlocked for the first time
  useEffect(() => {
    const activateRobotForFirstTime = async () => {
      if (!user?.id || !gameData?.garden || !hasPassiveRobot) return;
      
      // If robot is unlocked but robot_last_collected is null, this is the first activation
      if (gameData.garden.robot_last_collected === null) {
        logger.debug('First robot activation detected - resetting robot state');
        
        const now = new Date().toISOString();
        
        try {
          await supabase
            .from('player_gardens')
            .update({
              robot_last_collected: now,
              robot_accumulated_coins: 0
            })
            .eq('user_id', user.id);
          
          // Refresh the data to reflect the changes
          queryClient.invalidateQueries({ queryKey: ['gameData'] });
          queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
          
          logger.debug('Robot state reset successfully on first activation');
        } catch (error) {
          logger.error('Error resetting robot state on first activation', error);
        }
      }
    };

    activateRobotForFirstTime();
  }, [user?.id, gameData?.garden, hasPassiveRobot, queryClient]);

  // Calcul de l'accumulation totale disponible (simplifié pour éviter le double calcul)
  const calculateCurrentAccumulation = useCallback(() => {
    // Return 0 if robot is not unlocked or has never been activated (robot_last_collected is null)
    if (!hasPassiveRobot || !robotState || !robotPlantType || !robotState.lastCollected) return 0;
    
    const coinsPerMinute = getCoinsPerMinute();
    const now = new Date();
    const lastCollected = new Date(robotState.lastCollected);
    const minutesElapsed = Math.floor((now.getTime() - lastCollected.getTime()) / (1000 * 60));
    
    // Vérification de sécurité : limite configurable d'accumulation
    const maxMinutes = ROBOT_MAX_ACCUMULATION_HOURS * 60;
    const safeMinutesElapsed = Math.min(minutesElapsed, maxMinutes);
    
    // Garde-fou : si l'écart est anormalement grand, utiliser seulement l'accumulation stockée
    if (safeMinutesElapsed > maxMinutes || minutesElapsed < 0) {
      logger.warn(`Abnormal time gap detected: ${minutesElapsed}min, using stored accumulation only`);
      return robotState.accumulatedCoins;
    }
    
    // Calcul UNIQUEMENT des nouveaux revenus depuis la dernière collecte
    const freshAccumulation = safeMinutesElapsed * coinsPerMinute;
    const storedCoins = robotState.accumulatedCoins;
    const totalAccumulation = storedCoins + freshAccumulation;
    const maxAccumulation = coinsPerMinute * maxMinutes;
    
    return Math.min(totalAccumulation, maxAccumulation);
  }, [hasPassiveRobot, robotState, robotPlantType, getCoinsPerMinute]);

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
    const maxMinutes = ROBOT_MAX_ACCUMULATION_HOURS * 60;
    const safeMinutesOffline = Math.min(minutesOffline, maxMinutes);
    
    const offlineCoins = safeMinutesOffline * coinsPerMinute;

    if (offlineCoins <= 0) return null;

    logger.debug(`Offline rewards: ${safeMinutesOffline}min × ${coinsPerMinute} = ${offlineCoins} coins`);

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

      const totalAccumulated = calculateCurrentAccumulation();
      if (totalAccumulated <= 0) return null;

      // Récupérer les données les plus récentes avant la transaction
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, experience, level, robot_level')
        .eq('user_id', user.id)
        .single();

      if (!garden) throw new Error('Garden not found');

      // Calculer l'expérience basée sur le niveau du robot et le montant collecté
      const baseExp = Math.floor(totalAccumulated / 100); // 1 EXP par 100 pièces collectées
      const levelBonus = robotLevel * 2; // 2 EXP bonus par niveau du robot
      const expReward = Math.max(1, baseExp + levelBonus); // Minimum 1 EXP

      const currentExp = garden.experience || 0;
      const newExp = currentExp + expReward;
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newExp / 100)) + 1);

      const now = new Date().toISOString();

      // Mettre à jour le niveau du robot pour être sûr qu'il correspond aux upgrades
      const currentRobotLevel = UnifiedCalculationService.getRobotLevel(playerUpgrades);
      
      const { error } = await supabase
        .from('player_gardens')
        .update({
          coins: (garden.coins || 0) + totalAccumulated,
          experience: newExp,
          level: newLevel,
          robot_accumulated_coins: 0,
          robot_last_collected: now,
          robot_level: currentRobotLevel,
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

      logger.debug(`Robot collection successful: ${totalAccumulated} coins + ${expReward} EXP (level ${currentRobotLevel})`);

      return { totalAccumulated, expReward, plantName: robotPlantType?.display_name };
    },
    onSuccess: (result) => {
      if (result) {
        // Conserver l’animation de pièces mais supprimer le toast visuel
        triggerCoinAnimation(result.totalAccumulated);
      }
      // Invalidation des caches pour synchronisation
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
      queryClient.invalidateQueries({ queryKey: ['passiveRobotState'] });
      queryClient.invalidateQueries({ queryKey: ['playerUpgrades'] });
    },
    onError: (error: any) => {
      showRobotError(error.message || 'Erreur lors de la collecte');
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
      const maxAccumulation = getCoinsPerMinute() * ROBOT_MAX_ACCUMULATION_HOURS * 60;
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
      showRobotError(error.message || 'Erreur lors de la réclamation');
    }
  });

  // Fonction utilitaire pour synchroniser robot_last_collected UNIQUEMENT lors de la collecte
  const syncRobotTimestamp = async () => {
    if (!user?.id || !hasPassiveRobot) return;
    
    const now = new Date().toISOString();
    logger.debug(`Robot timestamp sync during collection: ${now}`);
    
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
      logger.error('Error syncing robot timestamp', error);
    }
  };

  // Calculer si le maximum d'accumulation est atteint
  const maxAccumulationReached = (() => {
    const coinsPerMin = getCoinsPerMinute();
    const maxAcc = coinsPerMin * ROBOT_MAX_ACCUMULATION_HOURS * 60;
    return calculateCurrentAccumulation() >= maxAcc;
  })();

  return {
    hasPassiveRobot,
    robotState,
    robotPlantType,
    coinsPerMinute: getCoinsPerMinute(),
    currentAccumulation: calculateCurrentAccumulation(),
    robotLevel,
    maxAccumulationReached,
    collectAccumulatedCoins: () => collectAccumulatedCoinsMutation.mutate(),
    collectAccumulatedCoinsAsync: () => collectAccumulatedCoinsMutation.mutateAsync(),
    claimOfflineRewards: () => claimOfflineRewardsMutation.mutate(),
    calculateOfflineRewards,
    syncRobotTimestamp,
    isCollecting: collectAccumulatedCoinsMutation.isPending,
    isClaimingRewards: claimOfflineRewardsMutation.isPending
  };
};