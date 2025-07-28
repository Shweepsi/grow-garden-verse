
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
    if (!boosts) return baseTime;
    
    const growthBoostMultiplier = boosts.getBoostMultiplier('growth_speed');
    // CORRECTED: Growth multiplier should REDUCE time for faster growth
    // A multiplier of 1.15 = 15% faster = time reduced by factor of 1.15
    // A multiplier of 2.0 = 100% faster = time reduced by factor of 2.0
    const adjustedTime = Math.floor(baseTime / growthBoostMultiplier);
    
    console.log(`🌱 Growth boost applied: ${baseTime}s -> ${adjustedTime}s (multiplier: x${growthBoostMultiplier})`);
    return Math.max(adjustedTime, 5); // Minimum 5 secondes
  }

  static isReadyToHarvest(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): boolean {
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    
    const adjustedGrowthTime = this.calculateGrowthTime(growthTimeSeconds, boosts);
    const requiredTime = adjustedGrowthTime * 1000;
    
    return (now - plantedTime) >= requiredTime;
  }

  // Cache for growth time calculations to avoid repeated computations
  private static growthTimeCache = new Map<string, number>();
  private static updateIntervalCache = new Map<number, number>();

  private static getCacheKey(plantedAt: string, growthTimeSeconds: number, boostMultiplier?: number): string {
    return `${plantedAt}_${growthTimeSeconds}_${boostMultiplier || 1}`;
  }

  static getTimeRemaining(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): number {
    const boostMultiplier = boosts?.getBoostMultiplier('growth_speed') || 1;
    const cacheKey = this.getCacheKey(plantedAt, growthTimeSeconds, boostMultiplier);
    
    // Check cache first
    if (this.growthTimeCache.has(cacheKey)) {
      const adjustedGrowthTime = this.growthTimeCache.get(cacheKey)!;
      const plantedTime = new Date(plantedAt).getTime();
      const now = Date.now();
      const requiredTime = adjustedGrowthTime * 1000;
      const elapsed = now - plantedTime;
      return Math.max(0, Math.ceil((requiredTime - elapsed) / 1000));
    }
    
    // Calculate and cache
    const adjustedGrowthTime = this.calculateGrowthTime(growthTimeSeconds, boosts);
    this.growthTimeCache.set(cacheKey, adjustedGrowthTime);
    
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    const requiredTime = adjustedGrowthTime * 1000;
    const elapsed = now - plantedTime;
    
    return Math.max(0, Math.ceil((requiredTime - elapsed) / 1000));
  }

  // Aliases pour compatibilité avec le code existant
  static isPlantReady = this.isReadyToHarvest;
  static formatTimeRemaining = this.getTimeRemaining;
  
  static calculateGrowthProgress(plantedAt: string, growthTimeSeconds: number, boosts?: { getBoostMultiplier: (type: string) => number }): number {
    const boostMultiplier = boosts?.getBoostMultiplier('growth_speed') || 1;
    const cacheKey = this.getCacheKey(plantedAt, growthTimeSeconds, boostMultiplier);
    
    // Check cache first
    if (this.growthTimeCache.has(cacheKey)) {
      const adjustedGrowthTime = this.growthTimeCache.get(cacheKey)!;
      const plantedTime = new Date(plantedAt).getTime();
      const now = Date.now();
      const requiredTime = adjustedGrowthTime * 1000;
      const elapsed = now - plantedTime;
      
      // Calcul précis du pourcentage de progression (0-100)
      const progress = Math.min(100, Math.max(0, (elapsed / requiredTime) * 100));
      return progress;
    }
    
    // Calculate and cache
    const adjustedGrowthTime = this.calculateGrowthTime(growthTimeSeconds, boosts);
    this.growthTimeCache.set(cacheKey, adjustedGrowthTime);
    
    const plantedTime = new Date(plantedAt).getTime();
    const now = Date.now();
    const requiredTime = adjustedGrowthTime * 1000;
    const elapsed = now - plantedTime;
    
    // Calcul précis du pourcentage de progression (0-100)
    const progress = Math.min(100, Math.max(0, (elapsed / requiredTime) * 100));
    return progress;
  }

  // Intervalle de mise à jour optimisé pour la progression en temps réel
  static getOptimalUpdateInterval(growthTimeSeconds?: number): number {
    if (!growthTimeSeconds) return 1000; // 1 seconde par défaut
    
    // Check cache first
    if (this.updateIntervalCache.has(growthTimeSeconds)) {
      return this.updateIntervalCache.get(growthTimeSeconds)!;
    }
    
    // Calculate optimal interval
    let interval: number;
    if (growthTimeSeconds < 60) interval = 250;      // 0.25s pour < 1min
    else if (growthTimeSeconds < 300) interval = 500; // 0.5s pour < 5min
    else if (growthTimeSeconds < 900) interval = 1000; // 1s pour < 15min
    else interval = 2000; // 2s pour les longues croissances
    
    // Cache the result
    this.updateIntervalCache.set(growthTimeSeconds, interval);
    return interval;
  }

  // Clear cache when needed (call this periodically or when memory usage is high)
  static clearCache(): void {
    this.growthTimeCache.clear();
    this.updateIntervalCache.clear();
  }

  // Clean up old cache entries to prevent memory leaks
  static cleanupCache(maxAge: number = 300000): void { // 5 minutes default
    const now = Date.now();
    
    // Clean up growth time cache entries older than maxAge
    for (const [key, value] of this.growthTimeCache.entries()) {
      const timestamp = parseInt(key.split('_')[0]);
      if (now - timestamp > maxAge) {
        this.growthTimeCache.delete(key);
      }
    }
  }
}
