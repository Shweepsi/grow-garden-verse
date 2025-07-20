import { supabase } from "@/integrations/supabase/client";
import { EconomyService } from "./EconomyService";
import { AdReward, AdSession, AdCooldown, AdState } from "@/types/ads";

export class AdRewardService {
  // Système de cooldown adaptatif basé sur la durée de la publicité
  private static readonly BASE_COOLDOWN_MINUTES = 15; // 15 minutes de base
  private static readonly COOLDOWN_MULTIPLIER = 4; // Multiplier par 4 la durée de la pub pour le cooldown
  private static readonly MIN_COOLDOWN_MINUTES = 10; // Minimum 10 minutes
  private static readonly MAX_COOLDOWN_MINUTES = 120; // Maximum 2 heures
  private static readonly MAX_DAILY_ADS = 5;

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

  private static calculateCooldownMinutes(adDurationMs: number): number {
    // Calculer le cooldown basé sur la durée de la publicité
    const adDurationMinutes = adDurationMs / (1000 * 60);
    const cooldownMinutes = this.BASE_COOLDOWN_MINUTES + (adDurationMinutes * this.COOLDOWN_MULTIPLIER);
    
    // Appliquer les limites min/max
    return Math.max(
      this.MIN_COOLDOWN_MINUTES,
      Math.min(this.MAX_COOLDOWN_MINUTES, Math.round(cooldownMinutes))
    );
  }

  private static getMinimumWatchTime(estimatedDurationMs: number): number {
    // Le temps minimum requis est 80% de la durée estimée, avec un minimum absolu de 3 secondes
    const minimumPercentage = 0.8;
    const calculatedMinimum = estimatedDurationMs * minimumPercentage;
    return Math.max(3000, Math.round(calculatedMinimum)); // Minimum 3 secondes
  }

  static async getAdState(userId: string): Promise<AdState> {
    try {
      const { data: cooldown } = await supabase
        .from('ad_cooldowns')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const now = new Date();
      let available = true;
      let cooldownEnds: Date | null = null;
      let dailyCount = 0;
      let timeUntilNext = 0;

      if (cooldown) {
        // Vérifier si on doit reset le compteur quotidien
        const resetDate = new Date(cooldown.daily_reset_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (resetDate < today) {
          // Reset le compteur
          await supabase
            .from('ad_cooldowns')
            .update({
              daily_count: 0,
              daily_reset_date: today.toISOString().split('T')[0],
              updated_at: now.toISOString()
            })
            .eq('user_id', userId);
          dailyCount = 0;
        } else {
          dailyCount = cooldown.daily_count;
        }

        // Vérifier le cooldown dynamique
        if (cooldown.last_ad_watched) {
          const lastWatch = new Date(cooldown.last_ad_watched);
          
          // Récupérer la durée de la dernière publicité pour calculer le cooldown
          const { data: lastSession } = await supabase
            .from('ad_sessions')
            .select('reward_data')
            .eq('user_id', userId)
            .order('watched_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let cooldownMinutes = this.BASE_COOLDOWN_MINUTES;
          if (lastSession?.reward_data && (lastSession.reward_data as any).ad_duration) {
            cooldownMinutes = this.calculateCooldownMinutes((lastSession.reward_data as any).ad_duration);
          }

          const cooldownEnd = new Date(lastWatch.getTime() + (cooldownMinutes * 60 * 1000));
          
          if (now < cooldownEnd) {
            available = false;
            cooldownEnds = cooldownEnd;
            timeUntilNext = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000);
          }
        }

        // Vérifier la limite quotidienne
        if (dailyCount >= this.MAX_DAILY_ADS) {
          available = false;
        }
      }

      return {
        available,
        cooldownEnds,
        dailyCount,
        maxDaily: this.MAX_DAILY_ADS,
        currentReward: null,
        timeUntilNext
      };
    } catch (error) {
      console.error('Error getting ad state:', error);
      return {
        available: false,
        cooldownEnds: null,
        dailyCount: 0,
        maxDaily: this.MAX_DAILY_ADS,
        currentReward: null,
        timeUntilNext: 0
      };
    }
  }

  static async startAdSession(userId: string, reward: AdReward): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const adState = await this.getAdState(userId);
      
      if (!adState.available) {
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
          ad_duration: null, // Sera rempli lors de la complétion
          estimated_duration: null
        },
        watched_at: now.toISOString()
      };

      // Créer la session en attente
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

  static async completeAdSession(
    userId: string, 
    sessionId: string, 
    actualDuration: number,
    estimatedDuration: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Vérifier que la session existe et appartient à l'utilisateur
      const { data: session, error: sessionError } = await supabase
        .from('ad_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (sessionError || !session) {
        return { success: false, error: 'Session invalide' };
      }

      // Calculer la durée minimum requise basée sur la durée estimée
      const minWatchDuration = this.getMinimumWatchTime(estimatedDuration);
      
      console.log(`AdMob: Validation - Required: ${minWatchDuration}ms, Actual: ${actualDuration}ms`);
      
      if (actualDuration < minWatchDuration) {
        // Supprimer la session incomplète
        await supabase
          .from('ad_sessions')
          .delete()
          .eq('id', sessionId);
        
        return { 
          success: false, 
          error: `Publicité non regardée entièrement (${Math.round(actualDuration/1000)}s/${Math.round(minWatchDuration/1000)}s requis)` 
        };
      }

      const now = new Date();
      const rewardData = session.reward_data as any;

      // Marquer la session comme complétée avec les durées mesurées
      const { error: updateError } = await supabase
        .from('ad_sessions')
        .update({
          reward_data: {
            duration: rewardData.duration,
            multiplier: rewardData.multiplier,
            description: rewardData.description,
            started_at: rewardData.started_at,
            completed: true,
            completed_at: now.toISOString(),
            ad_duration: actualDuration,
            estimated_duration: estimatedDuration,
            minimum_required: minWatchDuration
          }
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Récupérer l'état actuel pour le cooldown
      const adState = await this.getAdState(userId);

      // Calculer le nouveau cooldown basé sur la durée réelle
      const cooldownMinutes = this.calculateCooldownMinutes(actualDuration);
      
      console.log(`AdMob: Setting cooldown to ${cooldownMinutes} minutes based on ${actualDuration}ms ad duration`);

      // Mettre à jour le cooldown avec la durée calculée
      const { error: cooldownError } = await supabase
        .from('ad_cooldowns')
        .upsert({
          user_id: userId,
          last_ad_watched: now.toISOString(),
          daily_count: adState.dailyCount + 1,
          daily_reset_date: now.toISOString().split('T')[0],
          updated_at: now.toISOString()
        });

      if (cooldownError) throw cooldownError;

      return { success: true };
    } catch (error) {
      console.error('Error completing ad session:', error);
      return { success: false, error: 'Erreur lors de la finalisation de la publicité' };
    }
  }

  static async cancelAdSession(userId: string, sessionId: string): Promise<void> {
    try {
      // Supprimer la session annulée
      await supabase
        .from('ad_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error canceling ad session:', error);
    }
  }

  static async getRecentSessions(userId: string, limit = 10): Promise<AdSession[]> {
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
