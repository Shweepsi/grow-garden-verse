import { supabase } from "@/integrations/supabase/client";
import { AdReward } from "@/types/ads";
import { gameDataEmitter } from "@/hooks/useGameDataNotifier";

export class AdRewardDistributionService {
  static async distributeReward(userId: string, reward: AdReward): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`AdMob: Distributing reward - Type: ${reward.type}, Amount: ${reward.amount}, Duration: ${reward.duration}, User: ${userId}`);
      console.log('AdMob: Full reward object:', reward);
      
      switch (reward.type) {
        case 'coins':
          return await this.distributeCoinReward(userId, reward.amount);
        
        case 'gems':
          return await this.distributeGemReward(userId, reward.amount);
        
        case 'coin_boost':
          return await this.distributeCoinBoost(userId, reward.amount, reward.duration || 60);
        
        case 'gem_boost':
          return await this.distributeGemBoost(userId, reward.amount, reward.duration || 30);
        
        case 'growth_speed':
          console.log(`AdMob: Growth speed reward - duration: ${reward.duration}, using: ${reward.duration || 60}`);
          return await this.distributeGrowthBoost(userId, reward.amount, reward.duration || 60);
        
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
    
    // Notify for instant UI updates
    gameDataEmitter.emit('reward-claimed');
    gameDataEmitter.emit('coins-claimed');
    
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
    
    // Notify for instant UI updates
    gameDataEmitter.emit('reward-claimed');
    gameDataEmitter.emit('gems-claimed');
    
    return { success: true };
  }

  private static async distributeCoinBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    // Vérifier s'il y a déjà un boost actif du même type
    const { data: existingBoosts, error: fetchError } = await supabase
      .from('active_effects')
      .select('*')
      .eq('user_id', userId)
      .eq('effect_type', 'coin_boost')
      .eq('source', 'ad_reward')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });

    if (fetchError) {
      return { success: false, error: 'Erreur lors de la vérification des boosts existants' };
    }

    if (existingBoosts && existingBoosts.length > 0) {
      // Accumuler le temps : ajouter la durée au boost existant le plus long
      const latestBoost = existingBoosts[0];
      const currentExpiresAt = new Date(latestBoost.expires_at);
      const newExpiresAt = new Date(currentExpiresAt.getTime() + durationMinutes * 60 * 1000);

      const { error: updateError } = await supabase
        .from('active_effects')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', latestBoost.id);

      if (updateError) {
        return { success: false, error: 'Erreur lors de l\'extension du boost pièces' };
      }

      console.log(`AdMob: Extended coin boost by ${durationMinutes}min for user ${userId}. New expiry: ${newExpiresAt.toISOString()}`);
      
      // Notify for instant UI updates
      gameDataEmitter.emit('reward-claimed');
      gameDataEmitter.emit('boost-claimed');
    } else {
      // Créer un nouveau boost
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
      
      // Notify for instant UI updates
      gameDataEmitter.emit('reward-claimed');
      gameDataEmitter.emit('boost-claimed');
    }

    return { success: true };
  }

  private static async distributeGemBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    // Vérifier s'il y a déjà un boost actif du même type
    const { data: existingBoosts, error: fetchError } = await supabase
      .from('active_effects')
      .select('*')
      .eq('user_id', userId)
      .eq('effect_type', 'gem_boost')
      .eq('source', 'ad_reward')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });

    if (fetchError) {
      return { success: false, error: 'Erreur lors de la vérification des boosts existants' };
    }

    if (existingBoosts && existingBoosts.length > 0) {
      // Accumuler le temps : ajouter la durée au boost existant le plus long
      const latestBoost = existingBoosts[0];
      const currentExpiresAt = new Date(latestBoost.expires_at);
      const newExpiresAt = new Date(currentExpiresAt.getTime() + durationMinutes * 60 * 1000);

      const { error: updateError } = await supabase
        .from('active_effects')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', latestBoost.id);

      if (updateError) {
        return { success: false, error: 'Erreur lors de l\'extension du boost gemmes' };
      }

      console.log(`AdMob: Extended gem boost by ${durationMinutes}min for user ${userId}. New expiry: ${newExpiresAt.toISOString()}`);
    } else {
      // Créer un nouveau boost
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
    }

    return { success: true };
  }

  // Boost de croissance : le paramètre "multiplier" est un multiplicateur (>1) qui accélère la croissance.
  private static async distributeGrowthBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    // Vérifier s'il y a déjà un boost actif du même type
    const { data: existingBoosts, error: fetchError } = await supabase
      .from('active_effects')
      .select('*')
      .eq('user_id', userId)
      .eq('effect_type', 'growth_speed')
      .eq('source', 'ad_reward')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });

    if (fetchError) {
      return { success: false, error: 'Erreur lors de la vérification des boosts existants' };
    }

    if (existingBoosts && existingBoosts.length > 0) {
      // Accumuler le temps : ajouter la durée au boost existant le plus long
      const latestBoost = existingBoosts[0];
      const currentExpiresAt = new Date(latestBoost.expires_at);
      const newExpiresAt = new Date(currentExpiresAt.getTime() + durationMinutes * 60 * 1000);

      const { error: updateError } = await supabase
        .from('active_effects')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', latestBoost.id);

      if (updateError) {
        return { success: false, error: 'Erreur lors de l\'extension du boost croissance' };
      }

      console.log(`AdMob: Extended growth boost by ${durationMinutes}min for user ${userId}. New expiry: ${newExpiresAt.toISOString()}`);
    } else {
      // Créer un nouveau boost
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      const { error } = await supabase
        .from('active_effects')
        .insert({
          user_id: userId,
          effect_type: 'growth_speed',
          effect_value: multiplier,
          expires_at: expiresAt.toISOString(),
          source: 'ad_reward'
        });

      if (error) {
        return { success: false, error: "Erreur lors de l'activation du boost croissance" };
      }

      console.log(`AdMob: Applied growth boost (x${multiplier} for ${durationMinutes}min) to user ${userId}`);
    }

    return { success: true };
  }
}