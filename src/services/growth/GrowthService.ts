import { PlantType } from "@/types/game";

export interface GrowthModifiers {
  upgrades: number;      // Multiplier from permanent upgrades (e.g., 1.3 = 30% faster)
  adBoost: number;       // Multiplier from ad boosts (e.g., 1.5 = 50% faster)
  items: number;         // Multiplier from items/tools (e.g., 2.0 = 100% faster)
}

export interface GrowthCalculation {
  baseTimeSeconds: number;
  finalTimeSeconds: number;
  totalMultiplier: number;
  timeReduction: number;  // Percentage reduction (0-100)
}

/**
 * Centralized service for all plant growth calculations
 */
export class GrowthService {
  // Base growth times by rarity (in seconds)
  private static readonly BASE_GROWTH_TIMES: Record<string, number> = {
    common: 60,        // 1 minute
    uncommon: 180,     // 3 minutes
    rare: 420,         // 7 minutes
    epic: 900,         // 15 minutes
    legendary: 1800,   // 30 minutes
  };

  /**
   * Get base growth time for a plant type
   */
  static getBaseGrowthTime(plantType: PlantType): number {
    return this.BASE_GROWTH_TIMES[plantType.rarity] || 60;
  }

  /**
   * Calculate total growth multiplier from all sources
   */
  static calculateTotalMultiplier(modifiers: Partial<GrowthModifiers>): number {
    const upgrades = modifiers.upgrades || 1;
    const adBoost = modifiers.adBoost || 1;
    const items = modifiers.items || 1;

    // Multiply all modifiers together
    return upgrades * adBoost * items;
  }

  /**
   * Calculate final growth time with all modifiers applied
   */
  static calculateGrowthTime(
    baseTimeSeconds: number,
    modifiers: Partial<GrowthModifiers> = {}
  ): GrowthCalculation {
    const totalMultiplier = this.calculateTotalMultiplier(modifiers);
    
    // Higher multiplier = faster growth = less time
    const finalTimeSeconds = Math.max(5, Math.floor(baseTimeSeconds / totalMultiplier));
    
    // Calculate percentage reduction
    const timeReduction = ((baseTimeSeconds - finalTimeSeconds) / baseTimeSeconds) * 100;

    return {
      baseTimeSeconds,
      finalTimeSeconds,
      totalMultiplier,
      timeReduction: Math.round(timeReduction)
    };
  }

  /**
   * Check if a plant is ready to harvest
   */
  static isReadyToHarvest(
    plantedAt: string,
    growthTimeSeconds: number,
    modifiers: Partial<GrowthModifiers> = {}
  ): boolean {
    const calculation = this.calculateGrowthTime(growthTimeSeconds, modifiers);
    const elapsedMs = Date.now() - new Date(plantedAt).getTime();
    const requiredMs = calculation.finalTimeSeconds * 1000;
    
    return elapsedMs >= requiredMs;
  }

  /**
   * Get remaining time until harvest (in seconds)
   */
  static getTimeRemaining(
    plantedAt: string,
    growthTimeSeconds: number,
    modifiers: Partial<GrowthModifiers> = {}
  ): number {
    const calculation = this.calculateGrowthTime(growthTimeSeconds, modifiers);
    const elapsedMs = Date.now() - new Date(plantedAt).getTime();
    const requiredMs = calculation.finalTimeSeconds * 1000;
    const remainingMs = requiredMs - elapsedMs;
    
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  /**
   * Calculate growth progress (0-100)
   */
  static getGrowthProgress(
    plantedAt: string,
    growthTimeSeconds: number,
    modifiers: Partial<GrowthModifiers> = {}
  ): number {
    const calculation = this.calculateGrowthTime(growthTimeSeconds, modifiers);
    const elapsedMs = Date.now() - new Date(plantedAt).getTime();
    const requiredMs = calculation.finalTimeSeconds * 1000;
    
    const progress = (elapsedMs / requiredMs) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Get optimal update interval based on growth time
   */
  static getOptimalUpdateInterval(growthTimeSeconds: number): number {
    if (growthTimeSeconds < 60) return 250;      // 0.25s for < 1min
    if (growthTimeSeconds < 300) return 500;     // 0.5s for < 5min
    if (growthTimeSeconds < 900) return 1000;    // 1s for < 15min
    return 2000;                                  // 2s for longer
  }

  /**
   * Format time remaining for display
   */
  static formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return "Prêt!";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Convert growth speed upgrade value to multiplier
   * e.g., 1.15 from database means 15% faster = 1.15x multiplier
   */
  static upgradeValueToMultiplier(upgradeValue: number): number {
    return upgradeValue || 1;
  }

  /**
   * Convert ad boost reduction percentage to multiplier
   * e.g., 20% reduction = 1.25x multiplier (1 / 0.8)
   */
  static adBoostToMultiplier(reductionPercentage: number): number {
    if (reductionPercentage <= 0 || reductionPercentage >= 100) return 1;
    return 1 / (1 - reductionPercentage / 100);
  }
}