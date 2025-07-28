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
  const { getBoostMultiplier } = useActiveBoosts();
  const { applyCoinsBoost, applyGemsBoost } = useGameEconomy();

  const getCompleteMultipliers = (): GameMultipliers => {
    // Récupérer les multiplicateurs permanents des améliorations
    const permanentMultipliers = getActiveMultipliers();
    
    // Récupérer les boosts temporaires
    const coinBoost = getBoostMultiplier('coin_boost');
    const gemBoost = getBoostMultiplier('gem_boost');
    const growthBoost = getBoostMultiplier('growth_speed');
    
    console.log('🔧 Game Multipliers:', {
      permanent: permanentMultipliers,
      boosts: { coinBoost, gemBoost, growthBoost },
      combined: {
        harvest: permanentMultipliers.harvest * coinBoost,
        growth: permanentMultipliers.growth * growthBoost
      }
    });
    
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

  const applyAllBoosts = (coins: number, gems: number) => {
    return {
      coins: applyCoinsBoost(coins),
      gems: applyGemsBoost(gems)
    };
  };

  return {
    getCompleteMultipliers,
    applyAllBoosts,
    // Fonctions individuelles pour la compatibilité
    getBoostMultiplier,
    applyCoinsBoost,
    applyGemsBoost
  };
};