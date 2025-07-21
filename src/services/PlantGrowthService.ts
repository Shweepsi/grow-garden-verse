import { PlantType } from "@/types/game";

export class PlantGrowthService {
  static calculateBaseGrowthTime(plantType: PlantType): number {
    // Temps de base en secondes, ajusté selon la rareté
    switch (plantType.rarity) {
      case 'common': return 60; // 1 minute
      case 'uncommon': return 180; // 3 minutes
      case 'rare': return 420; // 7 minutes
      case 'epic': return 900; // 15 minutes
      case 'legendary': return 1800; // 30 minutes
      default: return 60;
    }
  }

  static calculateHarvestAmount(plantType: PlantType, level: number): number {
    // Montant de récolte de base, ajusté selon le niveau
    const baseAmount = plantType.base_harvest_amount || 10;
    const levelMultiplier = 1 + (level / 10); // Augmente de 10% par niveau
    return Math.floor(baseAmount * levelMultiplier);
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
    if (!boosts) return baseTime;
    
    const growthBoostMultiplier = boosts.getBoostMultiplier('growth_boost');
    const adjustedTime = Math.floor(baseTime * growthBoostMultiplier);
    
    console.log(`Growth time: ${baseTime}s -> ${adjustedTime}s (boost: ${growthBoostMultiplier})`);
    return Math.max(adjustedTime, 5); // Minimum 5 secondes
  }

  static isReadyToHarvest(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): boolean {
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    
    const adjustedGrowthTime = this.calculateGrowthTime(growthTimeSeconds, boosts);
    const requiredTime = adjustedGrowthTime * 1000;
    
    return (now - plantedTime) >= requiredTime;
  }

  static getTimeRemaining(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): number {
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    
    const adjustedGrowthTime = this.calculateGrowthTime(growthTimeSeconds, boosts);
    const requiredTime = adjustedGrowthTime * 1000;
    const elapsed = now - plantedTime;
    
    return Math.max(0, Math.ceil((requiredTime - elapsed) / 1000));
  }
}
