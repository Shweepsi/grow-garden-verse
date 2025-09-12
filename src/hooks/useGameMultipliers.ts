import { useUpgrades } from './useUpgrades';
import { useActiveBoosts } from './useActiveBoosts';

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

  /**
   * Retourne uniquement les multiplicateurs permanents (sans boosts temporaires)
   * Utilisé par le robot passif pour éviter qu'il soit affecté par les boosts temporaires
   */
  const getPermanentMultipliersOnly = (): GameMultipliers => {
    const permanentMultipliers = getActiveMultipliers();
    
    return {
      harvest: permanentMultipliers.harvest,
      growth: permanentMultipliers.growth,
      exp: permanentMultipliers.exp,
      plantCostReduction: permanentMultipliers.plantCostReduction,
      gemChance: permanentMultipliers.gemChance,
      coins: 1, // Pas de boost temporaire pour le robot
      gems: 1   // Pas de boost temporaire pour le robot
    };
  };

  const getCompleteMultipliers = (): GameMultipliers => {
    // Récupérer les multiplicateurs permanents des améliorations
    const permanentMultipliers = getActiveMultipliers();
    
    // Récupérer les boosts temporaires
    const coinBoost = getBoostMultiplier('coin_boost');
    const gemBoost = getBoostMultiplier('gem_boost');
    const growthBoost = getBoostMultiplier('growth_speed');
    
    // CORRECTION: gem_boost multiplie la CHANCE de drop, pas la quantité
    const boostedGemChance = permanentMultipliers.gemChance * gemBoost;
    
    if (import.meta.env.DEV) {
      console.debug('[DEBUG] Game Multipliers:', {
        permanent: permanentMultipliers,
        activeBoosts: { coinBoost, gemBoost, growthBoost },
        combined: {
          harvest: permanentMultipliers.harvest * coinBoost,
          growth: permanentMultipliers.growth * growthBoost,
          gemChance: boostedGemChance
        }
      });
    }
    
    return {
      // Multiplicateurs combinés permanents + temporaires
      harvest: permanentMultipliers.harvest * coinBoost,
      growth: permanentMultipliers.growth * growthBoost,
      exp: permanentMultipliers.exp,
      plantCostReduction: permanentMultipliers.plantCostReduction,
      gemChance: boostedGemChance, // Chance boostée, pas quantité
      
      // Boosts spécifiques pour l'application directe
      coins: coinBoost,
      gems: 1 // Plus utilisé pour multiplier la quantité
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

  // Fonction pour appliquer les boosts aux gains de pièces
  const applyCoinsBoost = (amount: number): number => {
    const coinBoostMultiplier = getBoostMultiplier('coin_boost');
    return Math.floor(amount * coinBoostMultiplier);
  };

  // DÉPRÉCIÉ: gem_boost ne multiplie plus la quantité mais la chance
  const applyGemsBoost = (amount: number): number => {
    // Ne plus utiliser - les gemmes sont calculées via la chance boostée
    console.warn('⚠️ applyGemsBoost is deprecated - gems are calculated via boosted chance');
    return amount;
  };

  const applyAllBoosts = (coins: number, gems: number) => {
    return {
      coins: applyCoinsBoost(coins),
      gems: gems // Ne plus appliquer le boost aux gemmes directement
    };
  };

  return {
    getCompleteMultipliers,
    getPermanentMultipliersOnly,
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