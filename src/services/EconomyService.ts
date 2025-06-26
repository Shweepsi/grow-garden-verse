
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

  // Nouveaux prix d'améliorations basés sur l'économie des plantes
  static getUpgradeCosts() {
    return {
      // Améliorations de base - accessibles tôt
      basic: {
        coins: 1000,   // ~6-7 récoltes de plantes niveau 1
        gems: 0
      },
      
      // Améliorations intermédiaires 
      intermediate: {
        coins: 5000,   // ~15-20 récoltes de plantes niveau 2-3
        gems: 10
      },
      
      // Améliorations avancées
      advanced: {
        coins: 25000,  // ~30-40 récoltes de plantes niveau 4-5
        gems: 50
      },
      
      // Améliorations premium
      premium: {
        coins: 100000, // ~60-80 récoltes de plantes niveau 6+
        gems: 200
      },
      
      // Améliorations légendaires
      legendary: {
        coins: 500000, // ~100+ récoltes de plantes haut niveau
        gems: 1000
      }
    };
  }

  // Calculer le coût d'une amélioration selon son type et niveau requis
  static getUpgradeCostByLevel(levelRequired: number, effectType: string): { coins: number; gems: number } {
    const costs = this.getUpgradeCosts();
    
    // Améliorations de récolte (plus chères car plus profitables)
    if (effectType.includes('harvest')) {
      if (levelRequired <= 3) return { coins: costs.basic.coins * 1.5, gems: costs.basic.gems };
      if (levelRequired <= 8) return { coins: costs.intermediate.coins * 1.5, gems: costs.intermediate.gems };
      if (levelRequired <= 15) return { coins: costs.advanced.coins * 1.5, gems: costs.advanced.gems };
      if (levelRequired <= 25) return { coins: costs.premium.coins * 1.5, gems: costs.premium.gems };
      return { coins: costs.legendary.coins * 1.5, gems: costs.legendary.gems };
    }
    
    // Améliorations de vitesse de croissance
    if (effectType.includes('growth')) {
      if (levelRequired <= 5) return costs.basic;
      if (levelRequired <= 12) return costs.intermediate;
      if (levelRequired <= 20) return costs.advanced;
      if (levelRequired <= 30) return costs.premium;
      return costs.legendary;
    }
    
    // Améliorations spéciales (déblocages, auto, etc.)
    if (effectType.includes('unlock') || effectType.includes('auto') || effectType.includes('prestige')) {
      if (levelRequired <= 10) return { coins: costs.advanced.coins, gems: costs.advanced.gems * 2 };
      if (levelRequired <= 20) return { coins: costs.premium.coins, gems: costs.premium.gems * 2 };
      return { coins: costs.legendary.coins, gems: costs.legendary.gems * 2 };
    }
    
    // Par défaut
    return costs.basic;
  }
}
