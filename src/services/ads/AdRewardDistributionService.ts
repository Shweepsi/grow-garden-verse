import { supabase } from "@/integrations/supabase/client";
import { AdReward } from "@/types/ads";

export class AdRewardDistributionService {
  static async distributeReward(userId: string, reward: AdReward): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`AdMob: Distributing reward - Type: ${reward.type}, Amount: ${reward.amount}, User: ${userId}`);
      
      switch (reward.type) {
        case 'coins':
          return await this.distributeCoinReward(userId, reward.amount);
        
        case 'gems':
          return await this.distributeGemReward(userId, reward.amount);
        
        case 'coin_boost':
          return await this.distributeCoinBoost(userId, reward.amount, reward.duration || 60);
        
        case 'gem_boost':
          return await this.distributeGemBoost(userId, reward.amount, reward.duration || 30);
        
        case 'growth_boost':
          return await this.distributeGrowthBoost(userId, reward.amount, reward.duration || 30);
        
        default:
          return { success: false, error: `Type de récompense non supporté: ${reward.type}` };
      }
    } catch (error) {
      console.error('Error distributing reward:', error);
      return { success: false, error: 'Erreur lors de la distribution de la récompense' };
    }
  }

  private static async distributeCoinReward(userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
    const { data: garden, error: fetchError } = await supabase
      .from('player_gardens')
      .select('coins')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Erreur lors de la récupération du jardin' };
    }

    const newCoins = (garden.coins || 0) + amount;

    const { error: updateError } = await supabase
      .from('player_gardens')
      .update({ coins: newCoins })
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: 'Erreur lors de la mise à jour des pièces' };
    }

    // Log transaction
    await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: 'ad_reward',
        description: `Récompense publicitaire: ${amount} pièces`
      });

    console.log(`AdMob: Distributed ${amount} coins to user ${userId}. New total: ${newCoins}`);
    return { success: true };
  }

  private static async distributeGemReward(userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
    const { data: garden, error: fetchError } = await supabase
      .from('player_gardens')
      .select('gems')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Erreur lors de la récupération du jardin' };
    }

    const newGems = (garden.gems || 0) + amount;

    const { error: updateError } = await supabase
      .from('player_gardens')
      .update({ gems: newGems })
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: 'Erreur lors de la mise à jour des gemmes' };
    }

    console.log(`AdMob: Distributed ${amount} gems to user ${userId}. New total: ${newGems}`);
    return { success: true };
  }

  private static async distributeCoinBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { error } = await supabase
      .from('active_effects')
      .insert({
        user_id: userId,
        effect_type: 'coin_boost',
        effect_value: multiplier,
        expires_at: expiresAt.toISOString(),
        source: 'ad_reward'
      });

    if (error) {
      return { success: false, error: 'Erreur lors de l\'activation du boost pièces' };
    }

    console.log(`AdMob: Applied coin boost (x${multiplier} for ${durationMinutes}min) to user ${userId}`);
    return { success: true };
  }

  private static async distributeGemBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { error } = await supabase
      .from('active_effects')
      .insert({
        user_id: userId,
        effect_type: 'gem_boost',
        effect_value: multiplier,
        expires_at: expiresAt.toISOString(),
        source: 'ad_reward'
      });

    if (error) {
      return { success: false, error: 'Erreur lors de l\'activation du boost gemmes' };
    }

    console.log(`AdMob: Applied gem boost (x${multiplier} for ${durationMinutes}min) to user ${userId}`);
    return { success: true };
  }

  private static async distributeGrowthBoost(userId: string, reductionPercentage: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const effectValue = 1 - (reductionPercentage / 100); // Convertir en multiplicateur

    const { error } = await supabase
      .from('active_effects')
      .insert({
        user_id: userId,
        effect_type: 'growth_boost',
        effect_value: effectValue,
        expires_at: expiresAt.toISOString(),
        source: 'ad_reward'
      });

    if (error) {
      return { success: false, error: 'Erreur lors de l\'activation du boost croissance' };
    }

    console.log(`AdMob: Applied growth boost (${reductionPercentage}% reduction for ${durationMinutes}min) to user ${userId}`);
    return { success: true };
  }
}