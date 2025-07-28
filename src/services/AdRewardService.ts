import { supabase } from "@/integrations/supabase/client";
import { AdReward, AdState } from "@/types/ads";
import { AdCooldownService } from "./ads/AdCooldownService";
import { AdSessionService } from "./ads/AdSessionService";
import { AdCacheService } from "./ads/AdCacheService";

export class AdRewardService {
  static async getAvailableRewards(playerLevel: number): Promise<AdReward[]> {
    try {
      // Vérifier le cache d'abord
      const cachedRewards = AdCacheService.getCachedRewards(playerLevel);
      if (cachedRewards) {
        console.log('AdRewardService: Using cached rewards for level', playerLevel);
        return cachedRewards;
      }

      console.log('AdRewardService: Fetching rewards for level', playerLevel);
      const { data: configs, error } = await supabase
        .from('ad_reward_configs')
        .select('*')
        .eq('active', true)
        .lte('min_player_level', playerLevel)
        .order('reward_type');

      if (error) throw error;

      const rewards = configs.map(config => {
        // Calculer le montant basé sur le niveau
        let amount = config.base_amount + (config.level_coefficient * (playerLevel - 1));
        
        // Appliquer le maximum si défini
        if (config.max_amount && amount > config.max_amount) {
          amount = config.max_amount;
        }

        // Formater la description selon le type
        let description = config.description;
        if (config.reward_type === 'coins' || config.reward_type === 'gems') {
          description = `${Math.floor(amount)} ${config.display_name.toLowerCase()}`;
        } else if (config.reward_type === 'growth_speed') {
          const speedMultiplier = 1 / amount;
          description = `Boost Croissance x${speedMultiplier} (${config.duration_minutes}min)`;
        } else if (config.reward_type.includes('boost')) {
          description = `${config.display_name} x${amount} (${config.duration_minutes}min)`;
        }

        return {
          type: config.reward_type as AdReward['type'],
          amount: Math.floor(amount * 100) / 100, // Arrondir à 2 décimales
          description,
          emoji: config.emoji || '🎁',
          duration: config.duration_minutes
        };
      });

      // Mettre en cache les récompenses
      AdCacheService.cacheRewards(playerLevel, rewards);
      console.log('AdRewardService: Cached rewards for level', playerLevel);
      
      return rewards;
    } catch (error) {
      console.error('Error loading ad rewards:', error);
      // Fallback en cas d'erreur
      const fallbackRewards: AdReward[] = [
        {
          type: 'coins' as const,
          amount: 1000 + (800 * (playerLevel - 1)),
          description: `${1000 + (800 * (playerLevel - 1))} pièces`,
          emoji: '🪙'
        }
      ];
      
      // Mettre en cache même les récompenses de fallback
      AdCacheService.cacheRewards(playerLevel, fallbackRewards);
      return fallbackRewards;
    }
  }

  static async getAdState(userId: string): Promise<AdState> {
    try {
      const cooldownInfo = await AdCooldownService.getCooldownInfo(userId);
      
      return {
        available: cooldownInfo.available,
        cooldownEnds: cooldownInfo.cooldownEnds,
        dailyCount: 0, // Plus de limite quotidienne
        maxDaily: 999, // Pas de limite
        currentReward: null,
        timeUntilNext: cooldownInfo.timeUntilNext
      };
    } catch (error) {
      console.error('Error getting ad state:', error);
      return {
        available: false,
        cooldownEnds: null,
        dailyCount: 0,
        maxDaily: 999,
        currentReward: null,
        timeUntilNext: 0
      };
    }
  }

  static async startAdSession(userId: string, reward: AdReward) {
    return AdSessionService.createSession(userId, reward);
  }

  static async completeAdSession(
    userId: string, 
    sessionId: string, 
    rewarded: boolean
  ) {
    return AdSessionService.completeSession(userId, sessionId, rewarded);
  }

  static async cancelAdSession(userId: string, sessionId: string) {
    return AdSessionService.cancelSession(userId, sessionId);
  }

  static async getRecentSessions(userId: string, limit = 10) {
    return AdSessionService.getRecentSessions(userId, limit);
  }
}
