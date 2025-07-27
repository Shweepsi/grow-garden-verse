
import { PlantType } from "@/types/game";
import { GrowthService, GrowthModifiers } from "./growth/GrowthService";

/**
 * Legacy PlantGrowthService - now acts as a facade to the new GrowthService
 * Maintained for backward compatibility
 */
export class PlantGrowthService {
  static calculateBaseGrowthTime(plantType: PlantType): number {
    return GrowthService.getBaseGrowthTime(plantType);
  }

  static calculateHarvestAmount(plantType: PlantType, level: number): number {
    // Montant de récolte de base selon la rareté
    const baseAmount = this.getBaseAmount(plantType);
    const levelMultiplier = 1 + (level / 10); // Augmente de 10% par niveau
    return Math.floor(baseAmount * levelMultiplier);
  }

  private static getBaseAmount(plantType: PlantType): number {
    switch (plantType.rarity) {
      case 'common': return 10;
      case 'uncommon': return 25;
      case 'rare': return 50;
      case 'epic': return 100;
      case 'legendary': return 200;
      default: return 10;
    }
  }

  static calculateResellPrice(plantType: PlantType, level: number): number {
    // Prix de revente, basé sur le montant de récolte
    const harvestAmount = this.calculateHarvestAmount(plantType, level);
    return Math.floor(harvestAmount * 0.25); // 25% du montant de récolte
  }

  static calculateWaterRequirement(plantType: PlantType): number {
    // Besoins en eau, basés sur la rareté
    switch (plantType.rarity) {
      case 'common': return 1;
      case 'uncommon': return 2;
      case 'rare': return 3;
      case 'epic': return 4;
      case 'legendary': return 5;
      default: return 1;
    }
  }

  static calculateGrowthTime(baseTime: number, boosts?: { getBoostMultiplier: (type: string) => number }): number {
    // Convert old boost interface to new GrowthModifiers
    const modifiers: Partial<GrowthModifiers> = {};
    
    if (boosts) {
      const growthBoostValue = boosts.getBoostMultiplier('growth_boost');
      if (growthBoostValue !== 1) {
        // Convert effect value to multiplier
        modifiers.adBoost = GrowthService.adBoostToMultiplier((1 - growthBoostValue) * 100);
      }
    }
    
    const calculation = GrowthService.calculateGrowthTime(baseTime, modifiers);
    console.log(`Growth time: ${baseTime}s -> ${calculation.finalTimeSeconds}s (boost: ${calculation.totalMultiplier})`);
    return calculation.finalTimeSeconds;
  }

  static isReadyToHarvest(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): boolean {
    // Convert old boost interface to new GrowthModifiers
    const modifiers: Partial<GrowthModifiers> = {};
    
    if (boosts) {
      const growthBoostValue = boosts.getBoostMultiplier('growth_boost');
      if (growthBoostValue !== 1) {
        modifiers.adBoost = GrowthService.adBoostToMultiplier((1 - growthBoostValue) * 100);
      }
    }
    
    return GrowthService.isReadyToHarvest(plantedAt, growthTimeSeconds, modifiers);
  }

  static getTimeRemaining(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): number {
    // Convert old boost interface to new GrowthModifiers
    const modifiers: Partial<GrowthModifiers> = {};
    
    if (boosts) {
      const growthBoostValue = boosts.getBoostMultiplier('growth_boost');
      if (growthBoostValue !== 1) {
        modifiers.adBoost = GrowthService.adBoostToMultiplier((1 - growthBoostValue) * 100);
      }
    }
    
    return GrowthService.getTimeRemaining(plantedAt, growthTimeSeconds, modifiers);
  }

  // Aliases pour compatibilité avec le code existant
  static isPlantReady = PlantGrowthService.isReadyToHarvest;
  static formatTimeRemaining = PlantGrowthService.getTimeRemaining;
  
  static calculateGrowthProgress(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): number {
    // Convert old boost interface to new GrowthModifiers
    const modifiers: Partial<GrowthModifiers> = {};
    
    if (boosts) {
      const growthBoostValue = boosts.getBoostMultiplier('growth_boost');
      if (growthBoostValue !== 1) {
        modifiers.adBoost = GrowthService.adBoostToMultiplier((1 - growthBoostValue) * 100);
      }
    }
    
    return GrowthService.getGrowthProgress(plantedAt, growthTimeSeconds, modifiers);
  }

  // Intervalle de mise à jour optimisé pour la progression en temps réel
  static getOptimalUpdateInterval(growthTimeSeconds?: number): number {
    return GrowthService.getOptimalUpdateInterval(growthTimeSeconds || 60);
  }

  // Legacy cache methods - no longer needed with new implementation
  static clearCache(): void {
    // No-op for backward compatibility
  }

  static cleanupCache(maxAge: number = 300000): void {
    // No-op for backward compatibility
  }
}
