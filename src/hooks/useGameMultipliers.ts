import { useUpgrades } from './useUpgrades';
import { useActiveBoosts } from './useActiveBoosts';
import { useGameEconomy } from './useGameEconomy';

export interface GameMultipliers {
  harvest: number;
  growth: number;
  exp: number;
  plantCostReduction: number;
  gemChance: number;
  coins: number;
  gems: number;
}

/**
 * Hook unifié pour calculer tous les multiplicateurs du jeu
 * Combine les améliorations permanentes et les boosts temporaires
 */
export const useGameMultipliers = () => {
  const { getActiveMultipliers } = useUpgrades();
  const { getBoostMultiplier, boosts } = useActiveBoosts();
  const { applyCoinsBoost, applyGemsBoost } = useGameEconomy();

  const getCompleteMultipliers = (): GameMultipliers => {
    // Récupérer les multiplicateurs permanents des améliorations
    const permanentMultipliers = getActiveMultipliers();
    
    // Récupérer les boosts temporaires
    const coinBoost = getBoostMultiplier('coin_boost');
    const gemBoost = getBoostMultiplier('gem_boost');
    const growthBoost = getBoostMultiplier('growth_speed');
    
    if (import.meta.env.DEV) {
      // Only log detailed multiplier information while developing.
      console.debug('[DEBUG] Game Multipliers:', {
        permanent: permanentMultipliers,
        activeBoosts: { coinBoost, gemBoost, growthBoost },
        combined: {
          harvest: permanentMultipliers.harvest * coinBoost,
          growth: permanentMultipliers.growth * growthBoost
        }
      });
    }
    
    return {
      // Multiplicateurs combinés permanents + temporaires
      harvest: permanentMultipliers.harvest * coinBoost,
      growth: permanentMultipliers.growth * growthBoost,
      exp: permanentMultipliers.exp, // Pas de boost temporaire XP pour l'instant
      plantCostReduction: permanentMultipliers.plantCostReduction,
      gemChance: permanentMultipliers.gemChance,
      
      // Boosts spécifiques pour l'application directe
      coins: coinBoost,
      gems: gemBoost
    };
  };
  
  /**
   * Return the FINAL multiplier that should be applied for a given effect type.
   * This helper merges the permanent multipliers coming from upgrades with any
   * temporary boost that might currently be active so that callers do not need
   * to worry about combining them manually. Only the effect types that are
   * presently used in the codebase are handled – other values default to 1.
   */
  const getCombinedBoostMultiplier = (effectType: string): number => {
    const multipliers = getCompleteMultipliers();

    switch (effectType) {
      case 'growth_speed':
      case 'growth_boost':
        return multipliers.growth;

      case 'harvest_multiplier':
        return multipliers.harvest;

      case 'exp_multiplier':
        return multipliers.exp;

      case 'plant_cost_reduction':
        return multipliers.plantCostReduction;

      case 'coin_boost':
        return multipliers.coins;

      case 'gem_boost':
        return multipliers.gems;

      default:
        return 1;
    }
  };

  const applyAllBoosts = (coins: number, gems: number) => {
    return {
      coins: applyCoinsBoost(coins),
      gems: applyGemsBoost(gems)
    };
  };

  return {
    getCompleteMultipliers,
    applyAllBoosts,
    // New unified helper so that external code (growth timers, etc.) can use
    // the same source of truth for multipliers.
    getCombinedBoostMultiplier,
    // Fonctions individuelles pour la compatibilité
    getBoostMultiplier,
    applyCoinsBoost,
    applyGemsBoost
  };
};