export class EconomyService {
  static readonly MINIMUM_COINS = 100;

  static canAffordUpgrade(coins: number, cost: number): boolean {
    return coins >= cost + EconomyService.MINIMUM_COINS;
  }

  static canAffordPlanting(coins: number, cost: number): boolean {
    return coins >= cost;
  }

  static calculateActiveMultipliers(playerUpgrades: any[]) {
    let harvestMultiplier = 1;
    let expMultiplier = 1;
    let growthSpeedMultiplier = 1;
    let plantCostMultiplier = 1;
    let gemChance = 0;
    const autoUnlockPlots: number[] = [];

    playerUpgrades.forEach(upgrade => {
      const effectType = upgrade.level_upgrades?.effect_type;
      const effectValue = upgrade.level_upgrades?.effect_value || 1;

      switch (effectType) {
        case 'harvest_multiplier':
          harvestMultiplier *= effectValue;
          break;
        case 'exp_multiplier':
          expMultiplier *= effectValue;
          break;
        case 'growth_speed':
          growthSpeedMultiplier *= effectValue;
          break;
        case 'plant_cost_reduction':
          plantCostMultiplier *= effectValue;
          break;
        case 'gem_chance':
          gemChance += effectValue;
          break;
        case 'auto_unlock':
          autoUnlockPlots.push(effectValue);
          break;
      }
    });

    return {
      harvestMultiplier,
      expMultiplier,
      growthSpeedMultiplier,
      plantCostMultiplier,
      gemChance,
      autoUnlockPlots
    };
  }

  static calculatePlantCost(baseCost: number, multipliers: any) {
    return Math.ceil(baseCost * multipliers.plantCostMultiplier);
  }

  static calculateGrowthTime(baseTime: number, multipliers: any) {
    return Math.ceil(baseTime / multipliers.growthSpeedMultiplier);
  }

  static calculateHarvestReward(baseReward: number, multipliers: any) {
    return Math.ceil(baseReward * multipliers.harvestMultiplier);
  }

  static calculateExpReward(baseExp: number, multipliers: any) {
    return Math.ceil(baseExp * multipliers.expMultiplier);
  }
}
