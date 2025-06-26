
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';

export class EconomyService {
  // Calculer le prix d'une plante selon son niveau (1-10)
  static getPlantDirectCost(plantLevel: number): number {
    // Progression simple : 50 * niveau^2
    return 50 * Math.pow(plantLevel, 2);
  }

  // Calculer les récompenses de récolte avec multiplicateurs
  static getHarvestReward(
    plantLevel: number, 
    growthTime: number,
    playerLevel: number = 1,
    harvestMultiplier: number = 1
  ): number {
    const baseCost = this.getPlantDirectCost(plantLevel);
    const timeBonus = Math.max(1, Math.floor(growthTime / 30)); // Bonus pour temps long
    const levelBonus = 1 + (playerLevel * 0.05); // 5% par niveau
    
    const baseReward = baseCost * 1.5 * timeBonus * levelBonus;
    return Math.floor(baseReward * harvestMultiplier);
  }

  // Calculer l'expérience gagnée
  static getExperienceReward(plantLevel: number): number {
    const baseExp = 10;
    const levelMultiplier = Math.pow(1.2, plantLevel - 1);
    
    return Math.floor(baseExp * levelMultiplier);
  }

  // Calculer le temps de croissance ajusté selon les multiplicateurs
  static getAdjustedGrowthTime(
    baseGrowthMinutes: number,
    growthMultiplier: number = 1
  ): number {
    return Math.max(0.5, baseGrowthMinutes / growthMultiplier);
  }

  // Vérifier si le joueur peut accéder à une plante selon son niveau
  static canAccessPlant(plantLevel: number, playerLevel: number): boolean {
    return playerLevel >= plantLevel;
  }
}
