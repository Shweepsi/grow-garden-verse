
export class GameBalanceService {
  static getUnlockCost(plotNumber: number): number {
    const costs = [0, 100, 200, 350, 500, 700, 1000, 1500, 2000];
    return costs[plotNumber - 1] || 0;
  }

  static getHarvestReward(plantStage: number, level: number = 1, multiplier: number = 1): number {
    const baseReward = plantStage * 15;
    const levelBonus = Math.floor(level / 5) * 5;
    return Math.floor((baseReward + levelBonus) * multiplier);
  }

  static getExperienceReward(plantStage: number): number {
    return plantStage * 10;
  }

  static getLevelFromExperience(experience: number): number {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  static getExperienceForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100;
  }

  static getDropChance(rarity: string): number {
    switch (rarity) {
      case 'legendary': return 0.05;
      case 'rare': return 0.15;
      case 'uncommon': return 0.30;
      default: return 0.50;
    }
  }
}
