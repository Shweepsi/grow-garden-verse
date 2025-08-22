import { supabase } from "@/integrations/supabase/client";
import { AdReward, AdState } from "@/types/ads";
import { AdCooldownService } from "./ads/AdCooldownService";
import { AdRewardDistributionService } from "./ads/AdRewardDistributionService";
import { AdCacheService } from "./ads/AdCacheService";

export class UnifiedRewardService {
  /**
   * Fonction de tri personnalisé pour les récompenses publicitaires
   * Ordre : pièces, gemmes, boost pièces, boost croissance, boost gemmes
   */
  private static sortRewards(rewards: AdReward[]): AdReward[] {
    const rewardOrder = {
      'coins': 1,
      'gems': 2,
      'coin_boost': 3,
      'growth_speed': 4,
      'growth_boost': 4, // même priorité que growth_speed
      'gem_boost': 5
    };

    return rewards.sort((a, b) => {
      const orderA = rewardOrder[a.type] || 999;
      const orderB = rewardOrder[b.type] || 999;
      
      // Si même ordre, trier par montant décroissant
      if (orderA === orderB) {
        return b.amount - a.amount;
      }
      
      return orderA - orderB;
    });
  }

  /**
   * Service unifié pour obtenir les récompenses disponibles
   */
  static async getAvailableRewards(playerLevel: number): Promise<AdReward[]> {
    try {
      // Vérifier le cache d'abord
      const cachedRewards = AdCacheService.getCachedRewards(playerLevel);
      if (cachedRewards) {
        console.log('UnifiedRewardService: Using cached rewards for level', playerLevel);
        return this.sortRewards(cachedRewards);
      }

      console.log('UnifiedRewardService: Fetching rewards for level', playerLevel);
      const { data: configs, error } = await supabase
        .from('ad_reward_configs')
        .select('*')
        .eq('active', true)
        .lte('min_player_level', playerLevel);

      if (error) throw error;

      const rewards = configs.map(config => {
        const normalizedType = config.reward_type === 'growth_boost' ? 'growth_speed' : config.reward_type;
        let amount = config.base_amount + (config.level_coefficient * (playerLevel - 1));

        if (config.max_amount && amount > config.max_amount) {
          amount = config.max_amount;
        }

        if (normalizedType === 'growth_speed' && amount < 1 && amount > 0) {
          amount = 1 / amount;
        }

        let description = config.description;
        if (normalizedType === 'coins' || normalizedType === 'gems') {
          description = `${Math.floor(amount)} ${config.display_name.toLowerCase()}`;
        } else if (normalizedType === 'growth_speed') {
          description = `Boost Croissance x${amount}`;
        } else if (normalizedType.includes('boost')) {
          description = `${config.display_name} x${amount}`;
        }

        return {
          type: normalizedType as AdReward['type'],
          amount: Math.floor(amount * 100) / 100,
          description,
          emoji: config.emoji || '🎁',
          duration: config.duration_minutes
        };
      });

      const sortedRewards = this.sortRewards(rewards);
      AdCacheService.cacheRewards(playerLevel, sortedRewards);
      
      return sortedRewards;
    } catch (error) {
      console.error('Error loading rewards:', error);
      const fallbackRewards: AdReward[] = [
        {
          type: 'coins' as const,
          amount: 1000 + (800 * (playerLevel - 1)),
          description: `${1000 + (800 * (playerLevel - 1))} pièces`,
          emoji: '🪙',
          duration: undefined
        }
      ];
      
      const sortedFallbackRewards = this.sortRewards(fallbackRewards);
      AdCacheService.cacheRewards(playerLevel, sortedFallbackRewards);
      return sortedFallbackRewards;
    }
  }

  /**
   * Service unifié pour obtenir l'état des récompenses (normal/premium)
   */
  static async getRewardState(userId: string, isPremium: boolean = false): Promise<AdState> {
    try {
      const cooldownInfo = await AdCooldownService.getCooldownInfo(userId);
      
      return {
        available: cooldownInfo.available,
        cooldownEnds: cooldownInfo.cooldownEnds,
        dailyCount: cooldownInfo.dailyCount,
        maxDaily: cooldownInfo.maxDaily,
        currentReward: null,
        timeUntilNext: cooldownInfo.timeUntilNext
      };
    } catch (error) {
      console.error('Error getting reward state:', error);
      return {
        available: false,
        cooldownEnds: null,
        dailyCount: 0,
        maxDaily: 5,
        currentReward: null,
        timeUntilNext: 0
      };
    }
  }

  /**
   * Valide si un utilisateur peut réclamer une récompense
   */
  static async validateRewardClaim(userId: string, isPremium: boolean = false): Promise<{ allowed: boolean; error?: string }> {
    try {
      // Vérification unifiée des limites via ad_cooldowns
      const { data: cooldownData } = await supabase
        .from('ad_cooldowns')
        .select('daily_count, daily_reset_date')
        .eq('user_id', userId)
        .single();

      const today = new Date().toISOString().split('T')[0];
      const maxDaily = 5;

      // Si nouveau jour, autoriser
      if (cooldownData && cooldownData.daily_reset_date !== today) {
        return { allowed: true };
      }

      // Vérifier la limite quotidienne
      const currentCount = cooldownData?.daily_count || 0;
      if (currentCount >= maxDaily) {
        return { 
          allowed: false, 
          error: `Limite quotidienne atteinte (${maxDaily} récompenses par jour)` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error validating reward claim:', error);
      return { allowed: false, error: 'Erreur lors de la validation' };
    }
  }

  /**
   * Distribue une récompense (normal ou premium)
   */
  static async distributeReward(
    userId: string, 
    reward: AdReward, 
    isPremium: boolean = false
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      // Validation des limites
      const validation = await this.validateRewardClaim(userId, isPremium);
      if (!validation.allowed) {
        return { success: false, error: validation.error };
      }

      // Validation du statut premium si nécessaire
      if (isPremium) {
        const { data: gardenData } = await supabase
          .from('player_gardens')
          .select('premium_status')
          .eq('user_id', userId)
          .single();

        if (!gardenData?.premium_status) {
          return { success: false, error: 'Statut premium requis' };
        }
      }

      // Créer la session d'audit
      const sessionData = {
        user_id: userId,
        reward_type: reward.type,
        reward_amount: reward.amount,
        reward_data: {
          duration: reward.duration,
          description: reward.description,
          source: isPremium ? 'premium_auto' : 'ad_watch',
          premium_session: isPremium,
          started_at: new Date().toISOString(),
          completed: true
        },
        watched_at: new Date().toISOString()
      };

      const { data: session, error: sessionError } = await supabase
        .from('ad_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      // Distribuer la récompense
      const distributionResult = await AdRewardDistributionService.distributeReward(userId, reward);
      if (!distributionResult.success) {
        return { success: false, error: distributionResult.error };
      }

      // Incrémenter le compteur
      await AdCooldownService.updateAfterAdWatch(userId);

      console.log(`UnifiedRewardService: Successfully distributed ${isPremium ? 'premium' : 'normal'} reward ${reward.type}:${reward.amount} to user ${userId}`);

      return { 
        success: true, 
        sessionId: session.id 
      };
    } catch (error) {
      console.error('Error distributing reward:', error);
      return { success: false, error: 'Erreur lors de la distribution de la récompense' };
    }
  }

  /**
   * Force le rechargement des récompenses
   */
  static async forceReloadRewards(playerLevel: number): Promise<AdReward[]> {
    AdCacheService.clearRewardsCache(playerLevel);
    return this.getAvailableRewards(playerLevel);
  }

  /**
   * Vide tout le cache des récompenses
   */
  static clearAllRewardsCache(): void {
    AdCacheService.clearAllRewardsCache();
  }
}