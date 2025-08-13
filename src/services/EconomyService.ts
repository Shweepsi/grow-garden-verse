
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';
import { MINIMUM_COINS_RESERVE, INITIAL_COINS } from '@/constants';

export class EconomyService {
  // Pièces minimum à conserver pour pouvoir continuer à jouer
  static readonly MINIMUM_COINS = MINIMUM_COINS_RESERVE;

  // Système de coût progressif équilibré
  static getPlantDirectCost(plantLevel: number): number {
    if (!plantLevel || plantLevel < 1) return INITIAL_COINS;
    // Progression adoucie : 100 * 1.42^(niveau-1) pour éviter un mur de progression
    return Math.floor(100 * Math.pow(1.42, plantLevel - 1));
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
    plantCostReduction: number = 1,
    permanentMultiplier: number = 1
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
    const result = Math.floor(finalReward * harvestMultiplier * permanentMultiplier);
    
    // Protection contre l'overflow - plafonner à 2 milliards pour integer 32-bit
    return Math.min(result, 2000000000);
  }

  // Expérience avec multiplicateur d'amélioration
  static getExperienceReward(plantLevel: number, expMultiplier: number = 1): number {
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    if (!expMultiplier || expMultiplier < 0.1) expMultiplier = 1;
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
    
    // FIXED: Growth multiplier should REDUCE time, not increase it
    // growthMultiplier of 1.15 means 15% faster growth = 15% less time
    const adjustedTime = baseGrowthSeconds / growthMultiplier;
    
    return Math.max(1, Math.floor(adjustedTime));
  }

  // Vérification d'accès aux plantes
  static canAccessPlant(plantLevel: number, playerLevel: number): boolean {
    if (!plantLevel || !playerLevel) return false;
    return playerLevel >= plantLevel;
  }

  // Calculer le coût d'une plante avec réduction
  static getAdjustedPlantCost(baseCost: number, costReduction: number = 1): number {
    return Math.floor(baseCost * costReduction);
  }

  // Correspondance niveau robot -> plante (basé sur level_required)
  static getRobotPlantLevel(robotLevel: number): number {
    return Math.max(1, Math.min(robotLevel, 10)); // Clamp entre 1 et 10
  }

  // Calculer le revenu passif du robot basé sur son niveau
  static getRobotPassiveIncome(robotLevel: number, harvestMultiplier: number = 1, permanentMultiplier: number = 1): number {
    const plantLevel = this.getRobotPlantLevel(robotLevel);
    
    // Progression exponentielle douce : plus le niveau est élevé, plus c'est rentable
    const baseIncome = 50; // Revenu de base par minute
    const levelMultiplier = Math.pow(plantLevel, 1.6); // Progression exponentielle douce, buffée
    
    const result = Math.floor(baseIncome * levelMultiplier * harvestMultiplier * permanentMultiplier);
    
    // Protection contre l'overflow - plafonner à 2 milliards pour integer 32-bit  
    return Math.min(result, 2000000000);
  }

  // Calculer le niveau de robot maximum basé sur les améliorations
  static getRobotLevel(playerUpgrades: PlayerUpgrade[]): number {
    let maxLevel = 1; // Niveau de base : autoharverst = niveau 1
    
    // Vérifier d'abord si l'auto harvest est débloqué
    const hasAutoHarvest = playerUpgrades.some(upgrade => 
      upgrade.level_upgrades?.effect_type === 'auto_harvest'
    );
    
    if (!hasAutoHarvest) {
      return 0; // Pas de robot si auto harvest pas débloqué
    }
    
    playerUpgrades.forEach(upgrade => {
      const levelUpgrade = upgrade.level_upgrades;
      if (levelUpgrade?.effect_type === 'robot_level') {
        maxLevel = Math.max(maxLevel, Math.floor(levelUpgrade.effect_value));
      }
    });
    
    console.log('🤖 Robot level calculation:', { 
      hasAutoHarvest, 
      robotUpgrades: playerUpgrades.filter(u => u.level_upgrades?.effect_type === 'robot_level').length, 
      maxLevel 
    });
    
    return maxLevel;
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

  // Méthodes pour les récompenses publicitaires
  static getAdCoinReward(baseAmount: number, playerLevel: number, permanentMultiplier: number): number {
    const levelBonus = 1 + (Math.max(0, playerLevel - 1) * 0.05); // 5% par niveau après le niveau 1
    const result = Math.floor(baseAmount * levelBonus * permanentMultiplier);
    
    // Protection contre l'overflow - plafonner à 2 milliards pour integer 32-bit
    return Math.min(result, 2000000000);
  }

  static getAdGemReward(playerLevel: number): number {
    // 5 gemmes de base + 1 par niveau (max 20)
    return Math.min(5 + Math.floor(playerLevel / 2), 20);
  }

  static applyPermanentMultiplier(baseAmount: number, permanentMultiplier: number): number {
    return Math.floor(baseAmount * permanentMultiplier);
  }

  // Calculate gem rewards for harvesting based on plant rarity and gem chance
  static calculateGemReward(rarity: string, gemChance: number): number {
    if (!gemChance || gemChance <= 0) return 0;
    
    // Random check based on gem chance (0-1)
    if (Math.random() > gemChance) return 0;
    
    // Base gem rewards by rarity
    const rarityMultipliers: { [key: string]: number } = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'epic': 5,
      'legendary': 8
    };
    
    const baseGems = rarityMultipliers[rarity?.toLowerCase()] || 1;
    
    // Add some randomness (1-3x base gems)
    const randomMultiplier = 1 + Math.random() * 2;
    
    return Math.floor(baseGems * randomMultiplier);
  }

  // Calculate experience reward (alias for getExperienceReward for consistency)
  static calculateExpReward(plantLevel: number, rarity: string, expMultiplier: number = 1): number {
    // For now, rarity doesn't affect exp but we keep the parameter for future use
    return this.getExperienceReward(plantLevel, expMultiplier);
  }
}
