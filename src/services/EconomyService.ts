
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';

export class EconomyService {
  // Pièces minimum à conserver pour pouvoir acheter des améliorations
  static readonly MINIMUM_COINS = 100;

  // Nouveau système de coût progressif plus équilibré
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

  // Calculer les récompenses avec profit de 60-80%
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

  // Expérience proportionnelle au niveau de la plante avec bonus possible
  static getExperienceReward(plantLevel: number, expMultiplier: number = 1): number {
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    // 15 EXP de base + 5 par niveau
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

  // Coût de plantation avec réduction possible
  static getAdjustedPlantCost(plantLevel: number, costReduction: number = 1): number {
    const baseCost = this.getPlantDirectCost(plantLevel);
    return Math.floor(baseCost * costReduction);
  }

  // Vérification d'accès aux plantes
  static canAccessPlant(plantLevel: number, playerLevel: number): boolean {
    if (!plantLevel || !playerLevel) return false;
    return playerLevel >= plantLevel;
  }

  // Nouvelle méthode pour calculer le retour sur investissement
  static getROIPercentage(plantLevel: number, growthTimeSeconds: number): number {
    const cost = this.getPlantDirectCost(plantLevel);
    const reward = this.getHarvestReward(plantLevel, growthTimeSeconds);
    if (cost <= 0) return 0;
    return Math.floor(((reward - cost) / cost) * 100);
  }

  // Méthode pour calculer le gain par minute
  static getProfitPerMinute(plantLevel: number, growthTimeSeconds: number): number {
    if (!growthTimeSeconds || growthTimeSeconds <= 0) return 0;
    
    const cost = this.getPlantDirectCost(plantLevel);
    const reward = this.getHarvestReward(plantLevel, growthTimeSeconds);
    const profit = reward - cost;
    return Math.floor((profit / growthTimeSeconds) * 60); // Profit par seconde * 60 = par minute
  }

  // Calculer les multiplicateurs actifs depuis les améliorations du joueur
  static getActiveMultipliers(playerUpgrades: PlayerUpgrade[]) {
    const multipliers = {
      harvest: 1,
      growth: 1,
      experience: 1,
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
          multipliers.experience *= levelUpgrade.effect_value;
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

  // Nouveaux prix d'améliorations basés sur l'économie des plantes (simplifiés)
  static getUpgradeCosts() {
    return {
      // Améliorations de base - accessibles tôt
      basic: {
        coins: 1000,   // ~6-7 récoltes de plantes niveau 1
        gems: 0
      },
      
      // Améliorations intermédiaires 
      intermediate: {
        coins: 2500,   // ~8-10 récoltes de plantes niveau 2-3
        gems: 0
      },
      
      // Améliorations avancées
      advanced: {
        coins: 6000,  // ~15-20 récoltes de plantes niveau 4-5
        gems: 0
      },
      
      // Améliorations premium
      premium: {
        coins: 15000, // ~25-30 récoltes de plantes niveau 6+
        gems: 0
      },
      
      // Améliorations légendaires
      legendary: {
        coins: 40000, // ~40+ récoltes de plantes haut niveau
        gems: 0
      }
    };
  }

  // Calculer le coût d'une amélioration selon son type et niveau requis (sans gemmes)
  static getUpgradeCostByLevel(levelRequired: number, effectType: string): { coins: number; gems: number } {
    const costs = this.getUpgradeCosts();
    
    // Toutes les améliorations sans gemmes maintenant
    if (levelRequired <= 3) return costs.basic;
    if (levelRequired <= 8) return costs.intermediate;
    if (levelRequired <= 15) return costs.advanced;
    if (levelRequired <= 25) return costs.premium;
    return costs.legendary;
  }
}
