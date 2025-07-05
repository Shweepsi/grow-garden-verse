export class GameBalanceService {
  // Updated costs to match the new database function
  static getUnlockCost(plotNumber: number): number {
    const costs = [0, 300, 800, 2200, 6000, 18000, 50000, 140000, 400000];
    return costs[plotNumber - 1] || 1200000;
  }

  // Nouveau système de récompenses logarithmiques
  static getHarvestReward(plantStage: number, seedPrice: number, level: number = 1, multiplier: number = 1): number {
    // Les récompenses sont proportionnelles au prix de la graine
    const baseReward = Math.floor(seedPrice * 0.2 * plantStage); // 20% du prix par étape
    const levelBonus = Math.floor(level * 2);
    return Math.floor((baseReward + levelBonus) * multiplier);
  }

  static getLevelFromExperience(experience: number): number {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  static getExperienceForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100;
  }
}
