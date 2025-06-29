
export class GameBalanceService {
  // Coûts de déblocage des parcelles avec limite de 100 pièces
  static getUnlockCost(plotNumber: number): number {
    const costs = [
      0,     // Parcelle 1 - gratuite
      30,    // Parcelle 2 - réduit de 300 à 30
      50,    // Parcelle 3 - réduit de 800 à 50  
      70,    // Parcelle 4 - réduit de 2200 à 70
      90,    // Parcelle 5 - réduit de 6000 à 90
      100,   // Parcelle 6 - plafonné à 100
      100,   // Parcelle 7 - plafonné à 100
      100,   // Parcelle 8 - plafonné à 100
      100    // Parcelle 9 - plafonné à 100
    ];
    
    return costs[plotNumber - 1] || 100;
  }

  // Coûts des améliorations avec limite de 100 pièces
  static getUpgradeCost(level: number): number {
    const baseCost = Math.pow(level, 1.5) * 10;
    return Math.min(Math.ceil(baseCost), 100);
  }

  // Multiplicateur d'expérience par niveau
  static getXpMultiplier(level: number): number {
    return 1 + (level - 1) * 0.1;
  }

  // Bonus de récolte par niveau  
  static getHarvestBonus(level: number): number {
    return Math.floor(level / 5) * 5;
  }
}
