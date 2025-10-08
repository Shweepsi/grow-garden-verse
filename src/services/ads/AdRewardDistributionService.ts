import { supabase } from "@/integrations/supabase/client";
import { AdReward } from "@/types/ads";
import { gameDataEmitter } from "@/hooks/useGameDataNotifier";

export class AdRewardDistributionService {
  static async distributeReward(userId: string, reward: AdReward): Promise<{ success: boolean; error?: string }> {
    try {
      // Get player data for scaling calculations
      const { data: playerData } = await supabase
        .from('player_gardens')
        .select('level, prestige_level')
        .eq('user_id', userId)
        .single();

      const playerLevel = playerData?.level || 1;
      const prestigeLevel = playerData?.prestige_level || 0;
      
      // Apply scaling to rewards based on player progression
      const scaledReward = this.scaleRewardByProgression(reward, playerLevel, prestigeLevel);
      
      console.log(`AdMob: Distributing scaled reward - Type: ${scaledReward.type}, Original: ${reward.amount}, Scaled: ${scaledReward.amount}, Duration: ${scaledReward.duration}, User: ${userId}`);
      console.log('AdMob: Player progression - Level:', playerLevel, 'Prestige:', prestigeLevel);
      
      switch (scaledReward.type) {
        case 'coins':
          return await this.distributeCoinReward(userId, scaledReward.amount);
        
        case 'gems':
          return await this.distributeGemReward(userId, scaledReward.amount);
        
        case 'coin_boost':
          return await this.distributeCoinBoost(userId, scaledReward.amount, scaledReward.duration || 60);
        
        case 'gem_boost':
          return await this.distributeGemBoost(userId, scaledReward.amount, scaledReward.duration || 30);
        
        case 'growth_speed':
          const effectiveDuration = scaledReward.duration || 60;
          console.log(`AdMob: Growth speed reward - original duration: ${scaledReward.duration}, effective duration: ${effectiveDuration}`);
          return await this.distributeGrowthBoost(userId, scaledReward.amount, effectiveDuration);
        
        case 'exp_boost':
          return await this.distributeExpBoost(userId, scaledReward.amount, scaledReward.duration || 30);
          
        case 'harvest_boost':
          return await this.distributeHarvestBoost(userId, scaledReward.amount, scaledReward.duration || 60);
        
        default:
          return { success: false, error: `Type de récompense non supporté: ${scaledReward.type}` };
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

  private static async distributeExpBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { error } = await supabase
      .from('active_effects')
      .insert({
        user_id: userId,
        effect_type: 'exp_multiplier',
        effect_value: multiplier,
        expires_at: expiresAt.toISOString(),
        source: 'ad_reward'
      });

    if (error) {
      return { success: false, error: "Erreur lors de l'activation du boost d'expérience" };
    }

    console.log(`AdMob: Applied exp boost (x${multiplier} for ${durationMinutes}min) to user ${userId}`);
    gameDataEmitter.emit('reward-claimed');
    gameDataEmitter.emit('boost-claimed');
    
    return { success: true };
  }

  private static async distributeHarvestBoost(userId: string, multiplier: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { error } = await supabase
      .from('active_effects')
      .insert({
        user_id: userId,
        effect_type: 'harvest_multiplier',
        effect_value: multiplier,
        expires_at: expiresAt.toISOString(),
        source: 'ad_reward'
      });

    if (error) {
      return { success: false, error: "Erreur lors de l'activation du boost de récolte" };
    }

    console.log(`AdMob: Applied harvest boost (x${multiplier} for ${durationMinutes}min) to user ${userId}`);
    gameDataEmitter.emit('reward-claimed');
    gameDataEmitter.emit('boost-claimed');
    
    return { success: true };
  }

  /**
   * Scale ad rewards based on player progression
   * Higher level and prestige players get better rewards
   */
  private static scaleRewardByProgression(reward: AdReward, playerLevel: number, prestigeLevel: number): AdReward {
    const levelMultiplier = 1 + (playerLevel - 1) * 0.05; // 5% per level
    const prestigeMultiplier = 1 + prestigeLevel * 0.3; // 30% per prestige
    const totalMultiplier = levelMultiplier * prestigeMultiplier;

    // Cap the multiplier to prevent excessive scaling
    const cappedMultiplier = Math.min(totalMultiplier, 5.0);

    let scaledAmount = reward.amount;
    let scaledDuration = reward.duration;

    switch (reward.type) {
      case 'coins':
      case 'gems':
        // Direct rewards scale with amount
        scaledAmount = Math.floor(reward.amount * cappedMultiplier);
        break;
      
      case 'coin_boost':
      case 'gem_boost':
      case 'growth_speed':
      case 'exp_boost':
      case 'harvest_boost':
        // Boost rewards scale with duration
        scaledDuration = Math.floor((reward.duration || 60) * Math.min(cappedMultiplier, 2.5));
        break;
    }

    return {
      ...reward,
      amount: scaledAmount,
      duration: scaledDuration
    };
  }
}