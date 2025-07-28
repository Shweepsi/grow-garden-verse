
import { PlantType, PlayerUpgrade } from "@/types/game";
import { GrowthService } from "./growth/GrowthService";
import { MINIMUM_COINS_RESERVE } from "@/constants";

export class EconomyService {
  // Prix de base des plantes selon leur rareté
  static getPlantPrice(plantType: PlantType): number {
    switch (plantType.rarity) {
      case 'common': return 10;
      case 'uncommon': return 50;
      case 'rare': return 200;
      case 'epic': return 1000;
      case 'legendary': return 5000;
      default: return 10;
    }
  }

  // Récompenses de récolte avec multiplicateur d'amélioration et boost
  static getHarvestReward(
    plantLevel: number,
    harvestMultiplier: number = 1,
    coinBoostMultiplier: number = 1,
    growthTimeSeconds: number,
    permanentMultiplier: number = 1
  ): number {
    // Validation des paramètres
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    if (!harvestMultiplier || harvestMultiplier < 0.1) harvestMultiplier = 1;
    if (!coinBoostMultiplier || coinBoostMultiplier < 0.1) coinBoostMultiplier = 1;
    if (!permanentMultiplier || permanentMultiplier < 0.1) permanentMultiplier = 1;
    if (!growthTimeSeconds || growthTimeSeconds < 1) growthTimeSeconds = 60;

    // Récompense de base selon le niveau
    const baseReward = 10 + (plantLevel * 5);
    
    // Bonus basé sur le temps de croissance
    // Les plantes qui prennent plus de temps donnent plus de récompenses
    const timeBonus = Math.max(1, Math.floor(growthTimeSeconds / 600)) * 0.1; // 10% par 10min (600s)
    const timeBonusMultiplier = 1 + timeBonus;
    
    // Application des multiplicateurs
    const reward = baseReward * harvestMultiplier * coinBoostMultiplier * timeBonusMultiplier * permanentMultiplier;
    
    return Math.floor(reward);
  }

  // Gemmes avec chance et multiplicateur de boost
  static getGemReward(
    plantLevel: number,
    gemChance: number = 0,
    gemBoostMultiplier: number = 1
  ): number {
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    if (!gemChance || gemChance < 0) gemChance = 0;
    if (!gemBoostMultiplier || gemBoostMultiplier < 0.1) gemBoostMultiplier = 1;
    
    const random = Math.random();
    const effectiveChance = Math.min(1, gemChance); // Cap à 100%
    
    if (random < effectiveChance) {
      const baseGems = Math.max(1, Math.floor(plantLevel / 5));
      return Math.floor(baseGems * gemBoostMultiplier);
    }
    return 0;
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
    
    // Use the new GrowthService for consistent calculation
    const calculation = GrowthService.calculateGrowthTime(baseGrowthSeconds, {
      upgrades: growthMultiplier
    });
    
    return calculation.finalTimeSeconds;
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

  /**
   * Calculate the direct planting cost for a plant, based on the required level.
   * The formula is intentionally simple so that older components depending on
   * this helper keep working after the growth-speed refactor.
   *
   * Feel free to tweak the numbers – the important part is to provide a stable
   * implementation so that calls to EconomyService.getPlantDirectCost no longer
   * crash the render cycle.
   */
  static getPlantDirectCost(levelRequired: number): number {
    if (!levelRequired || levelRequired < 1) levelRequired = 1;

    // Quadratic progression keeps prices affordable early game and
    // scales reasonably for higher levels.
    const BASE_PRICE = 25; // base cost for level 1
    return Math.floor(BASE_PRICE * Math.pow(levelRequired, 2));
  }

  /**
   * Check if the player can afford purchasing / planting something that costs
   * a given amount of coins while keeping the mandatory safety reserve.
   */
  static canAffordUpgrade(currentCoins: number, cost: number): boolean {
    if (currentCoins == null || cost == null) return false;
    return currentCoins - cost >= MINIMUM_COINS_RESERVE;
  }

  /**
   * Simpler affordability check that doesn’t take the reserve into account –
   * used for direct plant purchases where we already subtract the reserve
   * outside of this helper.
   */
  static canAffordPlant(currentCoins: number, cost: number): boolean {
    if (currentCoins == null || cost == null) return false;
    return currentCoins >= cost;
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
    const levelMultiplier = Math.pow(plantLevel, 1.5); // Progression exponentielle douce
    
    return Math.floor(baseIncome * levelMultiplier * harvestMultiplier * permanentMultiplier);
  }

  // Calculer le niveau de robot maximum basé sur les améliorations
  static getRobotLevel(playerUpgrades: PlayerUpgrade[]): number {
    let maxLevel = 1; // Niveau de base (pomme de terre)
    
    playerUpgrades.forEach(upgrade => {
      const levelUpgrade = upgrade.level_upgrades;
      if (levelUpgrade?.effect_type === 'robot_level') {
        maxLevel = Math.max(maxLevel, Math.floor(levelUpgrade.effect_value));
      }
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
          // Growth speed upgrades should multiply together for cumulative effect
          // e.g., two 1.15x upgrades = 1.15 * 1.15 = 1.3225x faster
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

  // Calculer le revenu total par minute (robot + récoltes manuelles estimées)
  static calculateIncomePerMinute(
    robotLevel: number,
    playerLevel: number,
    harvestMultiplier: number = 1,
    permanentMultiplier: number = 1
  ): number {
    // Revenu du robot
    const robotIncome = this.getRobotPassiveIncome(robotLevel, harvestMultiplier, permanentMultiplier);
    
    // Estimation des récoltes manuelles (basé sur le niveau du joueur)
    // On estime 2 récoltes par minute en moyenne
    const manualHarvestEstimate = this.getHarvestReward(playerLevel, harvestMultiplier, 1, 60, permanentMultiplier) * 2;
    
    return robotIncome + manualHarvestEstimate;
  }
}
