import { supabase } from "@/integrations/supabase/client";
import { EconomyService } from "./EconomyService";
import { AdReward, AdSession, AdCooldown, AdState } from "@/types/ads";

export class AdRewardService {
  private static readonly COOLDOWN_HOURS = 2;
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

        // Vérifier le cooldown de 2h
        if (cooldown.last_ad_watched) {
          const lastWatch = new Date(cooldown.last_ad_watched);
          const cooldownEnd = new Date(lastWatch.getTime() + (this.COOLDOWN_HOURS * 60 * 60 * 1000));
          
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
          completed: false
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

  static async completeAdSession(userId: string, sessionId: string, watchDuration: number): Promise<{ success: boolean; error?: string }> {
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

      // Vérifier que la publicité a été regardée suffisamment longtemps (minimum 25 secondes)
      const MIN_WATCH_DURATION = 25000; // 25 secondes en millisecondes
      if (watchDuration < MIN_WATCH_DURATION) {
        // Supprimer la session incomplète
        await supabase
          .from('ad_sessions')
          .delete()
          .eq('id', sessionId);
        
        return { success: false, error: 'Publicité non regardée entièrement' };
      }

      const now = new Date();
      const rewardData = session.reward_data as any;
      const startTime = new Date(rewardData.started_at);
      const actualDuration = now.getTime() - startTime.getTime();

      // Vérifier la cohérence temporelle
      if (Math.abs(actualDuration - watchDuration) > 5000) { // 5 secondes de tolérance
        await supabase
          .from('ad_sessions')
          .delete()
          .eq('id', sessionId);
        
        return { success: false, error: 'Durée de visionnage incohérente' };
      }

      // Marquer la session comme complétée
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
            watch_duration: watchDuration
          }
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Récupérer l'état actuel pour le cooldown
      const adState = await this.getAdState(userId);

      // Mettre à jour le cooldown
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