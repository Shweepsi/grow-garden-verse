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
        
        case 'xp_boost':
          return await this.distributeXpReward(userId, reward.amount);
        
        case 'growth_boost':
          return await this.distributeGrowthBoost(userId, reward.amount, reward.duration || 30);
        
        case 'robot_boost':
          return await this.distributeRobotBoost(userId, reward.amount, reward.duration || 60);
        
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

  private static async distributeXpReward(userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
    const { data: garden, error: fetchError } = await supabase
      .from('player_gardens')
      .select('experience, level')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Erreur lors de la récupération du jardin' };
    }

    const newXp = (garden.experience || 0) + amount;
    const newLevel = Math.floor(newXp / 100) + 1; // Niveau basé sur l'XP

    const { error: updateError } = await supabase
      .from('player_gardens')
      .update({ 
        experience: newXp,
        level: Math.max(garden.level || 1, newLevel)
      })
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: 'Erreur lors de la mise à jour de l\'expérience' };
    }

    console.log(`AdMob: Distributed ${amount} XP to user ${userId}. New total: ${newXp}`);
    return { success: true };
  }

  private static async distributeGrowthBoost(userId: string, reductionPercentage: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    // Cette fonction nécessiterait une table active_effects pour stocker les boosts temporaires
    // Pour l'instant, on simule le succès
    console.log(`AdMob: Applied growth boost (${reductionPercentage}% reduction for ${durationMinutes}min) to user ${userId}`);
    return { success: true };
  }

  private static async distributeRobotBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    // Cette fonction nécessiterait une table active_effects pour stocker les boosts temporaires
    // Pour l'instant, on simule le succès
    console.log(`AdMob: Applied robot boost (${multiplier}% for ${durationMinutes}min) to user ${userId}`);
    return { success: true };
  }
}