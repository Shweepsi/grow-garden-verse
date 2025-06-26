
import { LevelUpgrade, PlayerUpgrade } from '@/types/upgrades';

export class EconomyService {
  // Calculer le prix d'une plante selon sa rareté et niveau requis
  static getPlantDirectCost(rarity: string, levelRequired: number): number {
    const baseMultiplier = Math.pow(1.5, levelRequired - 1);
    
    switch (rarity) {
      case 'common': return Math.floor(50 * baseMultiplier);
      case 'uncommon': return Math.floor(150 * baseMultiplier);
      case 'rare': return Math.floor(500 * baseMultiplier);
      case 'epic': return Math.floor(2000 * baseMultiplier);
      case 'legendary': return Math.floor(8000 * baseMultiplier);
      case 'mythic': return Math.floor(30000 * baseMultiplier);
      default: return Math.floor(50 * baseMultiplier);
    }
  }

  // Calculer les récompenses de récolte avec multiplicateurs
  static getHarvestReward(
    plantRarity: string, 
    plantLevel: number, 
    growthTime: number,
    playerLevel: number = 1,
    harvestMultiplier: number = 1
  ): number {
    const baseCost = this.getPlantDirectCost(plantRarity, plantLevel);
    const timeBonus = Math.max(1, Math.floor(growthTime / 30)); // Bonus pour temps long
    const levelBonus = 1 + (playerLevel * 0.05); // 5% par niveau
    
    const baseReward = baseCost * 1.5 * timeBonus * levelBonus;
    return Math.floor(baseReward * harvestMultiplier);
  }

  // Calculer l'expérience gagnée
  static getExperienceReward(plantRarity: string, plantLevel: number): number {
    const baseExp = 10;
    const rarityMultiplier = this.getRarityMultiplier(plantRarity);
    const levelMultiplier = Math.pow(1.2, plantLevel - 1);
    
    return Math.floor(baseExp * rarityMultiplier * levelMultiplier);
  }

  // Multiplicateur selon la rareté
  private static getRarityMultiplier(rarity: string): number {
    switch (rarity) {
      case 'common': return 1;
      case 'uncommon': return 1.5;
      case 'rare': return 2.5;
      case 'epic': return 4;
      case 'legendary': return 7;
      case 'mythic': return 12;
      default: return 1;
    }
  }

  // Calculer le temps de croissance ajusté selon les multiplicateurs
  static getAdjustedGrowthTime(
    baseGrowthMinutes: number,
    growthMultiplier: number = 1
  ): number {
    return Math.max(0.5, baseGrowthMinutes / growthMultiplier);
  }

  // Vérifier si le joueur peut accéder à une rareté
  static canAccessRarity(
    rarity: string, 
    playerLevel: number, 
    playerUpgrades: PlayerUpgrade[]
  ): boolean {
    const hasRareUnlock = playerUpgrades.some(u => 
      u.level_upgrades?.name === 'rare_unlock'
    );
    const hasEpicUnlock = playerUpgrades.some(u => 
      u.level_upgrades?.name === 'epic_unlock'
    );
    const hasLegendaryUnlock = playerUpgrades.some(u => 
      u.level_upgrades?.name === 'legendary_unlock'
    );
    const hasMythicUnlock = playerUpgrades.some(u => 
      u.level_upgrades?.name === 'mythic_unlock'
    );

    switch (rarity) {
      case 'common':
      case 'uncommon':
        return true;
      case 'rare':
        return hasRareUnlock;
      case 'epic':
        return hasEpicUnlock;
      case 'legendary':
        return hasLegendaryUnlock;
      case 'mythic':
        return hasMythicUnlock;
      default:
        return true;
    }
  }
}
