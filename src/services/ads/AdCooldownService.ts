import { supabase } from "@/integrations/supabase/client";

export class AdCooldownService {
  private static readonly BASE_COOLDOWN_MINUTES = 15;
  private static readonly COOLDOWN_MULTIPLIER = 4;
  private static readonly MIN_COOLDOWN_MINUTES = 10;
  private static readonly MAX_COOLDOWN_MINUTES = 120;
  private static readonly MAX_DAILY_ADS = 5;

  static calculateCooldownMinutes(adDurationMs: number): number {
    const adDurationMinutes = adDurationMs / (1000 * 60);
    const cooldownMinutes = this.BASE_COOLDOWN_MINUTES + (adDurationMinutes * this.COOLDOWN_MULTIPLIER);
    
    return Math.max(
      this.MIN_COOLDOWN_MINUTES,
      Math.min(this.MAX_COOLDOWN_MINUTES, Math.round(cooldownMinutes))
    );
  }

  static async updateCooldown(userId: string, adDuration: number, dailyCount: number): Promise<void> {
    const now = new Date();
    const cooldownMinutes = this.calculateCooldownMinutes(adDuration);
    
    console.log(`AdMob: Setting cooldown to ${cooldownMinutes} minutes based on ${adDuration}ms ad duration`);

    const { error } = await supabase
      .from('ad_cooldowns')
      .upsert({
        user_id: userId,
        last_ad_watched: now.toISOString(),
        daily_count: dailyCount + 1,
        daily_reset_date: now.toISOString().split('T')[0],
        updated_at: now.toISOString()
      });

    if (error) throw error;
  }

  static async getCooldownInfo(userId: string): Promise<{
    available: boolean;
    cooldownEnds: Date | null;
    dailyCount: number;
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
    let dailyCount = 0;
    let timeUntilNext = 0;

    if (cooldown) {
      // Reset daily count if needed
      const resetDate = new Date(cooldown.daily_reset_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (resetDate < today) {
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

      // Check dynamic cooldown
      if (cooldown.last_ad_watched) {
        const lastWatch = new Date(cooldown.last_ad_watched);
        
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

      // Check daily limit
      if (dailyCount >= this.MAX_DAILY_ADS) {
        available = false;
      }
    }

    return { available, cooldownEnds, dailyCount, timeUntilNext };
  }

  static get maxDailyAds() {
    return this.MAX_DAILY_ADS;
  }
}