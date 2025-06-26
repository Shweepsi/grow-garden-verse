
export class GameBalanceService {
  // Nouveaux coûts logarithmiques pour les parcelles
  static getUnlockCost(plotNumber: number): number {
    const costs = [0, 500, 2000, 8000, 30000, 100000, 500000, 2000000, 10000000];
    return costs[plotNumber - 1] || 50000000;
  }

  // Nouveau système de récompenses logarithmiques
  static getHarvestReward(plantStage: number, seedPrice: number, level: number = 1, multiplier: number = 1): number {
    // Les récompenses sont proportionnelles au prix de la graine
    const baseReward = Math.floor(seedPrice * 0.2 * plantStage); // 20% du prix par étape
    const levelBonus = Math.floor(level * 2);
    return Math.floor((baseReward + levelBonus) * multiplier);
  }

  static getExperienceReward(plantStage: number, rarity: string): number {
    const baseExp = plantStage * 10;
    const rarityMultiplier = this.getRarityMultiplier(rarity);
    return Math.floor(baseExp * rarityMultiplier);
  }

  static getLevelFromExperience(experience: number): number {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  static getExperienceForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100;
  }

  static getRarityMultiplier(rarity: string): number {
    switch (rarity) {
      case 'mythic': return 5;
      case 'legendary': return 3;
      case 'epic': return 2;
      case 'rare': return 1.5;
      case 'uncommon': return 1.2;
      default: return 1;
    }
  }

  static getDropChance(rarity: string): number {
    switch (rarity) {
      case 'mythic': return 0.01;
      case 'legendary': return 0.05;
      case 'epic': return 0.15;
      case 'rare': return 0.25;
      case 'uncommon': return 0.40;
      default: return 0.60;
    }
  }

  // Calculer le prix des graines selon la rareté
  static getSeedPriceRange(rarity: string): { min: number; max: number } {
    switch (rarity) {
      case 'mythic': return { min: 1000000, max: 10000000 };
      case 'legendary': return { min: 50000, max: 1000000 };
      case 'epic': return { min: 5000, max: 50000 };
      case 'rare': return { min: 500, max: 5000 };
      case 'uncommon': return { min: 100, max: 500 };
      default: return { min: 50, max: 100 };
    }
  }
}
