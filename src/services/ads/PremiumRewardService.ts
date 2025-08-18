import { supabase } from "@/integrations/supabase/client";
import { AdReward } from "@/types/ads";
import { AdRewardDistributionService } from "./AdRewardDistributionService";

export class PremiumRewardService {
  /**
   * Validates that a user has premium access and creates a premium session for audit
   */
  static async validatePremiumAccess(userId: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('player_gardens')
        .select('premium_status, premium_purchased_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error validating premium access:', error);
        return { isValid: false, error: 'Erreur lors de la validation du statut premium' };
      }

      if (!data.premium_status) {
        return { isValid: false, error: 'Utilisateur non premium' };
      }

      // Additional security: check if premium was purchased recently (not just set)
      if (!data.premium_purchased_at) {
        console.warn(`Premium user ${userId} has no purchase date - potential security issue`);
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error validating premium access:', error);
      return { isValid: false, error: 'Erreur de validation premium' };
    }
  }

  /**
   * Creates a premium session for audit trail and validation
   */
  static async createPremiumSession(
    userId: string, 
    reward: AdReward
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      // Validate premium access first
      const premiumValidation = await this.validatePremiumAccess(userId);
      if (!premiumValidation.isValid) {
        return { success: false, error: premiumValidation.error };
      }

      const now = new Date();
      const sessionData = {
        user_id: userId,
        reward_type: reward.type,
        reward_amount: reward.amount,
        reward_data: {
          duration: reward.duration,
          multiplier: reward.multiplier,
          description: reward.description,
          source: 'premium_auto',
          premium_session: true,
          started_at: now.toISOString(),
          completed: true, // Premium rewards are immediately completed
          rewarded_by_admob: false, // No AdMob for premium
          premium_validated_at: now.toISOString()
        },
        watched_at: now.toISOString()
      };

      const { data: session, error: sessionError } = await supabase
        .from('ad_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      console.log(`Premium: Created audit session ${session.id} for user ${userId}, reward ${reward.type}:${reward.amount}`);
      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error('Error creating premium session:', error);
      return { success: false, error: 'Erreur lors de la création de la session premium' };
    }
  }

  /**
   * Distributes premium reward with full validation and audit trail
   */
  static async distributePremiumReward(
    userId: string, 
    reward: AdReward
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      console.log(`Premium: Starting reward distribution for user ${userId}, reward:`, reward);

      // Create premium session for audit trail
      const sessionResult = await this.createPremiumSession(userId, reward);
      if (!sessionResult.success) {
        return { success: false, error: sessionResult.error };
      }

      // Distribute the reward
      const distributionResult = await AdRewardDistributionService.distributeReward(userId, reward);
      if (!distributionResult.success) {
        console.error('Premium: Failed to distribute reward:', distributionResult.error);
        return { success: false, error: distributionResult.error };
      }

      console.log(`Premium: Successfully distributed reward ${reward.type}:${reward.amount} to user ${userId}`);

      return { 
        success: true, 
        sessionId: sessionResult.sessionId 
      };
    } catch (error) {
      console.error('Error distributing premium reward:', error);
      return { success: false, error: 'Erreur lors de la distribution de la récompense premium' };
    }
  }

  /**
   * Gets recent premium reward sessions for a user
   */
  static async getRecentPremiumSessions(userId: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('ad_sessions')
        .select('*')
        .eq('user_id', userId)
        .contains('reward_data', { premium_session: true })
        .order('watched_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recent premium sessions:', error);
      return [];
    }
  }

  /**
   * Validates premium reward limits (security measure)
   */
  static async checkPremiumRewardLimits(userId: string): Promise<{ allowed: boolean; error?: string }> {
    try {
      // Check if user hasn't exceeded reasonable premium reward limits (e.g., 100 per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ad_sessions')
        .select('id')
        .eq('user_id', userId)
        .contains('reward_data', { premium_session: true })
        .gte('watched_at', today.toISOString());

      if (error) throw error;

      const todayCount = data?.length || 0;
      const maxDailyPremiumRewards = 5; // Même limite que les publicités normales

      if (todayCount >= maxDailyPremiumRewards) {
        return { 
          allowed: false, 
          error: `Limite quotidienne de récompenses premium atteinte (${maxDailyPremiumRewards})` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking premium reward limits:', error);
      return { allowed: false, error: 'Erreur lors de la vérification des limites' };
    }
  }
}