
import { supabase } from "@/integrations/supabase/client";

export class AdCooldownService {
  private static readonly MAX_DAILY_ADS = 5; // Limite quotidienne

  static async getCooldownInfo(userId: string): Promise<{
    available: boolean;
    cooldownEnds: Date | null;
    timeUntilNext: number;
    dailyCount: number;
    maxDaily: number;
  }> {
    try {
      // Utiliser la nouvelle edge function pour vérifier les limites
      const { data, error } = await supabase.functions.invoke('check-ad-limit');
      
      if (error) {
        console.error('Error checking ad limit:', error);
        throw error;
      }

      if (!data.success) {
        // Limite atteinte
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const timeUntilNext = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);

        return {
          available: false,
          cooldownEnds: tomorrow,
          timeUntilNext,
          dailyCount: data.current_count || this.MAX_DAILY_ADS,
          maxDaily: this.MAX_DAILY_ADS
        };
      }

      return {
        available: true,
        cooldownEnds: null,
        timeUntilNext: 0,
        dailyCount: data.current_count || 0,
        maxDaily: this.MAX_DAILY_ADS
      };
    } catch (error) {
      console.error('Error in getCooldownInfo:', error);
      // Fallback en cas d'erreur - bloquer les pubs par sécurité
      return {
        available: false,
        cooldownEnds: null,
        timeUntilNext: 3600, // 1 heure de cooldown
        dailyCount: this.MAX_DAILY_ADS,
        maxDaily: this.MAX_DAILY_ADS
      };
    }
  }

  static async updateAfterAdWatch(userId: string): Promise<void> {
    try {
      // Utiliser la nouvelle edge function pour incrémenter le compteur
      const { data, error } = await supabase.functions.invoke('increment-ad-count');
      
      if (error) {
        console.error('Error incrementing ad count:', error);
        throw error;
      }

      if (data.success) {
        console.log(`📈 Pub regardée: ${data.new_count}/${this.MAX_DAILY_ADS} aujourd'hui`);
      } else {
        console.warn('Failed to increment ad count:', data.message);
      }
    } catch (error) {
      console.error('Error in updateAfterAdWatch:', error);
      throw error;
    }
  }

  static async updateCooldown(userId: string): Promise<void> {
    return this.updateAfterAdWatch(userId);
  }
  
  static get maxDailyAds() {
    return this.MAX_DAILY_ADS;
  }
}
