import { useUpgrades } from './useUpgrades';
import { useActiveBoosts } from './useActiveBoosts';
import { useGameEconomy } from './useGameEconomy';
import { useEarlyAccessPerks } from './useEarlyAccessPerks';

export interface GameMultipliers {
  harvest: number;
  growth: number;
  exp: number;
  plantCostReduction: number;
  gemChance: number;
  coins: number;
  gems: number;
  earlyAccess: number;
}

/**
 * Hook unifié pour calculer tous les multiplicateurs du jeu
 * Combine les améliorations permanentes et les boosts temporaires
 */
export const useGameMultipliers = () => {
  const { getActiveMultipliers } = useUpgrades();
  const { getBoostMultiplier, boosts } = useActiveBoosts();
  const { applyCoinsBoost, applyGemsBoost } = useGameEconomy();
  const { getEarlyAccessMultiplier } = useEarlyAccessPerks();

  const getCompleteMultipliers = (): GameMultipliers => {
    // Récupérer les multiplicateurs permanents des améliorations
    const permanentMultipliers = getActiveMultipliers();
    
    // Récupérer les boosts temporaires
    const coinBoost = getBoostMultiplier('coin_boost');
    const gemBoost = getBoostMultiplier('gem_boost');
    const growthBoost = getBoostMultiplier('growth_speed');
    
    // Récupérer le multiplicateur Early Access
    const earlyAccessMultiplier = getEarlyAccessMultiplier();
    
    console.log('🔧 Game Multipliers DEBUG:', {
      permanent: permanentMultipliers,
      activeBoosts: { coinBoost, gemBoost, growthBoost },
      earlyAccess: earlyAccessMultiplier,
      allBoosts: boosts, // Debug: voir tous les boosts récupérés
      combined: {
        harvest: permanentMultipliers.harvest * coinBoost * earlyAccessMultiplier,
        growth: permanentMultipliers.growth * growthBoost
      }
    });
    
    return {
      // Multiplicateurs combinés permanents + temporaires + Early Access
      harvest: permanentMultipliers.harvest * coinBoost * earlyAccessMultiplier,
      growth: permanentMultipliers.growth * growthBoost,
      exp: permanentMultipliers.exp, // Pas de boost temporaire XP pour l'instant
      plantCostReduction: permanentMultipliers.plantCostReduction,
      gemChance: permanentMultipliers.gemChance,
      
      // Boosts spécifiques pour l'application directe
      coins: coinBoost * earlyAccessMultiplier,
      gems: gemBoost,
      earlyAccess: earlyAccessMultiplier
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