import { supabase } from '@/integrations/supabase/client';

/**
 * Service pour gérer l'application des boosts publicitaires
 */
export class AdBoostService {
  
  /**
   * Applique un boost temporaire dans la base de données
   */
  static async applyAdBoost(
    userId: string, 
    effectType: string, 
    effectValue: number, 
    durationMinutes: number = 60
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    await supabase
      .from('active_effects')
      .insert({
        user_id: userId,
        effect_type: effectType,
        effect_value: effectValue,
        expires_at: expiresAt.toISOString(),
        source: 'ad_reward'
      });

    console.log(`🚀 Boost ${effectType} (x${effectValue}) appliqué pour ${durationMinutes} minutes`);
  }

  /**
   * Calcule les multiplicateurs de récompenses publicitaires
   */
  static calculateAdRewardMultipliers(baseAmount: number, playerLevel: number, boostMultipliers: {
    coins: number;
    gems: number;
  }) {
    // Bonus niveau joueur (5% par niveau)
    const levelBonus = 1 + (Math.max(0, playerLevel - 1) * 0.05);
    
    // Application des boosts
    const boostedAmount = Math.floor(baseAmount * levelBonus * boostMultipliers.coins);
    
    return {
      baseAmount,
      levelBonus,
      boostMultiplier: boostMultipliers.coins,
      finalAmount: boostedAmount
    };
  }

  /**
   * Formate les informations de boost pour l'affichage
   */
  static formatBoostInfo(effectType: string, effectValue: number): { 
    icon: string; 
    label: string; 
    description: string;
  } {
    switch (effectType) {
      case 'coin_boost':
        return {
          icon: '🪙',
          label: `Pièces ×${effectValue}`,
          description: `Multiplie les gains de pièces par ${effectValue} pendant 1 heure`
        };
      case 'gem_boost':
        return {
          icon: '💎',
          label: `Gemmes ×${effectValue}`,
          description: `Multiplie les gains de gemmes par ${effectValue} pendant 1 heure`
        };
      case 'growth_boost':
        return {
          icon: '⚡',
          label: `Croissance -${Math.round((1 - (1/effectValue)) * 100)}%`,
          description: `Réduit le temps de croissance des plantes de ${Math.round((1 - (1/effectValue)) * 100)}% pendant 1 heure`
        };
      default:
        return {
          icon: '🎁',
          label: 'Boost',
          description: 'Bonus temporaire'
        };
    }
  }
}