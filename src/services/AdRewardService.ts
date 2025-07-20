import { EconomyService } from "./EconomyService";
import { AdReward, AdState } from "@/types/ads";
import { AdCooldownService } from "./ads/AdCooldownService";
import { AdSessionService } from "./ads/AdSessionService";

export class AdRewardService {
  static getAvailableRewards(playerLevel: number, permanentMultiplier: number): AdReward[] {
    const baseCoins = EconomyService.getAdCoinReward(500, playerLevel, permanentMultiplier);
    const gems = EconomyService.getAdGemReward(playerLevel);

    return [
      {
        type: 'coins',
        amount: baseCoins,
        description: `${baseCoins} pièces`,
        emoji: '💰'
      },
      {
        type: 'gems',
        amount: gems,
        description: `${gems} gemmes`,
        emoji: '💎'
      },
      {
        type: 'growth_boost',
        amount: 50, // 50% de réduction
        duration: 30,
        description: 'Croissance -50% (30min)',
        emoji: '⚡'
      },
      {
        type: 'robot_boost',
        amount: 100, // 100% de bonus
        duration: 60,
        description: 'Robot ×2 (1h)',
        emoji: '🤖'
      },
      {
        type: 'xp_boost',
        amount: Math.floor(playerLevel * 10 * permanentMultiplier),
        description: `${Math.floor(playerLevel * 10 * permanentMultiplier)} XP`,
        emoji: '⭐'
      }
    ];
  }

  static async getAdState(userId: string): Promise<AdState> {
    try {
      const cooldownInfo = await AdCooldownService.getCooldownInfo(userId);
      
      return {
        available: cooldownInfo.available,
        cooldownEnds: cooldownInfo.cooldownEnds,
        dailyCount: cooldownInfo.dailyCount,
        maxDaily: AdCooldownService.maxDailyAds,
        currentReward: null,
        timeUntilNext: cooldownInfo.timeUntilNext
      };
    } catch (error) {
      console.error('Error getting ad state:', error);
      return {
        available: false,
        cooldownEnds: null,
        dailyCount: 0,
        maxDaily: AdCooldownService.maxDailyAds,
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
