
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';

export class EconomyService {
  // Pièces minimum à conserver pour pouvoir continuer à jouer
  static readonly MINIMUM_COINS = 100;

  // Système de coût progressif équilibré
  static getPlantDirectCost(plantLevel: number): number {
    if (!plantLevel || plantLevel < 1) return 100;
    // Progression douce : 100 * 1.5^(niveau-1)
    return Math.floor(100 * Math.pow(1.5, plantLevel - 1));
  }

  // Vérifier si l'achat d'une plante est possible (sans restriction)
  static canAffordPlant(currentCoins: number, plantCost: number): boolean {
    return currentCoins >= plantCost;
  }

  // Vérifier si l'achat d'une amélioration est possible avec protection des 100 pièces
  static canAffordUpgrade(currentCoins: number, upgradeCost: number): boolean {
    return currentCoins >= (upgradeCost + this.MINIMUM_COINS);
  }

  // Calculer les récompenses avec multiplicateurs d'améliorations
  static getHarvestReward(
    plantLevel: number, 
    growthTimeSeconds: number,
    playerLevel: number = 1,
    harvestMultiplier: number = 1,
    plantCostReduction: number = 1
  ): number {
    // Validation des paramètres
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    if (!growthTimeSeconds || growthTimeSeconds < 1) growthTimeSeconds = 60;
    if (!playerLevel || playerLevel < 1) playerLevel = 1;
    if (!harvestMultiplier || harvestMultiplier < 0.1) harvestMultiplier = 1;
    
    const baseCost = this.getPlantDirectCost(plantLevel) * plantCostReduction;
    
    // Profit de base de 70% + bonus pour temps long + bonus niveau
    const baseProfit = baseCost * 1.7; // 70% de profit de base
    const timeBonus = Math.max(1, Math.floor(growthTimeSeconds / 600)) * 0.1; // 10% par 10min (600s)
    const levelBonus = 1 + (playerLevel * 0.02); // 2% par niveau du joueur
    
    const finalReward = baseProfit * (1 + timeBonus) * levelBonus;
    return Math.floor(finalReward * harvestMultiplier);
  }

  // Expérience avec multiplicateur d'amélioration
  static getExperienceReward(plantLevel: number, expMultiplier: number = 1): number {
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    // 15 EXP de base + 5 par niveau, avec multiplicateur
    const baseExp = 15 + (plantLevel * 5);
    return Math.floor(baseExp * expMultiplier);
  }

  // Temps de croissance ajusté (maintenant en secondes)
  static getAdjustedGrowthTime(
    baseGrowthSeconds: number,
    growthMultiplier: number = 1
  ): number {
    if (!baseGrowthSeconds || baseGrowthSeconds < 1) baseGrowthSeconds = 60;
    if (!growthMultiplier || growthMultiplier <= 0) growthMultiplier = 1;
    
    return Math.max(1, Math.floor(baseGrowthSeconds / growthMultiplier));
  }

  // Vérification d'accès aux plantes
  static canAccessPlant(plantLevel: number, playerLevel: number): boolean {
    if (!plantLevel || !playerLevel) return false;
    return playerLevel >= plantLevel;
  }

  // Calculer le retour sur investissement
  static getROIPercentage(plantLevel: number, growthTimeSeconds: number): number {
    const cost = this.getPlantDirectCost(plantLevel);
    const reward = this.getHarvestReward(plantLevel, growthTimeSeconds);
    if (cost <= 0) return 0;
    return Math.floor(((reward - cost) / cost) * 100);
  }

  // Calculer le gain par minute
  static getProfitPerMinute(plantLevel: number, growthTimeSeconds: number): number {
    if (!growthTimeSeconds || growthTimeSeconds <= 0) return 0;
    
    const cost = this.getPlantDirectCost(plantLevel);
    const reward = this.getHarvestReward(plantLevel, growthTimeSeconds);
    const profit = reward - cost;
    return Math.floor((profit / growthTimeSeconds) * 60); // Profit par seconde * 60 = par minute
  }

  // Calculer la chance de gemmes lors de la récolte
  static getGemChance(baseChance: number = 0): number {
    return Math.min(0.5, baseChance); // Maximum 50% de chance
  }

  // Calculer le coût d'une plante avec réduction
  static getAdjustedPlantCost(baseCost: number, costReduction: number = 1): number {
    return Math.floor(baseCost * costReduction);
  }

  // Déterminer si une parcelle doit être débloquée automatiquement
  static shouldAutoUnlockPlot(playerLevel: number, plotNumber: number, autoUnlockLevel: number): boolean {
    return playerLevel >= autoUnlockLevel && plotNumber <= autoUnlockLevel;
  }

  // Calculer les multiplicateurs actifs des améliorations
  static calculateActiveMultipliers(playerUpgrades: PlayerUpgrade[]) {
    const multipliers = {
      harvest: 1,
      growth: 1,
      exp: 1,
      plantCostReduction: 1,
      gemChance: 0
    };

    playerUpgrades.forEach(upgrade => {
      const levelUpgrade = upgrade.level_upgrades;
      if (!levelUpgrade) return;

      switch (levelUpgrade.effect_type) {
        case 'harvest_multiplier':
          multipliers.harvest *= levelUpgrade.effect_value;
          break;
        case 'growth_speed':
          multipliers.growth *= levelUpgrade.effect_value;
          break;
        case 'exp_multiplier':
          multipliers.exp *= levelUpgrade.effect_value;
          break;
        case 'plant_cost_reduction':
          multipliers.plantCostReduction *= levelUpgrade.effect_value;
          break;
        case 'gem_chance':
          multipliers.gemChance += levelUpgrade.effect_value;
          break;
      }
    });

    return multipliers;
  }
}
