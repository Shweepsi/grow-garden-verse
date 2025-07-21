
import { supabase } from "@/integrations/supabase/client";

export class AdCooldownService {
  private static readonly FIXED_COOLDOWN_HOURS = 2;
  private static readonly FIXED_COOLDOWN_SECONDS = 2 * 60 * 60; // 2 heures

  static async getCooldownInfo(userId: string): Promise<{
    available: boolean;
    cooldownEnds: Date | null;
    timeUntilNext: number;
  }> {
    const { data: cooldown } = await supabase
      .from('ad_cooldowns')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    let available = true;
    let cooldownEnds: Date | null = null;
    let timeUntilNext = 0;

    if (cooldown && cooldown.last_ad_watched) {
      const lastWatch = new Date(cooldown.last_ad_watched);
      const cooldownEnd = new Date(lastWatch.getTime() + (this.FIXED_COOLDOWN_SECONDS * 1000));
      
      if (now < cooldownEnd) {
        available = false;
        cooldownEnds = cooldownEnd;
        timeUntilNext = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000);
      }
    }

    return { available, cooldownEnds, timeUntilNext };
  }

  static async updateCooldown(userId: string): Promise<void> {
    const now = new Date();
    
    const { error } = await supabase
      .from('ad_cooldowns')
      .upsert({
        user_id: userId,
        last_ad_watched: now.toISOString(),
        daily_count: 0, // Plus de limite quotidienne, seulement cooldown
        daily_reset_date: now.toISOString().split('T')[0],
        fixed_cooldown_duration: this.FIXED_COOLDOWN_SECONDS,
        updated_at: now.toISOString()
      });

    if (error) throw error;
  }

  static get cooldownHours() {
    return this.FIXED_COOLDOWN_HOURS;
  }
}
