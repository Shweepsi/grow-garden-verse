
import { supabase } from "@/integrations/supabase/client";

export class AdCooldownService {
  private static readonly FIXED_COOLDOWN_HOURS = 2;
  private static readonly FIXED_COOLDOWN_SECONDS = 2 * 60 * 60; // 2 heures
  private static readonly MAX_DAILY_ADS = 5; // Limite quotidienne

  static async getCooldownInfo(userId: string): Promise<{
    available: boolean;
    cooldownEnds: Date | null;
    timeUntilNext: number;
    dailyCount: number;
    maxDaily: number;
  }> {
    const { data: cooldown } = await supabase
      .from('ad_cooldowns')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let available = true;
    let cooldownEnds: Date | null = null;
    let timeUntilNext = 0;
    let dailyCount = 0;

    if (cooldown) {
      // Réinitialiser le compteur si on change de jour
      if (cooldown.daily_reset_date !== today) {
        dailyCount = 0;
      } else {
        dailyCount = cooldown.daily_count || 0;
      }

      // Vérifier la limite quotidienne
      if (dailyCount >= this.MAX_DAILY_ADS) {
        available = false;
        // Calculer le temps jusqu'à minuit (reset quotidien)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        cooldownEnds = tomorrow;
        timeUntilNext = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
      } 
      // Si pas encore à la limite, vérifier le cooldown fixe
      else if (cooldown.last_ad_watched) {
        const lastWatch = new Date(cooldown.last_ad_watched);
        const cooldownEnd = new Date(lastWatch.getTime() + (this.FIXED_COOLDOWN_SECONDS * 1000));
        
        if (now < cooldownEnd) {
          available = false;
          cooldownEnds = cooldownEnd;
          timeUntilNext = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000);
        }
      }
    }

    return { 
      available, 
      cooldownEnds, 
      timeUntilNext, 
      dailyCount, 
      maxDaily: this.MAX_DAILY_ADS 
    };
  }

  static async updateAfterAdWatch(userId: string): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Récupérer le cooldown actuel pour incrémenter le compteur
    const { data: currentCooldown } = await supabase
      .from('ad_cooldowns')
      .select('daily_count, daily_reset_date')
      .eq('user_id', userId)
      .maybeSingle();

    let newDailyCount = 1;
    
    if (currentCooldown) {
      // Si c'est le même jour, incrémenter le compteur
      if (currentCooldown.daily_reset_date === today) {
        newDailyCount = (currentCooldown.daily_count || 0) + 1;
      }
      // Sinon, c'est un nouveau jour, commencer à 1
    }
    
    const { error } = await supabase
      .from('ad_cooldowns')
      .upsert({
        user_id: userId,
        last_ad_watched: now.toISOString(),
        daily_count: newDailyCount,
        daily_reset_date: today,
        fixed_cooldown_duration: this.FIXED_COOLDOWN_SECONDS,
        updated_at: now.toISOString()
      });

    if (error) throw error;
    
    console.log(`📈 Pub regardée: ${newDailyCount}/${this.MAX_DAILY_ADS} aujourd'hui`);
  }

  static async updateCooldown(userId: string): Promise<void> {
    return this.updateAfterAdWatch(userId);
  }

  static get cooldownHours() {
    return this.FIXED_COOLDOWN_HOURS;
  }
  
  static get maxDailyAds() {
    return this.MAX_DAILY_ADS;
  }
}
