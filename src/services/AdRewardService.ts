import { supabase } from "@/integrations/supabase/client";
import { AdReward, AdState } from "@/types/ads";
import { AdCooldownService } from "./ads/AdCooldownService";
import { AdSessionService } from "./ads/AdSessionService";
import { AdCacheService } from "./ads/AdCacheService";

export class AdRewardService {
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

  static async getAvailableRewards(playerLevel: number): Promise<AdReward[]> {
    try {
      // Vérifier le cache d'abord
      const cachedRewards = AdCacheService.getCachedRewards(playerLevel);
      if (cachedRewards) {
        console.log('AdRewardService: Using cached rewards for level', playerLevel);
        // Appliquer le tri même aux récompenses en cache
        return this.sortRewards(cachedRewards);
      }

      console.log('AdRewardService: Fetching rewards for level', playerLevel);
      const { data: configs, error } = await supabase
        .from('ad_reward_configs')
        .select('*')
        .eq('active', true)
        .lte('min_player_level', playerLevel);
        // Suppression du .order('reward_type') car on va trier manuellement

      if (error) throw error;

      const rewards = configs.map(config => {
        // Normaliser le type : growth_boost -> growth_speed (alias)
        const normalizedType = config.reward_type === 'growth_boost' ? 'growth_speed' : config.reward_type;

        // Calculer le montant basé sur le niveau
        let amount = config.base_amount + (config.level_coefficient * (playerLevel - 1));

        // Appliquer le maximum si défini
        if (config.max_amount && amount > config.max_amount) {
          amount = config.max_amount;
        }

        // NORMALISATION: pour "growth_speed", garantir un multiplicateur >= 1
        // Historiquement, les valeurs <1 (ex: 0.5) représentaient une réduction de 50%.
        // Le moteur de calcul client attend désormais un multiplicateur >1 (ex: 2.0).
        if (normalizedType === 'growth_speed' && amount < 1 && amount > 0) {
          amount = 1 / amount;
        }

        // Formater la description selon le type
        let description = config.description;
        if (normalizedType === 'coins' || normalizedType === 'gems') {
          description = `${Math.floor(amount)} ${config.display_name.toLowerCase()}`;
        } else if (normalizedType === 'growth_speed') {
          // Afficher la réduction de temps en pourcentage pour plus de clarté
          const reductionPercent = Math.round((1 - (1 / amount)) * 100);
          description = `Boost Croissance -${reductionPercent}% (${config.duration_minutes}min)`;
        } else if (normalizedType.includes('boost')) {
          description = `${config.display_name} x${amount} (${config.duration_minutes}min)`;
        }

        return {
          // Cast sûr grâce à l'extension du type dans src/types/ads.ts
          type: normalizedType as AdReward['type'],
          amount: Math.floor(amount * 100) / 100, // Arrondir à 2 décimales
          description,
          emoji: config.emoji || '🎁',
          duration: config.duration_minutes,
          // Ajouter des données pour personnaliser l'affichage
          displayName: config.display_name,
          baseAmount: config.base_amount,
          levelCoefficient: config.level_coefficient
        };
      });

      // Appliquer le tri personnalisé
      const sortedRewards = this.sortRewards(rewards);

      // Mettre en cache les récompenses triées
      AdCacheService.cacheRewards(playerLevel, sortedRewards);
      console.log('AdRewardService: Cached sorted rewards for level', playerLevel);
      
      return sortedRewards;
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
      
      // Appliquer le tri même aux récompenses de fallback (pas nécessaire ici mais pour cohérence)
      const sortedFallbackRewards = this.sortRewards(fallbackRewards);
      
      // Mettre en cache même les récompenses de fallback
      AdCacheService.cacheRewards(playerLevel, sortedFallbackRewards);
      return sortedFallbackRewards;
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

  /**
   * Force le rechargement des récompenses en vidant le cache
   * Utile pour appliquer immédiatement les nouveaux changements de tri
   */
  static async forceReloadRewards(playerLevel: number): Promise<AdReward[]> {
    // Vider le cache pour ce niveau
    AdCacheService.clearRewardsCache(playerLevel);
    
    // Recharger les récompenses avec le nouveau tri
    return this.getAvailableRewards(playerLevel);
  }

  /**
   * Vide tout le cache des récompenses
   * Utile après des modifications importantes du système de tri
   */
  static clearAllRewardsCache(): void {
    AdCacheService.clearAllRewardsCache();
  }
}
