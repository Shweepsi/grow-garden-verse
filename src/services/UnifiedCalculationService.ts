import { PlantType, GardenPlot, PlayerGarden } from '@/types/game';

/**
 * Unified calculation service - Single source of truth for all game calculations
 * Eliminates divergences between frontend and backend by using consistent logic
 */
export class UnifiedCalculationService {

  /**
   * CORE CALCULATION: Plant readiness check
   * This is the single source of truth used by both frontend and backend
   */
  static isPlantReady(plantedAt: string, plot: GardenPlot, boostMultiplier: number = 1): boolean {
    if (!plantedAt || !plot.growth_time_seconds) return false;
    
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    const adjustedGrowthTime = this.calculateAdjustedGrowthTime(plot.growth_time_seconds, boostMultiplier);
    const requiredTime = adjustedGrowthTime * 1000;
    
    return (now - plantedTime) >= requiredTime;
  }

  /**
   * CORE CALCULATION: Adjusted growth time with boosts
   * Growth multiplier REDUCES time (faster growth)
   */
  static calculateAdjustedGrowthTime(baseGrowthTimeSeconds: number, growthMultiplier: number = 1): number {
    if (!baseGrowthTimeSeconds || baseGrowthTimeSeconds < 1) return 60;
    if (!growthMultiplier || growthMultiplier <= 0) growthMultiplier = 1;
    
    // Growth multiplier reduces time: 1.5x speed = time / 1.5
    const adjustedTime = Math.floor(baseGrowthTimeSeconds / growthMultiplier);
    return Math.max(1, adjustedTime);
  }

  /**
   * CORE CALCULATION: Time remaining until plant is ready
   */
  static getTimeRemaining(plantedAt: string, plot: GardenPlot, boostMultiplier: number = 1): number {
    if (!plantedAt || !plot.growth_time_seconds) return 0;
    
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    const adjustedGrowthTime = this.calculateAdjustedGrowthTime(plot.growth_time_seconds, boostMultiplier);
    const requiredTime = adjustedGrowthTime * 1000;
    const elapsed = now - plantedTime;
    
    return Math.max(0, requiredTime - elapsed);
  }

  /**
   * CORE CALCULATION: Growth progress percentage
   */
  static getGrowthProgress(plantedAt: string, plot: GardenPlot, boostMultiplier: number = 1): number {
    if (!plantedAt || !plot.growth_time_seconds) return 0;
    
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    const adjustedGrowthTime = this.calculateAdjustedGrowthTime(plot.growth_time_seconds, boostMultiplier);
    const requiredTime = adjustedGrowthTime * 1000;
    const elapsed = now - plantedTime;
    
    return Math.min(100, (elapsed / requiredTime) * 100);
  }

  /**
   * CORE CALCULATION: Harvest reward calculation
   * This ensures consistency between frontend predictions and backend calculations
   */
  static calculateHarvestReward(
    plantLevel: number,
    plot: GardenPlot,
    playerLevel: number = 1,
    harvestMultiplier: number = 1,
    plantCostReduction: number = 1,
    permanentMultiplier: number = 1
  ): number {
    // Base reward logic
    const levelFactor = Math.max(1, plantLevel);
    const playerLevelBonus = Math.max(1, playerLevel * 0.1);
    
    // Calculate base reward
    let baseReward = Math.floor(levelFactor * 10 * playerLevelBonus);
    
    // Apply all multipliers consistently
    const totalMultiplier = harvestMultiplier * permanentMultiplier;
    
    const finalReward = Math.floor(baseReward * totalMultiplier);
    
    return Math.max(1, finalReward);
  }

  /**
   * CORE CALCULATION: Experience reward calculation
   */
  static calculateExpReward(plantLevel: number, rarity: string, expMultiplier: number = 1): number {
    const rarityMultipliers = {
      'common': 1,
      'uncommon': 1.5,
      'rare': 2,
      'epic': 3,
      'legendary': 5
    };
    
    const baseExp = Math.max(1, plantLevel * 2);
    const rarityMultiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1;
    
    return Math.floor(baseExp * rarityMultiplier * expMultiplier);
  }

  /**
   * CORE CALCULATION: Gem reward calculation (with deterministic option for backend)
   */
  static calculateGemReward(gemChance: number, useRandomness: boolean = true): number {
    if (!useRandomness) {
      // Deterministic calculation for backend consistency
      return gemChance >= 0.15 ? 1 : 0; // 15% base chance
    }
    
    const chance = Math.max(0, Math.min(1, gemChance));
    return Math.random() < chance ? 1 : 0;
  }

  /**
   * CORE CALCULATION: Plant direct cost
   */
  static getPlantDirectCost(plantLevel: number): number {
    const baseCost = Math.max(1, plantLevel) * 10;
    return Math.floor(baseCost);
  }

  /**
   * CORE CALCULATION: Robot passive income
   */
  static getRobotPassiveIncome(robotLevel: number, harvestMultiplier: number = 1, permanentMultiplier: number = 1): number {
    if (robotLevel <= 0) return 0;
    
    // Base income per level
    const baseIncome = robotLevel * 5;
    const totalMultiplier = harvestMultiplier * permanentMultiplier;
    
    return Math.floor(baseIncome * totalMultiplier);
  }

  /**
   * UTILITY: Enhanced plant harvest check with detailed information
   */
  static canHarvestPlant(plot: GardenPlot, boostMultiplier: number = 1): { canHarvest: boolean; reason?: string; timeRemaining?: number } {
    if (!plot) {
      return { canHarvest: false, reason: 'No plot data' };
    }
    
    if (!plot.plant_type || !plot.planted_at) {
      return { canHarvest: false, reason: 'No plant on this plot' };
    }
    
    if (!plot.growth_time_seconds) {
      return { canHarvest: false, reason: 'Invalid growth time' };
    }
    
    const isReady = this.isPlantReady(plot.planted_at, plot, boostMultiplier);
    
    if (!isReady) {
      const timeRemaining = this.getTimeRemaining(plot.planted_at, plot, boostMultiplier);
      return { 
        canHarvest: false, 
        reason: 'Plant not ready yet', 
        timeRemaining 
      };
    }
    
    return { canHarvest: true };
  }

  /**
   * UTILITY: Get robot level from player upgrades
   */
  static getRobotLevel(playerUpgrades: any[]): number {
    if (!Array.isArray(playerUpgrades)) return 0;
    
    const robotUpgrades = playerUpgrades.filter(upgrade => 
      upgrade.active && upgrade.upgrade_name?.includes('robot')
    );
    
    return robotUpgrades.length;
  }

  /**
   * UTILITY: Calculate active multipliers from player upgrades
   */
  static calculateActiveMultipliers(playerUpgrades: any[]): {
    harvest: number;
    growth: number;
    exp: number;
    plantCostReduction: number;
    gemChance: number;
  } {
    if (!Array.isArray(playerUpgrades)) {
      return { harvest: 1, growth: 1, exp: 1, plantCostReduction: 1, gemChance: 0 };
    }

    const multipliers = {
      harvest: 1,
      growth: 1,
      exp: 1,
      plantCostReduction: 1,
      gemChance: 0
    };

    playerUpgrades.forEach(upgrade => {
      if (!upgrade.active || !upgrade.effect_type || !upgrade.effect_value) return;

      switch (upgrade.effect_type) {
        case 'harvest_multiplier':
          multipliers.harvest *= upgrade.effect_value;
          break;
        case 'growth_speed':
          multipliers.growth *= upgrade.effect_value;
          break;
        case 'exp_multiplier':
          multipliers.exp *= upgrade.effect_value;
          break;
        case 'plant_cost_reduction':
          multipliers.plantCostReduction *= upgrade.effect_value;
          break;
        case 'gem_chance':
          multipliers.gemChance += upgrade.effect_value;
          break;
      }
    });

    return multipliers;
  }

  /**
   * Create parameters object for backend synchronization
   */
  static createBackendParams(
    plot: GardenPlot,
    plantType: PlantType,
    garden: PlayerGarden,
    multipliers: any
  ) {
    const plantLevel = Math.max(1, plantType.level_required || 1);
    const playerLevel = Math.max(1, garden.level || 1);
    
    return {
      actualGrowthTime: plot.growth_time_seconds || plantType.base_growth_seconds || 60,
      harvestReward: this.calculateHarvestReward(
        plantLevel,
        plot,
        playerLevel,
        multipliers.harvest || 1,
        multipliers.plantCostReduction || 1,
        garden.permanent_multiplier || 1
      ),
      expReward: this.calculateExpReward(
        plantLevel,
        plantType.rarity || 'common',
        multipliers.exp || 1
      ),
      gemReward: this.calculateGemReward(multipliers.gemChance || 0, false), // Deterministic for backend
      multipliers
    };
  }
}