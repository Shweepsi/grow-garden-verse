import { supabase } from "@/integrations/supabase/client";
import { AdReward } from "@/types/ads";
import { AdValidationService } from "./AdValidationService";
import { AdCooldownService } from "./AdCooldownService";
import { AdRewardDistributionService } from "./AdRewardDistributionService";
import { AdVerificationService } from "./AdVerificationService";

export class AdSessionService {
  static async createSession(userId: string, reward: AdReward): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const cooldownInfo = await AdCooldownService.getCooldownInfo(userId);
      
      if (!cooldownInfo.available) {
        return { success: false, error: 'Publicité non disponible' };
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
          started_at: now.toISOString(),
          completed: false,
          ad_duration: null,
          estimated_duration: null
        },
        watched_at: now.toISOString()
      };

      const { data: session, error: sessionError } = await supabase
        .from('ad_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error('Error starting ad session:', error);
      return { success: false, error: 'Erreur lors du démarrage de la publicité' };
    }
  }

  static async completeSession(
    userId: string, 
    sessionId: string, 
    actualDuration: number,
    estimatedDuration: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify session exists and belongs to user with enhanced security
      const verification = await AdVerificationService.verifySession(userId, sessionId);
      
      if (!verification.isValid) {
        return { success: false, error: verification.error };
      }

      const session = verification.session;

      // Validate watch time with enhanced security
      const validation = AdValidationService.validateAdWatchTime(actualDuration, estimatedDuration);
      
      if (!validation.isValid) {
        await this.cancelSession(userId, sessionId);
        await AdVerificationService.markSuspiciousSession(sessionId, `Insufficient watch time: ${actualDuration}ms < ${validation.minRequired}ms`);
        return { success: false, error: validation.errorMessage };
      }

      // Update session as completed
      const now = new Date();
      const rewardData = session.reward_data as any;

      const { error: updateError } = await supabase
        .from('ad_sessions')
        .update({
          reward_data: {
            ...rewardData,
            completed: true,
            completed_at: now.toISOString(),
            ad_duration: actualDuration,
            estimated_duration: estimatedDuration,
            minimum_required: validation.minRequired
          }
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Update cooldown
      const cooldownInfo = await AdCooldownService.getCooldownInfo(userId);
      await AdCooldownService.updateCooldown(userId, actualDuration, cooldownInfo.dailyCount);

      // Distribute reward to player
      const sessionRewardData = session.reward_data as any;
      const reward: AdReward = {
        type: session.reward_type as any,
        amount: session.reward_amount,
        duration: sessionRewardData.duration,
        multiplier: sessionRewardData.multiplier,
        description: sessionRewardData.description,
        emoji: ''
      };

      const distributionResult = await AdRewardDistributionService.distributeReward(userId, reward);
      
      if (!distributionResult.success) {
        console.error('Failed to distribute reward:', distributionResult.error);
        // On continue même si la distribution échoue pour éviter de bloquer l'utilisateur
        // mais on log l'erreur pour investigation
      } else {
        console.log(`AdMob: Successfully distributed reward ${reward.type}:${reward.amount} to user ${userId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error completing ad session:', error);
      return { success: false, error: 'Erreur lors de la finalisation de la publicité' };
    }
  }

  static async cancelSession(userId: string, sessionId: string): Promise<void> {
    try {
      await supabase
        .from('ad_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error canceling ad session:', error);
    }
  }

  static async getRecentSessions(userId: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('ad_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('watched_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      return [];
    }
  }
}