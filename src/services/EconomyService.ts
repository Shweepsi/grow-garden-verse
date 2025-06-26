
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';

export class EconomyService {
  // Nouveau système de coût progressif plus équilibré
  static getPlantDirectCost(plantLevel: number): number {
    // Progression douce : 100 * 1.5^(niveau-1)
    return Math.floor(100 * Math.pow(1.5, plantLevel - 1));
  }

  // Calculer les récompenses avec profit de 60-80%
  static getHarvestReward(
    plantLevel: number, 
    growthTime: number,
    playerLevel: number = 1,
    harvestMultiplier: number = 1
  ): number {
    const baseCost = this.getPlantDirectCost(plantLevel);
    
    // Profit de base de 70% + bonus pour temps long + bonus niveau
    const baseProfit = baseCost * 1.7; // 70% de profit de base
    const timeBonus = Math.max(1, Math.floor(growthTime / 10)) * 0.1; // 10% par 10min
    const levelBonus = 1 + (playerLevel * 0.02); // 2% par niveau du joueur
    
    const finalReward = baseProfit * (1 + timeBonus) * levelBonus;
    return Math.floor(finalReward * harvestMultiplier);
  }

  // Expérience proportionnelle au niveau de la plante
  static getExperienceReward(plantLevel: number): number {
    // 15 EXP de base + 5 par niveau
    return 15 + (plantLevel * 5);
  }

  // Temps de croissance ajusté (inchangé)
  static getAdjustedGrowthTime(
    baseGrowthMinutes: number,
    growthMultiplier: number = 1
  ): number {
    return Math.max(0.5, baseGrowthMinutes / growthMultiplier);
  }

  // Vérification d'accès aux plantes (inchangé)
  static canAccessPlant(plantLevel: number, playerLevel: number): boolean {
    return playerLevel >= plantLevel;
  }

  // Nouvelle méthode pour calculer le retour sur investissement
  static getROIPercentage(plantLevel: number, growthTime: number): number {
    const cost = this.getPlantDirectCost(plantLevel);
    const reward = this.getHarvestReward(plantLevel, growthTime);
    return Math.floor(((reward - cost) / cost) * 100);
  }

  // Méthode pour calculer le gain par minute
  static getProfitPerMinute(plantLevel: number, growthTime: number): number {
    const cost = this.getPlantDirectCost(plantLevel);
    const reward = this.getHarvestReward(plantLevel, growthTime);
    const profit = reward - cost;
    return Math.floor(profit / growthTime);
  }
}
