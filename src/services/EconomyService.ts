
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';

export class EconomyService {
  // Nouveau système de coût progressif plus équilibré
  static getPlantDirectCost(plantLevel: number): number {
    if (!plantLevel || plantLevel < 1) return 100;
    // Progression douce : 100 * 1.5^(niveau-1)
    return Math.floor(100 * Math.pow(1.5, plantLevel - 1));
  }

  // Calculer les récompenses avec profit de 60-80%
  static getHarvestReward(
    plantLevel: number, 
    growthTimeSeconds: number,
    playerLevel: number = 1,
    harvestMultiplier: number = 1
  ): number {
    // Validation des paramètres
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    if (!growthTimeSeconds || growthTimeSeconds < 1) growthTimeSeconds = 60;
    if (!playerLevel || playerLevel < 1) playerLevel = 1;
    if (!harvestMultiplier || harvestMultiplier < 0.1) harvestMultiplier = 1;
    
    const baseCost = this.getPlantDirectCost(plantLevel);
    
    // Profit de base de 70% + bonus pour temps long + bonus niveau
    const baseProfit = baseCost * 1.7; // 70% de profit de base
    const timeBonus = Math.max(1, Math.floor(growthTimeSeconds / 600)) * 0.1; // 10% par 10min (600s)
    const levelBonus = 1 + (playerLevel * 0.02); // 2% par niveau du joueur
    
    const finalReward = baseProfit * (1 + timeBonus) * levelBonus;
    return Math.floor(finalReward * harvestMultiplier);
  }

  // Expérience proportionnelle au niveau de la plante
  static getExperienceReward(plantLevel: number): number {
    if (!plantLevel || plantLevel < 1) plantLevel = 1;
    // 15 EXP de base + 5 par niveau
    return 15 + (plantLevel * 5);
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
}
